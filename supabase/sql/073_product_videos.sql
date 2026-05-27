alter table public.products
  add column if not exists product_video_key text,
  add column if not exists product_video_url text;

create index if not exists products_product_video_key_idx
  on public.products (product_video_key);
