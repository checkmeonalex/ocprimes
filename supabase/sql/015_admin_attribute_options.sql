create table if not exists public.admin_attribute_options (
  id uuid primary key default gen_random_uuid(),
  attribute_id uuid not null references public.admin_attributes(id) on delete cascade,
  name text not null,
  slug text not null,
  color_hex text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint admin_attribute_options_unique unique (attribute_id, slug)
);

create index if not exists admin_attribute_options_attribute_idx
  on public.admin_attribute_options(attribute_id);
create index if not exists admin_attribute_options_name_idx
  on public.admin_attribute_options(name);

alter table public.admin_attribute_options enable row level security;

create policy "Admin attribute options: select" on public.admin_attribute_options
for select using (public.is_admin_user());

create policy "Admin attribute options: insert" on public.admin_attribute_options
for insert with check (public.is_admin_user());

create policy "Admin attribute options: update" on public.admin_attribute_options
for update using (public.is_admin_user()) with check (public.is_admin_user());

create policy "Admin attribute options: delete" on public.admin_attribute_options
for delete using (public.is_admin_user());

insert into public.admin_attributes (name, slug, description)
values
  ('Color', 'color', 'Choose available product colors.'),
  ('Size', 'size', 'Define size options such as S, M, L.'),
  ('Material', 'material', 'Materials used for the product.'),
  ('Style', 'style', 'Visual style or fit.')
on conflict (slug) do nothing;

with color_attribute as (
  select id from public.admin_attributes where slug = 'color'
),
size_attribute as (
  select id from public.admin_attributes where slug = 'size'
),
material_attribute as (
  select id from public.admin_attributes where slug = 'material'
),
style_attribute as (
  select id from public.admin_attributes where slug = 'style'
)
insert into public.admin_attribute_options (attribute_id, name, slug, color_hex, sort_order)
select id, 'Black', 'black', '#111827', 1 from color_attribute
union all
select id, 'White', 'white', '#f9fafb', 2 from color_attribute
union all
select id, 'Red', 'red', '#ef4444', 3 from color_attribute
union all
select id, 'Blue', 'blue', '#3b82f6', 4 from color_attribute
union all
select id, 'Green', 'green', '#22c55e', 5 from color_attribute
union all
select id, 'Beige', 'beige', '#e7c9a9', 6 from color_attribute
union all
select id, 'XS', 'xs', null, 1 from size_attribute
union all
select id, 'S', 's', null, 2 from size_attribute
union all
select id, 'M', 'm', null, 3 from size_attribute
union all
select id, 'L', 'l', null, 4 from size_attribute
union all
select id, 'XL', 'xl', null, 5 from size_attribute
union all
select id, 'Cotton', 'cotton', null, 1 from material_attribute
union all
select id, 'Denim', 'denim', null, 2 from material_attribute
union all
select id, 'Leather', 'leather', null, 3 from material_attribute
union all
select id, 'Wool', 'wool', null, 4 from material_attribute
union all
select id, 'Casual', 'casual', null, 1 from style_attribute
union all
select id, 'Formal', 'formal', null, 2 from style_attribute
union all
select id, 'Sport', 'sport', null, 3 from style_attribute
on conflict (attribute_id, slug) do nothing;
