create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('admin', 'customer'))
);

alter table public.profiles enable row level security;

create policy "Profiles can read own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Profiles can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "Profiles can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id);
