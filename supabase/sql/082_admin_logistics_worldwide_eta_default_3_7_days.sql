alter table if exists public.admin_logistics_worldwide_settings
  alter column eta_key set default 'express_3_7_days';

update public.admin_logistics_worldwide_settings
set eta_key = 'express_3_7_days'
where id = 1
  and (
    eta_key is null
    or nullif(trim(eta_key), '') is null
    or eta_key = 'express_2_24_hours'
  );
