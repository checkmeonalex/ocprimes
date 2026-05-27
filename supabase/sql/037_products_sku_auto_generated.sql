alter table public.products
  add column if not exists sku_auto_generated boolean not null default false;

update public.products
set sku_auto_generated = false
where sku_auto_generated is distinct from false;
