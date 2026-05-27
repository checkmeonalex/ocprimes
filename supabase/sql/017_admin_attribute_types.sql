create table if not exists public.admin_attribute_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists admin_attribute_types_name_idx on public.admin_attribute_types (name);

alter table public.admin_attribute_types enable row level security;

create policy "Admin attribute types: select" on public.admin_attribute_types
for select using (public.is_admin_user());

create policy "Admin attribute types: insert" on public.admin_attribute_types
for insert with check (public.is_admin_user());

create policy "Admin attribute types: update" on public.admin_attribute_types
for update using (public.is_admin_user()) with check (public.is_admin_user());

create policy "Admin attribute types: delete" on public.admin_attribute_types
for delete using (public.is_admin_user());

insert into public.admin_attribute_types (name, slug, description)
values
  ('Color', 'color', 'Color swatches with hex values.'),
  ('Radio', 'radio', 'Single-select radio options.'),
  ('Button', 'button', 'Clickable option buttons.'),
  ('Text', 'text', 'Free-text attribute.')
on conflict (slug) do nothing;

alter table public.admin_attributes
  add column if not exists type_id uuid references public.admin_attribute_types(id) on delete set null;

update public.admin_attributes
  set type_id = (select id from public.admin_attribute_types where slug = 'color')
  where slug = 'color' and type_id is null;

update public.admin_attributes
  set type_id = (select id from public.admin_attribute_types where slug = 'text')
  where type_id is null;

create index if not exists admin_attributes_type_idx on public.admin_attributes (type_id);
