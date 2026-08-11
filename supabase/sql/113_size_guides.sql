create table if not exists public.size_guides (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit_toggle boolean not null default false,
  columns jsonb not null default '[]'::jsonb,
  rows jsonb not null default '[]'::jsonb,
  how_to_measure text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists size_guides_name_idx on public.size_guides(name);

alter table public.size_guides enable row level security;

do $$
begin
  create policy "Size guides: public select" on public.size_guides
    for select using (true);
exception
  when duplicate_object then null;
end $$;

create policy "Size guides: admin insert" on public.size_guides
for insert with check (public.is_admin_user());

create policy "Size guides: admin update" on public.size_guides
for update using (public.is_admin_user()) with check (public.is_admin_user());

create policy "Size guides: admin delete" on public.size_guides
for delete using (public.is_admin_user());

alter table public.admin_categories
  add column if not exists size_guide_id uuid references public.size_guides(id) on delete set null;

create index if not exists admin_categories_size_guide_idx
  on public.admin_categories(size_guide_id);

alter table public.products
  add column if not exists size_guide_id uuid references public.size_guides(id) on delete set null;

create index if not exists products_size_guide_idx
  on public.products(size_guide_id);
