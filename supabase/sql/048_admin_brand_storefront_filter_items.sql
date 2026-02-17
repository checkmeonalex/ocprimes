alter table public.admin_brands
  add column if not exists storefront_filter_category_ids uuid[] default '{}',
  add column if not exists storefront_filter_tag_ids uuid[] default '{}';

update public.admin_brands
set storefront_filter_category_ids = '{}'::uuid[]
where storefront_filter_category_ids is null;

update public.admin_brands
set storefront_filter_tag_ids = '{}'::uuid[]
where storefront_filter_tag_ids is null;
