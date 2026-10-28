-- RLS tenant-isolation tests (pgTAP).
-- Run with: npx supabase test db
--
-- Every test runs inside one transaction that is rolled back at the end,
-- so the local database is left untouched.

begin;

create extension if not exists pgtap with schema extensions;

set search_path = public, extensions, auth;

select plan(15);

-- ---------------------------------------------------------------------------
-- Fixtures: two users. Inserting into auth.users fires handle_new_user_seed,
-- which gives each user 5 skill domains — used as a test later.
-- ---------------------------------------------------------------------------
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'alice@example.test',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'bob@example.test',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

-- ---------------------------------------------------------------------------
-- Act as Alice: create one row in each core table.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);

insert into projects (id, user_id, title, status)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        'Alice project', 'active');

insert into ideas (user_id, content)
values ('11111111-1111-1111-1111-111111111111', 'Alice idea');

insert into workouts (user_id, date, type, duration_minutes)
values ('11111111-1111-1111-1111-111111111111', current_date, 'lifting', 45);

insert into weight_logs (user_id, date, weight_kg)
values ('11111111-1111-1111-1111-111111111111', current_date, 72.5);

-- Alice sees her own rows.
select is((select count(*) from projects), 1::bigint, 'alice sees her own project');
select is((select count(*) from ideas), 1::bigint, 'alice sees her own idea');
select is((select count(*) from workouts), 1::bigint, 'alice sees her own workout');
select is((select count(*) from weight_logs), 1::bigint, 'alice sees her own weight log');
select is((select count(*) from skill_domains), 5::bigint, 'alice got 5 seeded skill domains');

-- ---------------------------------------------------------------------------
-- Act as Bob: Alice's data must be invisible and untouchable.
-- ---------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',
  true
);

select is((select count(*) from projects), 0::bigint, 'bob cannot see alice projects');
select is((select count(*) from ideas), 0::bigint, 'bob cannot see alice ideas');
select is((select count(*) from workouts), 0::bigint, 'bob cannot see alice workouts');
select is((select count(*) from weight_logs), 0::bigint, 'bob cannot see alice weight logs');

select throws_ok(
  $$ insert into projects (user_id, title)
     values ('11111111-1111-1111-1111-111111111111', 'forged') $$,
  '42501',
  null,
  'bob cannot insert a project owned by alice'
);

-- RLS turns these into silent no-ops: zero rows match, no error is raised.
-- The damage is verified below while acting as Alice.
update projects
   set title = 'hacked'
 where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

delete from projects
 where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Bob may call the RPC, but it must not touch Alice's rows.
select lives_ok(
  $$ select complete_my_project('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  'complete_my_project is callable by bob'
);

select is((select count(*) from skill_domains), 5::bigint, 'bob sees only his own seeded skill domains');
select is(
  (select count(*) from skill_domains
   where user_id = '11111111-1111-1111-1111-111111111111'),
  0::bigint,
  'bob sees none of alice skill domains'
);

-- ---------------------------------------------------------------------------
-- Back to Alice: her project survived Bob's RPC.
-- ---------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);

select is(
  (select title from projects where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'Alice project',
  'bob update attempt left alice project untouched'
);

select is(
  (select status from projects where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'active',
  'bob RPC call did not complete alice project'
);

select * from finish();
rollback;
