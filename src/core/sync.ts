/**
 * Supabase auth + cross-device plan sync.
 * Gracefully degrades to local-only mode when env vars are absent.
 */
import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';
import type { PlanState } from './types';
import { store } from './store';

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

/** Session with refresh fallback — mobile magic links can lag behind UI state. */
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
  const { error } = await supa().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  return { error: error?.message ?? null };
}

export async function signOut() { if (hasSupabase()) await supa().auth.signOut(); }

/* ---------------- plan state sync (last-write-wins) ---------------- */

let pushTimer: ReturnType<typeof setTimeout> | null = null;

export async function pullPlan(): Promise<void> {
  const s = await ensureSession();
  if (!s) { store.setSync('local', null); return; }
  store.setSync('syncing', s.user.email ?? null);
  const { data, error } = await supa()
    .from('plan_state').select('data, updated_at').eq('user_id', s.user.id).maybeSingle();
  if (error) { store.setSync('err'); return; }
  if (data?.data) {
    const remote = data.data as PlanState;
    const remoteAt = remote.updatedAt || new Date(data.updated_at).getTime();
    if (remoteAt > (store.get().plan.updatedAt || 0)) {
      store.replacePlan({ ...remote, updatedAt: remoteAt });
    } else if ((store.get().plan.updatedAt || 0) > remoteAt) {
      await pushNow(store.get().plan);
    }
  } else {
    // first device — seed the cloud with local state
    await pushNow(store.get().plan);
  }
  store.setSync('ok');
}

async function pushNow(plan: PlanState): Promise<void> {
  const s = await ensureSession();
  if (!s) return;
  store.setSync('syncing');
  const { error } = await supa().from('plan_state').upsert(
    { user_id: s.user.id, data: plan, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
  store.setSync(error ? 'err' : 'ok');
}

export function schedulePush(plan: PlanState) {
  if (!hasSupabase()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { void pushNow(plan); }, 1500);
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

/** Which secrets exist server-side (names only, never values). */
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

/** Wire the store's change hook to the debounced cloud push. */
export function initSync() {
  store.onPlanChange = schedulePush;
  if (!hasSupabase()) { store.setSync('local'); return; }
  supa().auth.onAuthStateChange((_e, session) => {
    if (session) { void pullPlan(); }
    else store.setSync('local', null);
  });
  void (async () => {
    const s = await ensureSession();
    if (s) {
      store.setSync('syncing', s.user.email ?? null);
      await pullPlan();
    } else {
      store.setSync('local', null);
    }
  })();
  window.addEventListener('focus', () => { void pullPlan(); });
}
