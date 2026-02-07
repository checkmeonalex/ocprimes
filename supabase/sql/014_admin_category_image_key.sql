alter table public.admin_categories
  add column if not exists image_key text;

create index if not exists admin_categories_image_key_idx on public.admin_categories (image_key);
