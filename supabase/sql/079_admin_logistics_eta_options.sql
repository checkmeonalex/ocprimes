update public.admin_logistics_rates
set
  eta_standard_key = case
    when eta_standard_key in ('standard_1_2_days', 'standard_1_3_days', 'standard_2_5_days')
      then eta_standard_key
    when eta_standard_key = 'standard' then 'standard_1_3_days'
    when eta_standard_key = 'express' then 'standard_1_3_days'
    when eta_key = 'next_day' then 'standard_1_2_days'
    else 'standard_1_3_days'
  end,
  eta_express_key = case
    when eta_express_key in ('express_2_24_hours', 'express_1_3_days')
      then eta_express_key
    when eta_express_key = 'express' then 'express_2_24_hours'
    when eta_express_key = 'standard' then 'express_1_3_days'
    when eta_key = 'same_day' then 'express_2_24_hours'
    else 'express_2_24_hours'
  end;

alter table if exists public.admin_logistics_rates
  alter column eta_standard_key set default 'standard_1_3_days',
  alter column eta_express_key set default 'express_2_24_hours',
  drop constraint if exists admin_logistics_rates_eta_standard_key_check,
  add constraint admin_logistics_rates_eta_standard_key_check check (
    eta_standard_key in (
      'standard_1_2_days',
      'standard_1_3_days',
      'standard_2_5_days'
    )
  ),
  drop constraint if exists admin_logistics_rates_eta_express_key_check,
  add constraint admin_logistics_rates_eta_express_key_check check (
    eta_express_key in (
      'express_2_24_hours',
      'express_1_3_days'
    )
  );
