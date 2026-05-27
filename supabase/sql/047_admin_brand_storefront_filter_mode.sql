alter table public.admin_brands
  add column if not exists storefront_filter_mode text default 'category';

update public.admin_brands
set storefront_filter_mode = 'category'
where storefront_filter_mode is null;

alter table public.admin_brands
  drop constraint if exists admin_brands_storefront_filter_mode_check;

alter table public.admin_brands
  add constraint admin_brands_storefront_filter_mode_check
  check (storefront_filter_mode in ('category', 'tag'));
