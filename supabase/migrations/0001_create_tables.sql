-- Base schema for bowel, food, and symptom tracking.
-- Safe to run multiple times; uses IF NOT EXISTS where possible.

-- Extensions
create extension if not exists "pgcrypto";

-- Profiles table for future auth linkage
create table if not exists public.profiles (
  id uuid primary key default auth.uid(),
  created_at timestamptz not null default timezone('utc', now())
);

-- Bowel entries
create table if not exists public.bowel_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  occurred_at timestamptz not null,
  urgency text not null check (urgency in ('Low', 'Medium', 'High')),
  consistency int not null check (consistency between 1 and 7),
  mucus_present boolean not null default false,
  blood_present boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

-- Food entries
create table if not exists public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  occurred_at timestamptz not null,
  name text not null,
  quantity text,
  meal_type text,
  notes text,
  tags text[],
  created_at timestamptz not null default timezone('utc', now())
);

-- Symptom entries
create table if not exists public.symptom_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  occurred_at timestamptz not null,
  symptom text not null,
  intensity text not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

-- Indexes for per-user access patterns
create index if not exists idx_bowel_entries_user_time on public.bowel_entries (user_id, occurred_at desc);
create index if not exists idx_food_entries_user_time on public.food_entries (user_id, occurred_at desc);
create index if not exists idx_symptom_entries_user_time on public.symptom_entries (user_id, occurred_at desc);

-- RLS: enable and restrict to owning user. Keep a dev user escape hatch until auth is wired.
alter table public.bowel_entries enable row level security;
alter table public.food_entries enable row level security;
alter table public.symptom_entries enable row level security;

drop policy if exists bowel_owner_policy on public.bowel_entries;
drop policy if exists food_owner_policy on public.food_entries;
drop policy if exists symptom_owner_policy on public.symptom_entries;

create policy bowel_owner_policy on public.bowel_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy food_owner_policy on public.food_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy symptom_owner_policy on public.symptom_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Dev fallback: allow anon access to a shared dev user id to unblock local testing until auth is ready.
-- Replace 00000000-0000-0000-0000-000000000000 with a per-developer UUID if desired.
drop policy if exists bowel_dev_policy on public.bowel_entries;
drop policy if exists food_dev_policy on public.food_entries;
drop policy if exists symptom_dev_policy on public.symptom_entries;

create policy bowel_dev_policy on public.bowel_entries
  for all using (user_id = '00000000-0000-0000-0000-000000000000')
  with check (user_id = '00000000-0000-0000-0000-000000000000');

create policy food_dev_policy on public.food_entries
  for all using (user_id = '00000000-0000-0000-0000-000000000000')
  with check (user_id = '00000000-0000-0000-0000-000000000000');

create policy symptom_dev_policy on public.symptom_entries
  for all using (user_id = '00000000-0000-0000-0000-000000000000')
  with check (user_id = '00000000-0000-0000-0000-000000000000');
