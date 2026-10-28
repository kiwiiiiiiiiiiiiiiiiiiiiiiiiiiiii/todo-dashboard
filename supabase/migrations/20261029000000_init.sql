-- Linear Dashboard — Supabase Schema (Phase 2)
-- Run this in the Supabase SQL Editor.
-- Every table is protected by Row Level Security tied to auth.uid() (zero-trust).

-- ---------------------------------------------------------------------------
-- Enable extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- profiles (optional: extends auth.users with display settings)
-- ---------------------------------------------------------------------------
create table profiles (
    id uuid references auth.users on delete cascade primary key,
    full_name text,
    avatar_url text,
    created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- projects — "Purgatory" backlog
-- status: 'purgatory' | 'active' | 'done'
-- is_blocking: when true, this project must reach 'done' before new projects can be added (WIP gate)
-- ---------------------------------------------------------------------------
create table projects (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    description text,
    status text not null default 'purgatory' check (status in ('purgatory','active','done')),
    is_blocking boolean not null default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- works_in_progress — actionable tasks inside a project
-- ---------------------------------------------------------------------------
create table works_in_progress (
    id uuid primary key default gen_random_uuid(),
    project_id uuid references projects(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    description text,
    deadline timestamptz not null,
    status text not null default 'pending' check (status in ('pending','in_progress','completed')),
    points_awarded int not null default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- workouts — daily fitness log
-- ---------------------------------------------------------------------------
create table workouts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    date date not null default current_date,
    type text not null, -- 'lifting' | 'cardio' | 'mobility' | ...
    duration_minutes int not null,
    calories_burned int
);

-- ---------------------------------------------------------------------------
-- weight_logs — daily weight (one entry per user per day)
-- ---------------------------------------------------------------------------
create table weight_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    date date not null default current_date,
    weight_kg decimal(5,2) not null,
    unique(user_id, date)
);

-- ---------------------------------------------------------------------------
-- skill_domains — cyber / AI upskilling progression (0-100)
-- ---------------------------------------------------------------------------
create table skill_domains (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    category text not null, -- 'cyber' | 'ai'
    name text not null, -- e.g. 'Secure Architecture', 'AI Tooling', 'Pen Testing'
    current_progress int not null default 0 check (current_progress between 0 and 100),
    max_progress int not null default 100,
    linked_project_id uuid references projects(id) on delete set null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Link WIP tasks to a skill domain (Phase 4: progress mapping)
alter table works_in_progress add column skill_domain_id uuid references skill_domains(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index projects_user_id_idx on projects(user_id);
create index projects_status_idx on projects(user_id, status);
create index wip_project_id_idx on works_in_progress(project_id);
create index wip_user_id_idx on works_in_progress(user_id, status);
create index workouts_user_date_idx on workouts(user_id, date);
create index weight_logs_user_date_idx on weight_logs(user_id, date);
create index skill_domains_user_idx on skill_domains(user_id, category);

-- ---------------------------------------------------------------------------
-- Row Level Security (zero-trust: users only touch their own rows)
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table projects enable row level security;
alter table works_in_progress enable row level security;
alter table workouts enable row level security;
alter table weight_logs enable row level security;
alter table skill_domains enable row level security;

-- Profiles
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Projects
create policy "Users can view own projects" on projects for select using (auth.uid() = user_id);
create policy "Users can insert own projects" on projects for insert with check (auth.uid() = user_id);
create policy "Users can update own projects" on projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own projects" on projects for delete using (auth.uid() = user_id);

-- Works in progress
create policy "Users can view own WIP" on works_in_progress for select using (auth.uid() = user_id);
create policy "Users can insert own WIP" on works_in_progress for insert with check (auth.uid() = user_id);
create policy "Users can update own WIP" on works_in_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own WIP" on works_in_progress for delete using (auth.uid() = user_id);

-- Workouts
create policy "Users can view own workouts" on workouts for select using (auth.uid() = user_id);
create policy "Users can insert own workouts" on workouts for insert with check (auth.uid() = user_id);
create policy "Users can update own workouts" on workouts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own workouts" on workouts for delete using (auth.uid() = user_id);

-- Weight logs
create policy "Users can view own weight logs" on weight_logs for select using (auth.uid() = user_id);
create policy "Users can insert own weight logs" on weight_logs for insert with check (auth.uid() = user_id);
create policy "Users can update own weight logs" on weight_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own weight logs" on weight_logs for delete using (auth.uid() = user_id);

-- Skill domains
create policy "Users can view own skill domains" on skill_domains for select using (auth.uid() = user_id);
create policy "Users can insert own skill domains" on skill_domains for insert with check (auth.uid() = user_id);
create policy "Users can update own skill domains" on skill_domains for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own skill domains" on skill_domains for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Helper: default WIP limit (configurable per-user later)
-- ---------------------------------------------------------------------------
-- Max active (non-done) projects allowed before the UI blocks new additions.
-- Default: 1. Enforced in the ProjectPurgatory component layer.
comment on table projects is 'WIP gate: is_blocking + status done controls whether new projects can be added.';

-- ---------------------------------------------------------------------------
-- Phase 4: Cyber-Skill Matrix automation
-- 1. Default skill_domains seeded at user registration (trigger on auth.users)
-- 2. Idempotent self-seed RPC for already-registered users (seed_my_skill_domains)
-- 3. +5 progress (capped at max_progress) when a linked WIP task completes
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Fix #2: atomic "Mark done" RPC (single transaction, ownership-checked)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Idea Inbox: quick-captured thoughts (see also supabase/upgrade-ideas.sql)
-- ---------------------------------------------------------------------------
create table ideas (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    content text not null,
    created_at timestamptz default now()
);

create index ideas_user_idx on ideas(user_id, created_at desc);
alter table ideas enable row level security;

create policy "Users can view own ideas" on ideas for select using (auth.uid() = user_id);
create policy "Users can insert own ideas" on ideas for insert with check (auth.uid() = user_id);
create policy "Users can update own ideas" on ideas for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own ideas" on ideas for delete using (auth.uid() = user_id);
