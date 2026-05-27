create table if not exists public.admin_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.admin_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.admin_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists admin_categories_name_idx on public.admin_categories (name);
create index if not exists admin_brands_name_idx on public.admin_brands (name);
create index if not exists admin_tags_name_idx on public.admin_tags (name);

alter table public.admin_categories enable row level security;
alter table public.admin_brands enable row level security;
alter table public.admin_tags enable row level security;

create policy "Admin categories: select" on public.admin_categories
for select using (public.is_admin_user());

create policy "Admin categories: insert" on public.admin_categories
for insert with check (public.is_admin_user());

create policy "Admin categories: update" on public.admin_categories
for update using (public.is_admin_user()) with check (public.is_admin_user());

create policy "Admin categories: delete" on public.admin_categories
for delete using (public.is_admin_user());

create policy "Admin brands: select" on public.admin_brands
for select using (public.is_admin_user());

create policy "Admin brands: insert" on public.admin_brands
for insert with check (public.is_admin_user());

create policy "Admin brands: update" on public.admin_brands
for update using (public.is_admin_user()) with check (public.is_admin_user());

create policy "Admin brands: delete" on public.admin_brands
for delete using (public.is_admin_user());

create policy "Admin tags: select" on public.admin_tags
for select using (public.is_admin_user());

create policy "Admin tags: insert" on public.admin_tags
for insert with check (public.is_admin_user());

create policy "Admin tags: update" on public.admin_tags
for update using (public.is_admin_user()) with check (public.is_admin_user());

create policy "Admin tags: delete" on public.admin_tags
for delete using (public.is_admin_user());
