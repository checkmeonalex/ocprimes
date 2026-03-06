alter table if exists public.admin_logistics_worldwide_settings
  add column if not exists eta_key text not null default 'express_3_7_days';

update public.admin_logistics_worldwide_settings
set eta_key = coalesce(nullif(trim(eta_key), ''), 'express_3_7_days')
where id = 1;
