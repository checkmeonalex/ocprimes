alter table admin_brands
  add column if not exists banner_grid jsonb,
  add column if not exists storefront_section_order text[]
    not null default array['banner_grid','storefront_filter'];
