alter table public.admin_brands
  add column if not exists storefront_filter_title text;
