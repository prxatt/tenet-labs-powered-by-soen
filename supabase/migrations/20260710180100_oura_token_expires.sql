-- Add Oura token expiry for server-side refresh lifecycle
alter table public.user_secrets add column if not exists oura_token_expires_at timestamptz;
