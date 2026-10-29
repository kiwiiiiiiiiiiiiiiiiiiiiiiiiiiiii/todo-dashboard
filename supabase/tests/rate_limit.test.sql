-- Rate-limit tests (pgTAP).
-- Run with: npx supabase test db
--
-- Verifies the atomic counter: allowed calls, the blocked call, the
-- Retry-After value, window reset, and that anonymous callers are refused.

begin;

create extension if not exists pgtap with schema extensions;

set search_path = public, extensions, auth;

select plan(8);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '33333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'carol@example.test',
  crypt('password123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}',
  true
);

select is((select allowed from check_chat_rate_limit(3, 600)), true, 'request 1 of 3 allowed');
select is((select allowed from check_chat_rate_limit(3, 600)), true, 'request 2 of 3 allowed');
select is((select allowed from check_chat_rate_limit(3, 600)), true, 'request 3 of 3 allowed');
select is((select allowed from check_chat_rate_limit(3, 600)), false, 'request 4 blocked');
select cmp_ok(
  (select retry_after_seconds from check_chat_rate_limit(3, 600)),
  '>',
  0,
  'blocked request reports a positive Retry-After'
);

-- A zero-length window is always expired, so the next call starts fresh.
select is((select allowed from check_chat_rate_limit(1, 0)), true, 'expired window resets to a new count');
select is((select remaining from check_chat_rate_limit(1, 0)), 0, 'counter really restarted at 1');

-- Anonymous callers must not be able to drive the limiter.
reset role;
set local role anon;
select set_config('request.jwt.claims', '{}', true);
select throws_ok(
  $$ select * from check_chat_rate_limit(3, 600) $$,
  '42501',
  null,
  'anonymous caller is refused'
);

select * from finish();
rollback;
