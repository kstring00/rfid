-- Run once in Supabase: SQL Editor > New query > paste > Run
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  tag_place text,
  age_range text,
  created_at timestamptz not null default now()
);
-- Only the server (service role) can read or write. No public access.
alter table public.waitlist enable row level security;
