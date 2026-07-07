/** Oura OAuth2 (PATs deprecated Dec 2025). Tokens stored locally on device. */

const LS = 'tl7_oura_oauth';
const SCOPES = 'daily personal heartrate stress';
const PENDING = 'oura_oauth_pending';

export interface OuraTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export function getOuraOAuth(): OuraTokens | null {
  try {
    const t = JSON.parse(localStorage.getItem(LS) || 'null');
    if (t?.access_token && t?.refresh_token) return t;
  } catch { /* ignore */ }
  return null;
}

export function setOuraOAuth(t: OuraTokens) {
  localStorage.setItem(LS, JSON.stringify(t));
}

export function clearOuraOAuth() {
  localStorage.removeItem(LS);
}

export function ouraRedirectUri(): string {
  return window.location.origin + '/oauth/oura';
}

export function startOuraConnect(): void {
  const clientId = import.meta.env.VITE_OURA_CLIENT_ID as string;
  if (!clientId) {
    throw new Error('Oura app not configured — add OURA_CLIENT_ID in Vercel');
  }
  const state = crypto.randomUUID();
  sessionStorage.setItem(PENDING, state);
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: ouraRedirectUri(),
    scope: SCOPES,
    state,
  });
  window.location.href = 'https://cloud.ouraring.com/oauth/authorize?' + q.toString();
}

export function isOuraCallback(): boolean {
  return window.location.pathname === '/oauth/oura' || window.location.pathname.endsWith('/oauth/oura');
}

export function parseOuraCallback(): { code: string; state: string } | null {
  if (!isOuraCallback()) return null;
  const p = new URLSearchParams(window.location.search);
  const code = p.get('code');
  const state = p.get('state');
  const err = p.get('error');
  if (err) throw new Error(p.get('error_description') || err);
  if (!code || !state || state !== sessionStorage.getItem(PENDING)) return null;
  sessionStorage.removeItem(PENDING);
  return { code, state };
}

export function clearOuraCallbackUrl() {
  window.history.replaceState({}, document.title, '/');
}
