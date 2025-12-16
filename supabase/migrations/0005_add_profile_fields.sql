-- Add basic profile fields for storing user-facing data.
-- Safe to run multiple times using IF NOT EXISTS.

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists email text;


