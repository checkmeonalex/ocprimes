alter table public.admin_categories
  add column if not exists featured_strip_image_url text,
  add column if not exists featured_strip_image_key text,
  add column if not exists featured_strip_tag_id uuid,
  add column if not exists featured_strip_category_id uuid;

create index if not exists admin_categories_featured_strip_image_key_idx
  on public.admin_categories (featured_strip_image_key);
