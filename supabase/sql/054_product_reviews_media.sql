alter table public.product_reviews
  add column if not exists review_image_urls text[] default '{}',
  add column if not exists review_video_urls text[] default '{}';
