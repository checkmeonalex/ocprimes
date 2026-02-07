alter table public.products
  add column if not exists return_policy text;

update public.products
set return_policy = 'not_returnable'
where return_policy is null or btrim(return_policy) = '';

alter table public.products
  alter column return_policy set default 'not_returnable',
  alter column return_policy set not null;
