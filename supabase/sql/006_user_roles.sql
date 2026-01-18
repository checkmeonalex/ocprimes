create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer',
  updated_at timestamptz not null default now(),
  constraint user_roles_role_check check (role in ('admin', 'customer'))
);

alter table public.user_roles enable row level security;

create policy "User roles: read own"
  on public.user_roles
  for select
  using (auth.uid() = user_id);

create policy "User roles: admins can read"
  on public.user_roles
  for select
  using (
    exists (
      select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "User roles: admins can update"
  on public.user_roles
  for update
  using (
    exists (
      select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'
    )
  );
