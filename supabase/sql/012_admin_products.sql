create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  price numeric(12, 2) not null,
  discount_price numeric(12, 2),
  sku text unique,
  stock_quantity integer not null default 0,
  status text not null default 'publish',
  main_image_id uuid references public.product_images(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_status_check check (status in ('publish', 'draft', 'archived'))
);

create table if not exists public.product_category_links (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.admin_categories(id) on delete cascade,
  primary key (product_id, category_id)
);

create table if not exists public.product_tag_links (
  product_id uuid not null references public.products(id) on delete cascade,
  tag_id uuid not null references public.admin_tags(id) on delete cascade,
  primary key (product_id, tag_id)
);

create table if not exists public.product_brand_links (
  product_id uuid not null references public.products(id) on delete cascade,
  brand_id uuid not null references public.admin_brands(id) on delete cascade,
  primary key (product_id, brand_id)
);

create index if not exists products_status_idx on public.products (status);
create index if not exists products_created_at_idx on public.products (created_at desc);
create index if not exists products_slug_idx on public.products (slug);
create index if not exists product_category_links_category_idx
  on public.product_category_links(category_id);
create index if not exists product_tag_links_tag_idx
  on public.product_tag_links(tag_id);
create index if not exists product_brand_links_brand_idx
  on public.product_brand_links(brand_id);

alter table public.products enable row level security;
alter table public.product_category_links enable row level security;
alter table public.product_tag_links enable row level security;
alter table public.product_brand_links enable row level security;

drop policy if exists "admin read products" on public.products;
create policy "admin read products"
  on public.products
  for select
  using (public.is_admin_user());

drop policy if exists "admin write products" on public.products;
create policy "admin write products"
  on public.products
  for all
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "public read products" on public.products;
create policy "public read products"
  on public.products
  for select
  using (status = 'publish');

drop policy if exists "admin read product_category_links" on public.product_category_links;
create policy "admin read product_category_links"
  on public.product_category_links
  for select
  using (public.is_admin_user());

drop policy if exists "admin write product_category_links" on public.product_category_links;
create policy "admin write product_category_links"
  on public.product_category_links
  for all
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "public read product_category_links" on public.product_category_links;
create policy "public read product_category_links"
  on public.product_category_links
  for select
  using (
    exists (
      select 1
      from public.products
      where products.id = product_category_links.product_id
        and products.status = 'publish'
    )
  );

drop policy if exists "admin read product_tag_links" on public.product_tag_links;
create policy "admin read product_tag_links"
  on public.product_tag_links
  for select
  using (public.is_admin_user());

drop policy if exists "admin write product_tag_links" on public.product_tag_links;
create policy "admin write product_tag_links"
  on public.product_tag_links
  for all
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "public read product_tag_links" on public.product_tag_links;
create policy "public read product_tag_links"
  on public.product_tag_links
  for select
  using (
    exists (
      select 1
      from public.products
      where products.id = product_tag_links.product_id
        and products.status = 'publish'
    )
  );

drop policy if exists "admin read product_brand_links" on public.product_brand_links;
create policy "admin read product_brand_links"
  on public.product_brand_links
  for select
  using (public.is_admin_user());

drop policy if exists "admin write product_brand_links" on public.product_brand_links;
create policy "admin write product_brand_links"
  on public.product_brand_links
  for all
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "public read product_brand_links" on public.product_brand_links;
create policy "public read product_brand_links"
  on public.product_brand_links
  for select
  using (
    exists (
      select 1
      from public.products
      where products.id = product_brand_links.product_id
        and products.status = 'publish'
    )
  );

drop policy if exists "public read product images" on public.product_images;
create policy "public read product images"
  on public.product_images
  for select
  using (
    exists (
      select 1
      from public.products
      where products.id = product_images.product_id
        and products.status = 'publish'
    )
  );
