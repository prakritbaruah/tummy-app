-- SECURITY FIX: Remove dev fallback policies that allow access to dev user data
-- 
-- PROBLEM: The dev policies (bowel_dev_policy, food_dev_policy, symptom_dev_policy)
-- allow ANY authenticated user to access data where user_id = '00000000-0000-0000-0000-000000000000'.
-- In PostgreSQL RLS, if ANY policy allows access, the user can access the data.
-- This means authenticated users could see the dev user's data, which is a security vulnerability.
--
-- SOLUTION: Remove these dev policies. Now only the secure owner policies remain:
-- - bowel_owner_policy: using (user_id = auth.uid()) with check (user_id = auth.uid())
-- - food_owner_policy: using (user_id = auth.uid()) with check (user_id = auth.uid())
-- - symptom_owner_policy: using (user_id = auth.uid()) with check (user_id = auth.uid())
--
-- These policies ensure that users can ONLY access data where user_id matches their authenticated user ID.
-- No user can access another user's data, including the dev user's data.

-- Remove dev policies from all tables
drop policy if exists bowel_dev_policy on public.bowel_entries;
drop policy if exists food_dev_policy on public.food_entries;
drop policy if exists symptom_dev_policy on public.symptom_entries;
