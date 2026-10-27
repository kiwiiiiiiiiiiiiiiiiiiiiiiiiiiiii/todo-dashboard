-- Cyber-Skill Matrix upgrade (Phase 4)
-- Run this ONLY if you already applied schema.sql before Phase 4 landed.
-- It adds: works_in_progress.skill_domain_id, auto-seeded skill_domains,
-- and the +5 progress trigger when a linked task completes.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'works_in_progress' and column_name = 'skill_domain_id'
  ) then
    alter table works_in_progress
      add column skill_domain_id uuid references skill_domains(id) on delete set null;
  end if;
end $$;

-- Default domains seeded at user registration
create or replace function handle_new_user_seed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into skill_domains (user_id, category, name) values
    (new.id, 'cyber', 'Secure Architecture'),
    (new.id, 'cyber', 'Penetration Testing'),
    (new.id, 'cyber', 'Secure Coding'),
    (new.id, 'ai', 'AI Tooling'),
    (new.id, 'ai', 'Prompt Engineering');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user_seed();

-- Idempotent self-seed for already-registered users (callable from the dashboard)
create or replace function seed_my_skill_domains() returns void
language sql security definer set search_path = public as $$
  insert into skill_domains (user_id, category, name)
  select auth.uid(), v.category, v.name
  from (values
    ('cyber', 'Secure Architecture'),
    ('cyber', 'Penetration Testing'),
    ('cyber', 'Secure Coding'),
    ('ai', 'AI Tooling'),
    ('ai', 'Prompt Engineering')
  ) as v(category, name)
  where not exists (
    select 1 from skill_domains s
    where s.user_id = auth.uid() and s.name = v.name
  );
$$;

revoke all on function seed_my_skill_domains() from public;
grant execute on function seed_my_skill_domains() to authenticated;

-- +5 progress (capped at max_progress) when a linked WIP task completes
create or replace function bump_skill_progress() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed'
     and old.status is distinct from 'completed'
     and new.skill_domain_id is not null then
    update skill_domains
    set current_progress = least(max_progress, current_progress + 5),
        updated_at = now()
    where id = new.skill_domain_id;
  end if;
  return new;
end;
$$;

drop trigger if exists wip_completed_bumps_skill on works_in_progress;
create trigger wip_completed_bumps_skill
  after update of status on works_in_progress
  for each row execute function bump_skill_progress();
