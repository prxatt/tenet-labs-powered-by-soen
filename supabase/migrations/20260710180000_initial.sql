-- Tenet Labs · SOEN — canonical schema (versioned migrations)
-- Run via Supabase CLI or SQL Editor in order.

-- plan_state: schedule, check-offs, recipes (one row per user)
create table if not exists public.plan_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.plan_state enable row level security;
drop policy if exists "plan_state owner select" on public.plan_state;
create policy "plan_state owner select" on public.plan_state for select using (auth.uid() = user_id);
drop policy if exists "plan_state owner insert" on public.plan_state;
create policy "plan_state owner insert" on public.plan_state for insert with check (auth.uid() = user_id);
drop policy if exists "plan_state owner update" on public.plan_state;
create policy "plan_state owner update" on public.plan_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_secrets: API keys (write-only from app; server reads via service role)
create table if not exists public.user_secrets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  oura_token text,
  oura_refresh_token text,
  oura_token_expires_at timestamptz,
  gemini_key text,
  groq_key text,
  github_token text,
  updated_at timestamptz not null default now()
);
alter table public.user_secrets enable row level security;
drop policy if exists "secrets owner insert" on public.user_secrets;
create policy "secrets owner insert" on public.user_secrets for insert with check (auth.uid() = user_id);
drop policy if exists "secrets owner update" on public.user_secrets;
create policy "secrets owner update" on public.user_secrets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- behavior_insights: learned habits (aggregates only)
create table if not exists public.behavior_insights (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.behavior_insights enable row level security;
drop policy if exists "behavior owner select" on public.behavior_insights;
create policy "behavior owner select" on public.behavior_insights for select using (auth.uid() = user_id);
drop policy if exists "behavior owner insert" on public.behavior_insights;
create policy "behavior owner insert" on public.behavior_insights for insert with check (auth.uid() = user_id);
drop policy if exists "behavior owner update" on public.behavior_insights;
create policy "behavior owner update" on public.behavior_insights for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- which keys exist (names only — never returns actual keys)
create or replace function public.secrets_status()
returns json language sql security definer set search_path = public as $$
  select coalesce(
    (select json_build_object(
      'oura',   (s.oura_token  is not null and s.oura_token  <> ''),
      'gemini', (s.gemini_key  is not null and s.gemini_key  <> ''),
      'groq',   (s.groq_key    is not null and s.groq_key    <> ''),
      'github', (s.github_token is not null and s.github_token <> ''))
     from public.user_secrets s where s.user_id = auth.uid()),
    json_build_object('oura', false, 'gemini', false, 'groq', false, 'github', false));
$$;
grant execute on function public.secrets_status() to authenticated;
