-- Migration to add deleted_at column to dish_events table
-- This column tracks when a dish event was soft-deleted by the user
-- Null means the dish event is active, non-null means it was deleted

-- Add deleted_at column
alter table public.dish_events
  add column if not exists deleted_at timestamptz null;

-- Add index for efficient filtering by deletion status
create index if not exists idx_dish_events_deleted_at 
  on public.dish_events (deleted_at);

-- Add composite index for common query pattern: user_id + confirmed_by_user + deleted_at
create index if not exists idx_dish_events_user_confirmed_active 
  on public.dish_events (user_id, confirmed_by_user, deleted_at) 
  where confirmed_by_user = true and deleted_at is null;
