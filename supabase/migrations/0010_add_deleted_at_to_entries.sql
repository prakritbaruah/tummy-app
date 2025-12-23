-- Migration to add deleted_at columns to bowel_entries and symptom_entries tables
-- This column tracks when an entry was soft-deleted by the user
-- Null means the entry is active, non-null means it was deleted

-- Add deleted_at column to bowel_entries
alter table public.bowel_entries
  add column if not exists deleted_at timestamptz null;

-- Add deleted_at column to symptom_entries
alter table public.symptom_entries
  add column if not exists deleted_at timestamptz null;

-- Add indexes for efficient filtering by deletion status
create index if not exists idx_bowel_entries_deleted_at 
  on public.bowel_entries (deleted_at);

create index if not exists idx_symptom_entries_deleted_at 
  on public.symptom_entries (deleted_at);

-- Add composite indexes for common query patterns: user_id + deleted_at
create index if not exists idx_bowel_entries_user_active 
  on public.bowel_entries (user_id, deleted_at) 
  where deleted_at is null;

create index if not exists idx_symptom_entries_user_active 
  on public.symptom_entries (user_id, deleted_at) 
  where deleted_at is null;

