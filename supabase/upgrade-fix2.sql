-- Fix #2: atomic "Mark done" — completes the project's open task(s) and
-- marks the project done in ONE transaction, so a network blip between two
-- client writes can no longer leave a task completed but the project stuck
-- active. The bump_skill_progress trigger still fires (+5 to linked domain).
-- Run once in the Supabase SQL Editor.

create or replace function complete_my_project(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update works_in_progress
     set status = 'completed',
         points_awarded = 10,
         updated_at = now()
   where project_id = p_project_id
     and user_id = auth.uid()
     and status <> 'completed';

  update projects
     set status = 'done',
         updated_at = now()
   where id = p_project_id
     and user_id = auth.uid();
end;
$$;

revoke all on function complete_my_project(uuid) from public;
grant execute on function complete_my_project(uuid) to authenticated;
