-- Migration to add additional triggers to the triggers table
-- This migration adds the remaining triggers that were added to 0006 after it was applied to production
-- These must match VALID_TRIGGER_NAMES in src/data/trigger.ts

-- Note: The original migration (0006) inserted: gluten, dairy, nuts, caffeine, sugar, red_meat
-- This migration adds the remaining triggers and handles the 'sugar' -> 'added_sugar' rename

-- First, update 'sugar' to 'added_sugar' if it exists (to match VALID_TRIGGER_NAMES)
update public.triggers
set trigger_name = 'added_sugar'
where trigger_name = 'sugar'
  and not exists (select 1 from public.triggers where trigger_name = 'added_sugar');

-- Insert additional triggers (only insert if they don't exist)
insert into public.triggers (trigger_name)
select new_trigger
from unnest(array[
  'alcohol',
  'spicy',
  'fried_food',
  'added_sugar',
  'insoluble_fiber',
  'fructans',
  'legumes_beans',
  'high_fructose_fruits',
  'processed_meat',
  'sesame',
  'shellfish',
  'fish',
  'soy'
]::text[]) as new_trigger
where not exists (
  select 1 from public.triggers 
  where triggers.trigger_name = new_trigger
);
