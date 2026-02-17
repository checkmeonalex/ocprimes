create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  reviewer_name text not null,
  reviewer_email text,
  rating integer not null check (rating between 1 and 5),
  title text,
  content text,
  is_verified_purchase boolean not null default false,
  status text not null default 'published' check (status in ('pending', 'published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_reviews_product_id_idx
  on public.product_reviews (product_id);

create index if not exists product_reviews_created_at_idx
  on public.product_reviews (created_at desc);

create index if not exists product_reviews_status_idx
  on public.product_reviews (status);
