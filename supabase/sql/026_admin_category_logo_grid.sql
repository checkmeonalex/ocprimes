create table if not exists public.admin_category_logo_grids (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.admin_categories(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id)
);

create table if not exists public.admin_category_logo_items (
  id uuid primary key default gen_random_uuid(),
  grid_id uuid not null references public.admin_category_logo_grids(id) on delete cascade,
  image_url text not null,
  image_key text,
  image_alt text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists admin_category_logo_grids_category_idx
  on public.admin_category_logo_grids (category_id);
create index if not exists admin_category_logo_items_grid_idx
  on public.admin_category_logo_items (grid_id);
create index if not exists admin_category_logo_items_sort_idx
  on public.admin_category_logo_items (grid_id, sort_order);

alter table public.admin_category_logo_grids enable row level security;
alter table public.admin_category_logo_items enable row level security;

drop policy if exists "admin read logo grids" on public.admin_category_logo_grids;
create policy "admin read logo grids"
  on public.admin_category_logo_grids
  for select
  using (public.is_admin_user());

drop policy if exists "admin write logo grids" on public.admin_category_logo_grids;
create policy "admin write logo grids"
  on public.admin_category_logo_grids
  for all
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "public read logo grids" on public.admin_category_logo_grids;
create policy "public read logo grids"
  on public.admin_category_logo_grids
  for select
  using (
    exists (
      select 1
      from public.admin_categories
      where admin_categories.id = admin_category_logo_grids.category_id
        and admin_categories.is_active = true
    )
  );

drop policy if exists "admin read logo items" on public.admin_category_logo_items;
create policy "admin read logo items"
  on public.admin_category_logo_items
  for select
  using (public.is_admin_user());

drop policy if exists "admin write logo items" on public.admin_category_logo_items;
create policy "admin write logo items"
  on public.admin_category_logo_items
  for all
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "public read logo items" on public.admin_category_logo_items;
create policy "public read logo items"
  on public.admin_category_logo_items
  for select
  using (
    exists (
      select 1
      from public.admin_category_logo_grids grids
      join public.admin_categories categories on categories.id = grids.category_id
      where grids.id = admin_category_logo_items.grid_id
        and categories.is_active = true
    )
  );
