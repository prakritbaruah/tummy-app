-- Migration to add confirmed_by_user column to dish_events table
-- This column tracks whether a dish event has been confirmed by the user
-- Defaults to false for all existing and new dish events

-- Add confirmed_by_user column
alter table public.dish_events
  add column if not exists confirmed_by_user boolean not null default false;

-- Add index for efficient filtering by confirmation status
create index if not exists idx_dish_events_confirmed_by_user 
  on public.dish_events (confirmed_by_user);

-- Add composite index for common query pattern: user_id + confirmed_by_user
create index if not exists idx_dish_events_user_confirmed 
  on public.dish_events (user_id, confirmed_by_user) 
  where confirmed_by_user = true;
