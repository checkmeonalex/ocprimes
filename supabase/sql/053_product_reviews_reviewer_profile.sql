alter table public.product_reviews
  add column if not exists reviewer_user_id uuid,
  add column if not exists reviewer_avatar_url text;

create index if not exists product_reviews_reviewer_user_id_idx
  on public.product_reviews (reviewer_user_id);
