alter table admin_brands
  add column if not exists storefront_blocks jsonb not null default '[]'::jsonb;
