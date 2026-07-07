-- Run once if you already ran setup-all.sql before OAuth support
alter table public.user_secrets add column if not exists oura_refresh_token text;
