alter table if exists public.admin_logistics_rates
  add column if not exists standard_price numeric(12,2) not null default 0,
  add column if not exists express_price numeric(12,2) not null default 0,
  add column if not exists eta_standard_key text not null default 'standard',
  add column if not exists eta_standard_hours integer not null default 48,
  add column if not exists eta_express_key text not null default 'express',
  add column if not exists eta_express_hours integer not null default 12;

update public.admin_logistics_rates
set
  standard_price = coalesce(standard_price, price, 0),
  express_price = coalesce(express_price, price, 0),
  eta_standard_key = coalesce(
    nullif(eta_standard_key, ''),
    case when eta_key = 'same_day' then 'express' else 'standard' end
  ),
  eta_standard_hours = coalesce(nullif(eta_standard_hours, 0), eta_hours, 48),
  eta_express_key = coalesce(
    nullif(eta_express_key, ''),
    case when eta_key = 'same_day' then 'express' else 'express' end
  ),
  eta_express_hours = coalesce(nullif(eta_express_hours, 0), 12);

alter table if exists public.admin_logistics_rates
  drop constraint if exists admin_logistics_rates_standard_price_nonnegative,
  add constraint admin_logistics_rates_standard_price_nonnegative check (standard_price >= 0),
  drop constraint if exists admin_logistics_rates_express_price_nonnegative,
  add constraint admin_logistics_rates_express_price_nonnegative check (express_price >= 0),
  drop constraint if exists admin_logistics_rates_eta_standard_key_check,
  add constraint admin_logistics_rates_eta_standard_key_check check (eta_standard_key in ('standard', 'express')),
  drop constraint if exists admin_logistics_rates_eta_express_key_check,
  add constraint admin_logistics_rates_eta_express_key_check check (eta_express_key in ('standard', 'express')),
  drop constraint if exists admin_logistics_rates_eta_standard_hours_check,
  add constraint admin_logistics_rates_eta_standard_hours_check check (eta_standard_hours >= 1 and eta_standard_hours <= 720),
  drop constraint if exists admin_logistics_rates_eta_express_hours_check,
  add constraint admin_logistics_rates_eta_express_hours_check check (eta_express_hours >= 1 and eta_express_hours <= 720);
