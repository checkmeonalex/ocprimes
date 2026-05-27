create table if not exists public.component_images (
  id uuid primary key default gen_random_uuid(),
  r2_key text not null,
  url text not null,
  alt_text text,
  created_at timestamptz not null default now()
);

create index if not exists component_images_created_at_idx on public.component_images (created_at);
create index if not exists component_images_r2_key_idx on public.component_images (r2_key);

alter table public.component_images enable row level security;

drop policy if exists "admin read component images" on public.component_images;
create policy "admin read component images"
  on public.component_images
  for select
  using (public.is_admin_user());

drop policy if exists "admin write component images" on public.component_images;
create policy "admin write component images"
  on public.component_images
  for all
  using (public.is_admin_user())
  with check (public.is_admin_user());
