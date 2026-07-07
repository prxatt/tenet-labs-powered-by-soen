/**
 * Supabase auth + cross-device plan sync.
 * Gracefully degrades to local-only mode when env vars are absent.
 */
import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';
import type { PlanState } from './types';
import { store } from './store';
import { pullBehavior } from './habits';
import { getLocalKeys } from './api';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

export function hasSupabase(): boolean { return !!(URL && ANON); }

export function supa(): SupabaseClient {
  if (!client) client = createClient(URL!, ANON!, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
  });
  return client;
}

export async function getSession(): Promise<Session | null> {
  if (!hasSupabase()) return null;
  const { data } = await supa().auth.getSession();
  return data.session;
}

export async function ensureSession(): Promise<Session | null> {
  const s = await getSession();
  if (s) return s;
  if (!hasSupabase()) return null;
  try {
    const { data: { session } } = await supa().auth.refreshSession();
    return session;
  } catch {
    return null;
  }
}

export async function signInMagic(email: string): Promise<{ error: string | null }> {
  const redirect = window.location.origin + window.location.pathname;
  const { error } = await supa().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirect },
  });
  return { error: error?.message ?? null };
}

export async function signOut() { if (hasSupabase()) await supa().auth.signOut(); }

/* ---------------- plan merge (done keys union across devices) ---------------- */

function mergePlans(local: PlanState, remote: PlanState, remoteAt: number): PlanState {
  const localAt = local.updatedAt || 0;
  const done = { ...remote.done, ...local.done };
  if (remoteAt > localAt) {
    return {
      ...remote,
      done,
      todos: { ...local.todos, ...remote.todos },
      ouraData: remote.ouraData || local.ouraData,
      updatedAt: remoteAt,
    };
  }
  return {
    ...local,
    done,
    todos: { ...remote.todos, ...local.todos },
    ouraData: local.ouraData || remote.ouraData,
    updatedAt: Math.max(localAt, remoteAt),
  };
}

/* ---------------- plan state sync ---------------- */

let pushTimer: ReturnType<typeof setTimeout> | null = null;

function planForCloud(plan: PlanState): PlanState {
  return { ...plan, ouraData: store.get().oura };
}

export async function pullPlan(): Promise<void> {
  const s = await ensureSession();
  if (!s) { store.setSync('local', null); return; }
  store.setSync('syncing', s.user.email ?? null);
  const { data, error } = await supa()
    .from('plan_state').select('data, updated_at').eq('user_id', s.user.id).maybeSingle();
  if (error) { store.setSync('err'); return; }
  const local = store.get().plan;
  if (data?.data) {
    const remote = data.data as PlanState;
    const remoteAt = remote.updatedAt || new Date(data.updated_at).getTime();
    const merged = mergePlans(local, remote, remoteAt);
    store.replacePlan(merged);
    if (merged.ouraData && Object.keys(merged.ouraData).length) {
      store.setOura(merged.ouraData, false);
    }
    if ((local.updatedAt || 0) > remoteAt) {
      await pushNow(merged);
    }
  } else {
    await pushNow(local);
  }
  await pullBehavior();
  store.setSync('ok');
}

async function pushNow(plan: PlanState): Promise<void> {
  const s = await ensureSession();
  if (!s) return;
  store.setSync('syncing');
  const payload = planForCloud(plan);
  const { error } = await supa().from('plan_state').upsert(
    { user_id: s.user.id, data: payload, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
  store.setSync(error ? 'err' : 'ok', s.user.email ?? null);
}

export function schedulePush(plan: PlanState) {
  if (!hasSupabase()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { void pushNow(plan); }, 800);
}

/** Immediate push — used after check-offs so other devices see it fast. */
export function flushPush() {
  if (pushTimer) clearTimeout(pushTimer);
  const plan = store.get().plan;
  void pushNow(plan);
}

/* ---------------- API keys (write-only via RLS) ---------------- */

export async function saveSecrets(secrets: { oura?: string; gemini?: string; groq?: string; github?: string }): Promise<{ error: string | null }> {
  const s = await ensureSession();
  if (!s) return { error: 'Not signed in — open your magic link on this device, then try again' };
  const patch: Record<string, string> = {};
  if (secrets.oura) patch.oura_token = secrets.oura;
  if (secrets.gemini) patch.gemini_key = secrets.gemini;
  if (secrets.groq) patch.groq_key = secrets.groq;
  if (secrets.github) patch.github_token = secrets.github;
  if (!Object.keys(patch).length) return { error: null };
  const { error } = await supa().from('user_secrets').upsert(
    { user_id: s.user.id, ...patch, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
  return { error: error?.message ?? null };
}

export async function migrateLocalSecrets(): Promise<void> {
  const s = await ensureSession();
  if (!s) return;
  const lk = getLocalKeys();
  if (!lk.oura && !lk.gemini && !lk.groq && !lk.github) return;
  await saveSecrets({
    ...(lk.oura && { oura: lk.oura }),
    ...(lk.gemini && { gemini: lk.gemini }),
    ...(lk.groq && { groq: lk.groq }),
    ...(lk.github && { github: lk.github }),
  });
}

export async function secretsStatus(): Promise<{ oura: boolean; gemini: boolean; groq: boolean; github: boolean }> {
  const none = { oura: false, gemini: false, groq: false, github: false };
  const s = await ensureSession();
  if (!s) return none;
  try {
    const { data } = await supa().rpc('secrets_status');
    if (data) return { oura: !!data.oura, gemini: !!data.gemini, groq: !!data.groq, github: !!data.github };
  } catch { /* rpc missing */ }
  return none;
}

export function initSync() {
  store.onPlanChange = schedulePush;
  if (!hasSupabase()) { store.setSync('local'); return; }
  supa().auth.onAuthStateChange((_e, session) => {
    if (session) {
      void (async () => {
        await migrateLocalSecrets();
        await pullPlan();
      })();
    } else store.setSync('local', null);
  });
  void (async () => {
    const s = await ensureSession();
    if (s) {
      store.setSync('syncing', s.user.email ?? null);
      await migrateLocalSecrets();
      await pullPlan();
    } else {
      store.setSync('local', null);
    }
  })();
  window.addEventListener('focus', () => { void pullPlan(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void pullPlan();
  });
}
