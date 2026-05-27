create table if not exists public.admin_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  constraint admin_requests_status_check check (status in ('pending', 'approved', 'rejected')),
  constraint admin_requests_user_unique unique (user_id)
);

alter table public.admin_requests enable row level security;

create policy "Admin requests: insert own"
  on public.admin_requests
  for insert
  with check (auth.uid() = user_id);

create policy "Admin requests: admins can read"
  on public.admin_requests
  for select
  using (
    exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admin requests: admins can update"
  on public.admin_requests
  for update
  using (
    exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );
