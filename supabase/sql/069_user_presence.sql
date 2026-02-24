create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

create index if not exists user_presence_last_seen_idx
  on public.user_presence (last_seen_at desc);

alter table public.user_presence enable row level security;

drop policy if exists "User presence: authenticated read" on public.user_presence;
create policy "User presence: authenticated read"
  on public.user_presence
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "User presence: own insert" on public.user_presence;
create policy "User presence: own insert"
  on public.user_presence
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "User presence: own update" on public.user_presence;
create policy "User presence: own update"
  on public.user_presence
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
