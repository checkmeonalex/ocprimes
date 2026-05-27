create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid,
  r2_key text not null,
  url text not null,
  sort_order integer not null default 0,
  alt_text text,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_id_idx
  on public.product_images(product_id);

create index if not exists product_images_sort_order_idx
  on public.product_images(product_id, sort_order);

alter table public.product_images enable row level security;

drop policy if exists "admin read product images" on public.product_images;
create policy "admin read product images"
  on public.product_images
  for select
  using (public.is_admin_user());

drop policy if exists "admin write product images" on public.product_images;
create policy "admin write product images"
  on public.product_images
  for all
  using (public.is_admin_user())
  with check (public.is_admin_user());
