alter table public.admin_brands
  add column if not exists storefront_filter_product_limit integer default 8;

update public.admin_brands
set storefront_filter_product_limit = 8
where storefront_filter_product_limit is null or storefront_filter_product_limit < 1;

alter table public.admin_brands
  drop constraint if exists admin_brands_storefront_filter_product_limit_check;

alter table public.admin_brands
  add constraint admin_brands_storefront_filter_product_limit_check
  check (storefront_filter_product_limit between 1 and 48);
