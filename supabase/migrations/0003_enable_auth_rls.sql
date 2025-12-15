-- Migration to enable authentication and ensure profiles are auto-created
-- This migration ensures that when a user signs up, a profile is automatically created

-- Function to handle new user signup and create profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

-- Trigger to automatically create profile when user signs up
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Ensure RLS is enabled on profiles table
alter table public.profiles enable row level security;

-- Policy to allow users to read their own profile
drop policy if exists profiles_select_policy on public.profiles;
create policy profiles_select_policy on public.profiles
  for select using (auth.uid() = id);

-- Policy to allow users to update their own profile
drop policy if exists profiles_update_policy on public.profiles;
create policy profiles_update_policy on public.profiles
  for update using (auth.uid() = id);

-- Note: The existing RLS policies on bowel_entries, food_entries, and symptom_entries
-- already check auth.uid(), so they will work correctly once authentication is enabled.
-- The dev fallback policies in 0001_create_tables.sql can be removed in production
-- but are kept for local development convenience.
