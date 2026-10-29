-- Per-user rate limit for the AI coach.
--
-- A single row per user, updated atomically in one statement, so two concurrent
-- requests cannot both slip through on a stale count. RLS is enabled with NO
-- policies on purpose: the table is reachable only through the
-- security-definer function below, which always acts for auth.uid().

create table chat_rate_limits (
    user_id uuid primary key references auth.users(id) on delete cascade,
    window_start timestamptz not null default now(),
    request_count int not null default 0
);

alter table chat_rate_limits enable row level security;

create or replace function check_chat_rate_limit(
    p_limit int default 20,
    p_window_seconds int default 600
)
returns table (allowed boolean, remaining int, retry_after_seconds int)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_now timestamptz := now();
    v_window interval := make_interval(secs => p_window_seconds);
    v_row chat_rate_limits%rowtype;
begin
    if auth.uid() is null then
        raise exception 'not authenticated' using errcode = '42501';
    end if;

    insert into chat_rate_limits as c (user_id, window_start, request_count)
    values (auth.uid(), v_now, 1)
    on conflict (user_id) do update
        set request_count = case
                when c.window_start <= v_now - v_window then 1
                else c.request_count + 1
            end,
            window_start = case
                when c.window_start <= v_now - v_window then v_now
                else c.window_start
            end
    returning c.* into v_row;

    allowed := v_row.request_count <= p_limit;
    remaining := greatest(p_limit - v_row.request_count, 0);
    retry_after_seconds := case
        when v_row.request_count <= p_limit then 0
        else greatest(
            1,
            ceil(extract(epoch from (v_row.window_start + v_window - v_now)))::int
        )
    end;
    return next;
end;
$$;

revoke all on function check_chat_rate_limit(int, int) from public;
grant execute on function check_chat_rate_limit(int, int) to authenticated;
