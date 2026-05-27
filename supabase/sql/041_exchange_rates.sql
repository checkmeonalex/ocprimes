create table if not exists public.exchange_rates (
  currency_code text primary key,
  unit_per_usd numeric(18, 8) not null,
  source text not null default 'manual',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint exchange_rates_currency_code_check check (currency_code in ('USD','NGN','EGP','GHS','XOF','DZD','MAD','GBP','AED','CAD')),
  constraint exchange_rates_unit_per_usd_check check (unit_per_usd > 0)
);

create table if not exists public.currency_settings (
  id int primary key default 1,
  use_live_sync boolean not null default false,
  provider text not null default 'currencyapi.com',
  base_currency text not null default 'USD',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint currency_settings_singleton check (id = 1),
  constraint currency_settings_base_currency_check check (base_currency = 'USD')
);

alter table public.exchange_rates enable row level security;
alter table public.currency_settings enable row level security;

drop policy if exists "Exchange rates public read" on public.exchange_rates;
create policy "Exchange rates public read"
  on public.exchange_rates
  for select
  using (true);

drop policy if exists "Currency settings public read" on public.currency_settings;
create policy "Currency settings public read"
  on public.currency_settings
  for select
  using (true);

drop policy if exists "Exchange rates admin write" on public.exchange_rates;
create policy "Exchange rates admin write"
  on public.exchange_rates
  for all
  using (
    exists (
      select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "Currency settings admin write" on public.currency_settings;
create policy "Currency settings admin write"
  on public.currency_settings
  for all
  using (
    exists (
      select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'
    )
  );

insert into public.exchange_rates (currency_code, unit_per_usd, source)
values
  ('USD', 1, 'seed'),
  ('NGN', 1600, 'seed'),
  ('EGP', 49, 'seed'),
  ('GHS', 15.5, 'seed'),
  ('XOF', 605, 'seed'),
  ('DZD', 135, 'seed'),
  ('MAD', 10, 'seed'),
  ('GBP', 0.79, 'seed'),
  ('AED', 3.67, 'seed'),
  ('CAD', 1.36, 'seed')
on conflict (currency_code) do nothing;

insert into public.currency_settings (id, use_live_sync, provider, base_currency)
values (1, false, 'currencyapi.com', 'USD')
on conflict (id) do nothing;
