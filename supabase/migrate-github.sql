-- Run once if you already applied schema.sql before github_token was added.
alter table public.user_secrets add column if not exists github_token text;

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
      'groq',   (s.groq_key    is not null and s.groq_key    <> ''),
      'github', (s.github_token is not null and s.github_token <> ''))
     from public.user_secrets s where s.user_id = auth.uid()),
    json_build_object('oura', false, 'gemini', false, 'groq', false, 'github', false));
$$;
