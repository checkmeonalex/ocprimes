create table if not exists public.admin_pickup_locations (
  id text primary key,
  label text not null,
  line1 text not null,
  line2 text not null default '',
  city text not null,
  state text not null,
  postal_code text not null default '',
  country text not null default 'Nigeria',
  hours text not null default '',
  note text not null default '',
  phone text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists admin_pickup_locations_sort_idx
  on public.admin_pickup_locations (sort_order asc, created_at asc);

alter table public.admin_pickup_locations enable row level security;

drop policy if exists "Admin pickup locations readable" on public.admin_pickup_locations;
create policy "Admin pickup locations readable"
  on public.admin_pickup_locations
  for select
  using (true);

drop policy if exists "Admin pickup locations manageable by admins" on public.admin_pickup_locations;
create policy "Admin pickup locations manageable by admins"
  on public.admin_pickup_locations
  for all
  using (public.is_admin_user())
  with check (public.is_admin_user());
