-- Tenet Labs · powered by SOEN — Supabase schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).

-- ============ plan_state: one row per user, whole plan as jsonb ============
create table if not exists public.plan_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.plan_state enable row level security;

drop policy if exists "plan_state owner select" on public.plan_state;
create policy "plan_state owner select" on public.plan_state
  for select using (auth.uid() = user_id);

drop policy if exists "plan_state owner insert" on public.plan_state;
create policy "plan_state owner insert" on public.plan_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "plan_state owner update" on public.plan_state;
create policy "plan_state owner update" on public.plan_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ user_secrets: API keys, WRITE-ONLY from the client ============
-- The client may insert/update its own row but can NEVER select it back.
-- Only the serverless function (service-role key) reads these.
create table if not exists public.user_secrets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  oura_token text,
  gemini_key text,
  groq_key text,
  updated_at timestamptz not null default now()
);

alter table public.user_secrets enable row level security;

drop policy if exists "secrets owner insert" on public.user_secrets;
create policy "secrets owner insert" on public.user_secrets
  for insert with check (auth.uid() = user_id);

drop policy if exists "secrets owner update" on public.user_secrets;
create policy "secrets owner update" on public.user_secrets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No select policy on purpose: keys are write-only from the browser.

-- ============ secrets_status(): which keys exist (names only) ============
create or replace function public.secrets_status()
returns json
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select json_build_object(
      'oura',   (s.oura_token  is not null and s.oura_token  <> ''),
      'gemini', (s.gemini_key  is not null and s.gemini_key  <> ''),
      'groq',   (s.groq_key    is not null and s.groq_key    <> ''))
     from public.user_secrets s where s.user_id = auth.uid()),
    json_build_object('oura', false, 'gemini', false, 'groq', false));
$$;

grant execute on function public.secrets_status() to authenticated;
