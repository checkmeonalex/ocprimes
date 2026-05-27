create table if not exists public.product_variations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  attributes jsonb not null default '{}'::jsonb,
  regular_price numeric(12, 2),
  sale_price numeric(12, 2),
  sku text,
  stock_quantity integer not null default 0,
  image_id uuid references public.product_images(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_variations_product_idx
  on public.product_variations(product_id);

alter table public.product_variations enable row level security;

drop policy if exists "admin read product variations" on public.product_variations;
create policy "admin read product variations"
  on public.product_variations
  for select
  using (public.is_admin_user());

drop policy if exists "admin write product variations" on public.product_variations;
create policy "admin write product variations"
  on public.product_variations
  for all
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "public read product variations" on public.product_variations;
create policy "public read product variations"
  on public.product_variations
  for select
  using (
    exists (
      select 1
      from public.products
      where products.id = product_variations.product_id
        and products.status = 'publish'
    )
  );
