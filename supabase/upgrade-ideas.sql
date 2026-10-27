-- Idea Inbox: jot down ideas before they evaporate.
-- Run once in the Supabase SQL Editor (same as upgrade-fix2 / upgrade-fix4).

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
