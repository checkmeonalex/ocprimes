alter table public.products
  add column if not exists product_type text;

update public.products
  set product_type = 'simple'
  where product_type is null;

alter table public.products
  alter column product_type set default 'simple',
  alter column product_type set not null;

alter table public.products
  drop constraint if exists products_type_check;

alter table public.products
  add constraint products_type_check
  check (product_type in ('simple', 'variable'));
