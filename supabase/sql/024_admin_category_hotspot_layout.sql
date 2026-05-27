create table if not exists public.admin_category_hotspot_layouts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.admin_categories(id) on delete cascade,
  image_url text not null,
  image_key text,
  image_alt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id)
);

create table if not exists public.admin_category_hotspot_points (
  id uuid primary key default gen_random_uuid(),
  layout_id uuid not null references public.admin_category_hotspot_layouts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  position_x numeric(5, 2) not null,
  position_y numeric(5, 2) not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint admin_category_hotspot_points_position_check
    check (position_x >= 0 and position_x <= 100 and position_y >= 0 and position_y <= 100)
);

create index if not exists admin_category_hotspot_layouts_category_idx
  on public.admin_category_hotspot_layouts (category_id);
create index if not exists admin_category_hotspot_points_layout_idx
  on public.admin_category_hotspot_points (layout_id);
create index if not exists admin_category_hotspot_points_product_idx
  on public.admin_category_hotspot_points (product_id);

alter table public.admin_category_hotspot_layouts enable row level security;
alter table public.admin_category_hotspot_points enable row level security;

drop policy if exists "admin read hotspot layouts" on public.admin_category_hotspot_layouts;
create policy "admin read hotspot layouts"
  on public.admin_category_hotspot_layouts
  for select
  using (public.is_admin_user());

drop policy if exists "admin write hotspot layouts" on public.admin_category_hotspot_layouts;
create policy "admin write hotspot layouts"
  on public.admin_category_hotspot_layouts
  for all
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "public read hotspot layouts" on public.admin_category_hotspot_layouts;
create policy "public read hotspot layouts"
  on public.admin_category_hotspot_layouts
  for select
  using (
    exists (
      select 1
      from public.admin_categories
      where admin_categories.id = admin_category_hotspot_layouts.category_id
        and admin_categories.is_active = true
    )
  );

drop policy if exists "admin read hotspot points" on public.admin_category_hotspot_points;
create policy "admin read hotspot points"
  on public.admin_category_hotspot_points
  for select
  using (public.is_admin_user());

drop policy if exists "admin write hotspot points" on public.admin_category_hotspot_points;
create policy "admin write hotspot points"
  on public.admin_category_hotspot_points
  for all
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "public read hotspot points" on public.admin_category_hotspot_points;
create policy "public read hotspot points"
  on public.admin_category_hotspot_points
  for select
  using (
    exists (
      select 1
      from public.admin_category_hotspot_layouts layouts
      join public.admin_categories categories on categories.id = layouts.category_id
      where layouts.id = admin_category_hotspot_points.layout_id
        and categories.is_active = true
    )
    and exists (
      select 1
      from public.products
      where products.id = admin_category_hotspot_points.product_id
        and products.status = 'publish'
    )
  );
