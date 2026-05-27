create table if not exists public.admin_logistics_worldwide_settings (
  id smallint primary key default 1 check (id = 1),
  fixed_price_usd numeric(12,2) not null default 15,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint admin_logistics_worldwide_settings_price_nonnegative check (fixed_price_usd >= 0)
);

insert into public.admin_logistics_worldwide_settings (id, fixed_price_usd)
values (1, 15)
on conflict (id) do nothing;

alter table public.admin_logistics_worldwide_settings enable row level security;

drop policy if exists "Admin worldwide logistics readable" on public.admin_logistics_worldwide_settings;
create policy "Admin worldwide logistics readable"
  on public.admin_logistics_worldwide_settings
  for select using (true);

drop policy if exists "Admin worldwide logistics manageable by admins" on public.admin_logistics_worldwide_settings;
create policy "Admin worldwide logistics manageable by admins"
  on public.admin_logistics_worldwide_settings
  for all
  using (public.is_admin_user())
  with check (public.is_admin_user());
