-- Migration to add occurred_at column to dish_events table
-- This column tracks when the dish was actually eaten (set by the user)
-- created_at: when the dish_event record was created
-- occurred_at: when the dish was actually eaten

-- Add occurred_at column
alter table public.dish_events
  add column if not exists occurred_at timestamptz null;

-- For all existing dish_events, set occurred_at = created_at
update public.dish_events
  set occurred_at = created_at
  where occurred_at is null;

-- Make occurred_at NOT NULL after backfilling
alter table public.dish_events
  alter column occurred_at set not null;

-- Add index for efficient querying by occurred_at
create index if not exists idx_dish_events_occurred_at 
  on public.dish_events (occurred_at desc);

-- Add composite index for common query pattern: user_id + occurred_at
create index if not exists idx_dish_events_user_occurred 
  on public.dish_events (user_id, occurred_at desc) 
  where confirmed_by_user = true and deleted_at is null;

