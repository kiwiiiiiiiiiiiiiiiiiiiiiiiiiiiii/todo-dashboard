-- Fix #4: update policies must re-validate user_id on save.
-- The original policies check ownership of the OLD row only (`using`), so an
-- update could move a row to ANOTHER user's user_id. `with check` validates
-- the NEW row too. Run once in the Supabase SQL Editor.

drop policy "Users can update own projects" on projects;
create policy "Users can update own projects" on projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy "Users can update own WIP" on works_in_progress;
create policy "Users can update own WIP" on works_in_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy "Users can update own workouts" on workouts;
create policy "Users can update own workouts" on workouts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy "Users can update own weight logs" on weight_logs;
create policy "Users can update own weight logs" on weight_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy "Users can update own skill domains" on skill_domains;
create policy "Users can update own skill domains" on skill_domains
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
