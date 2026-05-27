create table if not exists public.cart_shipping_progress_settings (
  id integer primary key default 1,
  enabled boolean not null default true,
  standard_free_shipping_threshold numeric(12,2) not null default 50,
  express_free_shipping_threshold numeric(12,2) not null default 100,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint cart_shipping_progress_settings_single_row check (id = 1),
  constraint cart_shipping_progress_settings_thresholds_check check (
    standard_free_shipping_threshold >= 0
    and express_free_shipping_threshold >= standard_free_shipping_threshold
  )
);

insert into public.cart_shipping_progress_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.cart_shipping_progress_settings enable row level security;

drop policy if exists "Cart shipping progress settings readable" on public.cart_shipping_progress_settings;
create policy "Cart shipping progress settings readable"
  on public.cart_shipping_progress_settings
  for select using (true);
