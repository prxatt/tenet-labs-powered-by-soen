/**
 * Outbound API calls: AI (Ollama → serverless Groq/Gemini → local-key fallback)
 * and Oura sync (serverless proxy → local-key fallback).
 */
import type { OuraDay, Recipe } from './types';
import { key, addD } from './dates';
import { store } from './store';
import { ensureSession, hasSupabase } from './sync';
import { parseRecipe, recipeImportPrompt } from './ai';

/* ---- local fallback keys (used only when not signed into the backend) ---- */
const LS_KEYS = 'tl7_keys';
export interface LocalKeys { oura?: string; gemini?: string; groq?: string; github?: string; }
export function getLocalKeys(): LocalKeys {
  try { return JSON.parse(localStorage.getItem(LS_KEYS) || '{}'); } catch { return {}; }
}
export function setLocalKeys(k: LocalKeys) {
  localStorage.setItem(LS_KEYS, JSON.stringify({ ...getLocalKeys(), ...k }));
}

export interface ServerResult {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: string;
  status?: number;
}

async function serverCall(body: Record<string, unknown>): Promise<ServerResult> {
  if (!hasSupabase()) return { ok: false, error: 'no_backend' };
  const s = await ensureSession();
  if (!s) return { ok: false, error: 'no_auth' };
  try {
    const r = await fetch('/api/soen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.access_token },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: String(data.error || 'http_' + r.status), status: r.status, data };
    if (data.error) return { ok: false, error: String(data.error), data };
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'network' };
  }
}

/* ---------------- AI ---------------- */

export const OLLAMA_MODELS = [
  { id: 'hermes-agent', label: 'Hermes Agent' },
  { id: 'qwen3', label: 'Qwen 3' },
  { id: 'qwen2.5-coder', label: 'Qwen 2.5 Coder' },
  { id: 'north-minicode-1', label: 'North Mini Code 1' },
  { id: 'minicpm-v', label: 'MiniCPM (Vision)' },
] as const;

export const DEFAULT_OLLAMA_MODEL = 'hermes-agent';

export async function aiCall(prompt: string): Promise<string | null> {
  const prefs = store.get().plan.prefs;
  if (prefs.ollama) {
    try {
      const r = await fetch('http://localhost:11434/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: prefs.ollamaModel || DEFAULT_OLLAMA_MODEL,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        }),
      });
      if (r.ok) return (await r.json()).message.content;
    } catch { /* offline */ }
  }
  const srv = await serverCall({ service: 'ai', prompt });
  if (srv.ok && srv.data?.text) return String(srv.data.text);
  const k = getLocalKeys();
  if (k.groq) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + k.groq },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }] }),
      });
      if (r.ok) return (await r.json()).choices[0].message.content;
    } catch { /* next */ }
  }
  if (k.gemini) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${k.gemini}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      if (r.ok) return (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text || 'No answer.';
    } catch { /* fall through */ }
  }
  return null;
}

/* ---------------- Recipe import ---------------- */

export async function importRecipe(opts: { url?: string; imageBase64?: string; hint?: string }): Promise<Recipe | null> {
  const srv = await serverCall({ service: 'recipe_import', ...opts });
  if (srv.ok && srv.data?.recipe) {
    try { return parseRecipe(JSON.stringify(srv.data.recipe)); } catch { /* fall through */ }
  }
  const prompt = recipeImportPrompt(opts);
  const a = await aiCall(prompt);
  if (!a) return null;
  try { return parseRecipe(a); } catch { return null; }
}

/* ---------------- Oura ---------------- */

function mergeOura(target: Record<string, OuraDay>, payload: any): Record<string, OuraDay> {
  const out = { ...target };
  const day = (d: string): OuraDay => (out[d] = { ...(out[d] || {}) });
  (payload.readiness?.data || []).forEach((x: any) => { day(x.day).r = x.score; });
  (payload.dailySleep?.data || []).forEach((x: any) => { day(x.day).s = x.score; });
  (payload.sleep?.data || []).forEach((x: any) => {
    const o = day(x.day);
    if (x.average_hrv) o.hrv = Math.round(x.average_hrv);
    if (x.lowest_heart_rate) o.rhr = x.lowest_heart_rate;
    if (x.average_breath) o.br = Math.round(x.average_breath * 10) / 10;
  });
  (payload.activity?.data || []).forEach((x: any) => {
    const o = day(x.day); o.act = x.score; o.steps = x.steps; o.cal = x.total_calories;
  });
  (payload.stress?.data || []).forEach((x: any) => {
    day(x.day).st = x.day_summary === 'stressful' ? 2 : x.day_summary === 'normal' ? 1 : 0;
  });
  return out;
}

export type OuraSyncResult = 'ok' | 'nokey' | 'no_auth' | 'oura_api_error' | 'network' | 'err';

let lastOuraError: string | null = null;
let lastOuraErrorAt = 0;

export function getOuraError(): string | null {
  if (lastOuraError && Date.now() - lastOuraErrorAt < 300000) return lastOuraError;
  return null;
}

export async function syncOura(): Promise<OuraSyncResult> {
  const end = key(addD(new Date(), 1)), start = key(addD(new Date(), -13));
  const localTok = getLocalKeys().oura;

  const fetchOura = async (tok: string): Promise<'ok'> => {
    const H = { headers: { Authorization: 'Bearer ' + tok } };
    const q = (p: string) =>
      fetch(`https://api.ouraring.com/v2/usercollection/${p}?start_date=${start}&end_date=${end}`, H)
        .then(r => (r.ok ? r.json() : Promise.reject(new Error('oura_' + r.status))));
    const [readiness, dailySleep, sleep, activity, stress] = await Promise.all([
      q('daily_readiness'), q('daily_sleep'), q('sleep'), q('daily_activity'), q('daily_stress'),
    ]);
    store.setOura(mergeOura(store.get().oura, { readiness, dailySleep, sleep, activity, stress }));
    lastOuraError = null;
    return 'ok';
  };

  const s = await ensureSession();
  let srv: ServerResult = { ok: false };
  if (s) {
    srv = await serverCall({ service: 'oura', start, end });
    if (srv.ok && srv.data?.readiness) {
      store.setOura(mergeOura(store.get().oura, srv.data));
      lastOuraError = null;
      return 'ok';
    }
  }

  if (localTok) {
    try { return await fetchOura(localTok); }
    catch {
      lastOuraError = 'Oura API error — regenerate token at cloud.ouraring.com';
      lastOuraErrorAt = Date.now();
      return 'oura_api_error';
    }
  }

  if (srv.error === 'no_auth') { lastOuraError = 'Sign in + add Oura token in Settings'; lastOuraErrorAt = Date.now(); return 'no_auth'; }
  if (srv.error === 'no_token') { lastOuraError = 'Add Oura token in Settings'; lastOuraErrorAt = Date.now(); return 'nokey'; }
  if (srv.error === 'network') { lastOuraError = 'Network error'; lastOuraErrorAt = Date.now(); return 'network'; }
  lastOuraError = 'No Oura token';
  lastOuraErrorAt = Date.now();
  return 'nokey';
}

/* ---------------- GitHub build tracker ---------------- */

export interface RepoStatus { name: string; days: number; msg: string; ok: boolean; }
let ghCache: RepoStatus[] | null = null; let ghAt = 0;

export async function ghStatus(): Promise<RepoStatus[]> {
  const { repoA, repoB } = store.get().plan.prefs;
  const repos: [string, string][] = ([['TENET Boxing', repoA], ['SOEN / Labs', repoB]] as [string, string | undefined][])
    .filter((r): r is [string, string] => !!r[1]);
  if (!repos.length) return [];
  if (ghCache && Date.now() - ghAt < 600000) return ghCache;
  const out: RepoStatus[] = [];
  for (const [name, slug] of repos) {
    try {
      const srv = await serverCall({ service: 'github', repo: slug });
      if (srv.ok && srv.data?.msg) {
        out.push({ name, days: Number(srv.data.days), msg: String(srv.data.msg), ok: true });
        continue;
      }
      const r = await fetch('https://api.github.com/repos/' + slug + '/commits?per_page=1');
      if (!r.ok) throw new Error();
      const j = await r.json();
      const dt = new Date(j[0].commit.author.date);
      const days = Math.floor((Date.now() - dt.getTime()) / 864e5);
      out.push({ name, days, msg: j[0].commit.message.split('\n')[0].slice(0, 48), ok: true });
    } catch {
      out.push({ name, days: -1, msg: 'unreachable — add a GitHub PAT in Settings for private repos', ok: false });
    }
  }
  ghCache = out; ghAt = Date.now();
  return out;
}
