create table if not exists public.admin_attributes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists admin_attributes_name_idx on public.admin_attributes (name);

alter table public.admin_attributes enable row level security;

create policy "Admin attributes: select" on public.admin_attributes
for select using (public.is_admin_user());

create policy "Admin attributes: insert" on public.admin_attributes
for insert with check (public.is_admin_user());

create policy "Admin attributes: update" on public.admin_attributes
for update using (public.is_admin_user()) with check (public.is_admin_user());

create policy "Admin attributes: delete" on public.admin_attributes
for delete using (public.is_admin_user());
