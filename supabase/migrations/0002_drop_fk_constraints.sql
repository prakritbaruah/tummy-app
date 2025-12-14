-- Ensure user_id is not constrained to auth.users so dev UUIDs work before auth.
alter table if exists public.bowel_entries drop constraint if exists bowel_entries_user_id_fkey;
alter table if exists public.food_entries drop constraint if exists food_entries_user_id_fkey;
alter table if exists public.symptom_entries drop constraint if exists symptom_entries_user_id_fkey;
