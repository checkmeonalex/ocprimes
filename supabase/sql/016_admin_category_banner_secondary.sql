alter table public.admin_categories
  add column if not exists banner_image_secondary_url text,
  add column if not exists banner_image_secondary_key text;

create index if not exists admin_categories_banner_image_secondary_key_idx
  on public.admin_categories (banner_image_secondary_key);
