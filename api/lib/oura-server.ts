import type { SupabaseClient } from '@supabase/supabase-js';

export interface OuraSecrets {
  oura_token: string | null;
  oura_refresh_token: string | null;
  oura_token_expires_at: string | null;
}

async function ouraTokenRequest(body: Record<string, string>) {
  const r = await fetch('https://api.ouraring.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err: Error & { status?: number; detail?: unknown } = new Error('oura_oauth_' + r.status);
    err.status = r.status;
    err.detail = data;
    throw err;
  }
  return data as { access_token: string; refresh_token?: string; expires_in?: number };
}

export async function exchangeOuraCode(
  code: string, redirectUri: string, clientId: string, clientSecret: string,
) {
  return ouraTokenRequest({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });
}

export async function refreshOuraToken(refreshToken: string, clientId: string, clientSecret: string) {
  return ouraTokenRequest({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
}

export async function persistOuraTokens(
  admin: SupabaseClient, uid: string,
  accessToken: string, refreshToken: string | null, expiresInSec: number,
) {
  const expiresAt = new Date(Date.now() + (expiresInSec || 86400) * 1000).toISOString();
  await admin.from('user_secrets').upsert({
    user_id: uid,
    oura_token: accessToken,
    ...(refreshToken && { oura_refresh_token: refreshToken }),
    oura_token_expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  return expiresAt;
}

/** Return a valid Oura access token, refreshing and persisting when needed. */
export async function ensureOuraToken(
  admin: SupabaseClient, uid: string, secrets: OuraSecrets,
  clientId: string, clientSecret: string,
): Promise<string | null> {
  const expiresMs = secrets.oura_token_expires_at
    ? new Date(secrets.oura_token_expires_at).getTime() : 0;
  if (secrets.oura_token && (!expiresMs || Date.now() < expiresMs - 120_000)) {
    return secrets.oura_token;
  }
  if (!secrets.oura_refresh_token) return secrets.oura_token;

  try {
    const data = await refreshOuraToken(secrets.oura_refresh_token, clientId, clientSecret);
    await persistOuraTokens(
      admin, uid, data.access_token,
      data.refresh_token || secrets.oura_refresh_token,
      Number(data.expires_in) || 86400,
    );
    return data.access_token;
  } catch {
    return null;
  }
}

export async function pullOura(tok: string, start: string, end: string) {
  const pairs: [string, string][] = [
    ['daily_readiness', 'readiness'],
    ['daily_sleep', 'dailySleep'],
    ['sleep', 'sleep'],
    ['daily_activity', 'activity'],
    ['daily_stress', 'stress'],
  ];
  const out: Record<string, { data: unknown[] }> = {};
  let authBad = false;

  for (const [path, key] of pairs) {
    const r = await fetch(
      `https://api.ouraring.com/v2/usercollection/${path}?start_date=${start}&end_date=${end}`,
      { headers: { Authorization: 'Bearer ' + tok } },
    );
    if (r.status === 401) { authBad = true; break; }
    if (r.ok) out[key] = await r.json();
    else out[key] = { data: [] };
  }

  if (authBad) {
    const err: Error & { status?: number } = new Error('oura_401');
    err.status = 401;
    throw err;
  }

  const hasData = Object.values(out).some(v => Array.isArray(v?.data) && v.data.length > 0);
  if (!hasData) {
    const err: Error & { status?: number } = new Error('oura_empty');
    err.status = 0;
    throw err;
  }
  return out;
}
