/**
 * Single Vercel serverless function — all outbound API calls require Supabase auth.
 * Oura tokens are stored server-side and refreshed automatically.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { log, reqId } from './lib/log';
import { isSafeFetchUrl } from './lib/ssrf';
import {
  ensureOuraToken, exchangeOuraCode, pullOura, persistOuraTokens,
} from './lib/oura-server';

export const config = { runtime: 'nodejs' };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const OURA_CLIENT_ID = process.env.OURA_CLIENT_ID || process.env.VITE_OURA_CLIENT_ID || '';
const OURA_CLIENT_SECRET = process.env.OURA_CLIENT_SECRET || '';

async function authenticate(req: { headers: { authorization?: string } }, res: { status: (n: number) => { json: (b: unknown) => void } }, admin: SupabaseClient) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) { res.status(401).json({ error: 'no_auth' }); return null; }
  const { data: userData, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !userData?.user) { res.status(401).json({ error: 'bad_auth' }); return null; }
  return userData.user.id;
}

export default async function handler(req: { method?: string; body?: Record<string, unknown>; headers: { authorization?: string } }, res: { status: (n: number) => { json: (b: unknown) => void } }) {
  const rid = reqId();
  if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }
  if (!SUPABASE_URL || !SERVICE_KEY) { res.status(500).json({ error: 'backend_not_configured' }); return; }

  const body = req.body || {};
  const service = String(body.service || '');
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const uid = await authenticate(req, res, admin);
  if (!uid) return;

  log('soen.request', { rid, service, uid });

  const { data: secrets } = await admin
    .from('user_secrets')
    .select('oura_token, oura_refresh_token, oura_token_expires_at, gemini_key, groq_key, github_token')
    .eq('user_id', uid)
    .maybeSingle();

  try {
    if (service === 'oura_oauth_exchange') {
      const code = String(body.code || '').trim();
      const redirect_uri = String(body.redirect_uri || '').trim();
      if (!OURA_CLIENT_ID || !OURA_CLIENT_SECRET) {
        res.status(200).json({ error: 'oura_not_configured' }); return;
      }
      if (!code || !redirect_uri) { res.status(400).json({ error: 'bad_request' }); return; }
      try {
        const data = await exchangeOuraCode(code, redirect_uri, OURA_CLIENT_ID, OURA_CLIENT_SECRET);
        await persistOuraTokens(admin, uid, data.access_token, data.refresh_token || null, Number(data.expires_in) || 86400);
        log('oura.oauth_exchange', { rid, uid });
        res.status(200).json({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
        });
      } catch (e: unknown) {
        const st = (e as { status?: number })?.status || 0;
        log('oura.oauth_failed', { rid, uid, status: st });
        res.status(200).json({ error: 'oura_oauth_failed', status: st });
      }
      return;
    }

    if (service === 'oura') {
      const tok = await ensureOuraToken(admin, uid, secrets ?? {
        oura_token: null, oura_refresh_token: null, oura_token_expires_at: null,
      }, OURA_CLIENT_ID, OURA_CLIENT_SECRET);
      if (!tok) { res.status(200).json({ error: 'no_token' }); return; }
      const start = String(body.start || ''), end = String(body.end || '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
        res.status(400).json({ error: 'bad_dates' }); return;
      }
      try {
        res.status(200).json(await pullOura(tok, start, end));
      } catch (e: unknown) {
        const st = (e as { status?: number })?.status || 0;
        if (st === 401) res.status(200).json({ error: 'oura_rejected' });
        else if (st === 0) res.status(200).json({ error: 'oura_empty' });
        else res.status(200).json({ error: 'oura_failed', status: st });
      }
      return;
    }

    if (service === 'ai') {
      const prompt = String(body.prompt || '').slice(0, 24000);
      if (!prompt) { res.status(400).json({ error: 'no_prompt' }); return; }
      if (secrets?.groq_key) {
        try {
          const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + secrets.groq_key },
            body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }] }),
          });
          if (r.ok) {
            const j = await r.json();
            res.status(200).json({ text: j.choices[0].message.content });
            return;
          }
        } catch { /* fall through */ }
      }
      if (secrets?.gemini_key) {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${secrets.gemini_key}`,
          {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          },
        );
        if (r.ok) {
          const j = await r.json();
          res.status(200).json({ text: j.candidates?.[0]?.content?.parts?.[0]?.text || 'No answer.' });
          return;
        }
        res.status(200).json({ error: 'ai_failed' });
        return;
      }
      res.status(200).json({ error: 'no_ai_key' });
      return;
    }

    if (service === 'github') {
      const slug = String(body.repo || '').trim();
      if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(slug)) {
        res.status(400).json({ error: 'bad_repo' }); return;
      }
      const tok = secrets?.github_token || process.env.GITHUB_TOKEN || '';
      if (!tok) { res.status(200).json({ error: 'no_github_token' }); return; }
      const r = await fetch(`https://api.github.com/repos/${slug}/commits?per_page=1`, {
        headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json' },
      });
      if (!r.ok) { res.status(200).json({ error: 'github_failed' }); return; }
      const j = await r.json();
      const dt = new Date(j[0].commit.author.date);
      const days = Math.floor((Date.now() - dt.getTime()) / 864e5);
      res.status(200).json({ days, msg: j[0].commit.message.split('\n')[0].slice(0, 48) });
      return;
    }

    if (service === 'recipe_import') {
      const url = String(body.url || '').trim();
      const imageBase64 = String(body.imageBase64 || '').slice(0, 8_000_000);
      const hint = String(body.hint || '');
      if (!url && !imageBase64) { res.status(400).json({ error: 'no_input' }); return; }
      if (!secrets?.gemini_key) { res.status(200).json({ error: 'no_ai_key' }); return; }

      let content = '';
      if (url) {
        if (!isSafeFetchUrl(url)) { res.status(400).json({ error: 'bad_url' }); return; }
        try {
          const fr = await fetch(url, { headers: { 'User-Agent': 'TenetLabs-SOEN/1.0' }, redirect: 'follow' });
          const html = await fr.text();
          content = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 24000);
        } catch {
          res.status(200).json({ error: 'fetch_failed' }); return;
        }
      }

      const prompt = url
        ? `Extract a complete recipe from this web page text. Return ONLY JSON: {"c":"Breakfast"|"Lunch"|"Dinner"|"Snacks & Dessert","n":"Name","tag":"Category · X min","mac":"~NNN kcal · NNg P","ing":["…"],"st":["…"]}. Text: ${content}`
        : `Extract recipe from image. Return ONLY JSON with keys c,n,tag,mac,ing,st. ${hint}`;

      const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [{ text: prompt }];
      if (imageBase64) parts.push({ inline_data: { mime_type: 'image/jpeg', data: imageBase64 } });

      const gr = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${secrets.gemini_key}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }] }) },
      );
      if (!gr.ok) { res.status(200).json({ error: 'ai_failed' }); return; }
      const gj = await gr.json();
      const text = gj.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) { res.status(200).json({ error: 'parse_failed' }); return; }
      try {
        res.status(200).json({ recipe: JSON.parse(m[0]) });
      } catch {
        res.status(200).json({ error: 'parse_failed' });
      }
      return;
    }

    res.status(400).json({ error: 'unknown_service' });
  } catch (e: unknown) {
    log('soen.error', { rid, service, detail: String((e as Error)?.message || e) });
    res.status(500).json({ error: 'server', detail: String((e as Error)?.message || e) });
  }
}
