-- Behavior insights — aggregated habits only (no raw coordinates).
create table if not exists public.behavior_insights (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.behavior_insights enable row level security;

drop policy if exists "behavior owner select" on public.behavior_insights;
create policy "behavior owner select" on public.behavior_insights
  for select using (auth.uid() = user_id);

drop policy if exists "behavior owner insert" on public.behavior_insights;
create policy "behavior owner insert" on public.behavior_insights
  for insert with check (auth.uid() = user_id);

drop policy if exists "behavior owner update" on public.behavior_insights;
create policy "behavior owner update" on public.behavior_insights
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
