alter table public.products
  add column if not exists condition_check text;

update public.products
set condition_check = 'brand_new'
where condition_check is null or btrim(condition_check) = '';

update public.products
set condition_check = 'refurbished'
where condition_check in ('used_good', 'used_fair', 'for_parts');

alter table public.products
  alter column condition_check set default 'brand_new',
  alter column condition_check set not null;
