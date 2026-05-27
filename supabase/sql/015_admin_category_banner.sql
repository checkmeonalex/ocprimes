alter table public.admin_categories
  add column if not exists banner_image_url text,
  add column if not exists banner_image_key text,
  add column if not exists banner_title text,
  add column if not exists banner_subtitle text,
  add column if not exists banner_cta_text text,
  add column if not exists banner_cta_link text;

create index if not exists admin_categories_banner_image_key_idx on public.admin_categories (banner_image_key);
