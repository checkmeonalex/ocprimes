create table if not exists public.product_videos (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  r2_key text not null,
  url text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists product_videos_product_id_idx
  on public.product_videos(product_id);

create index if not exists product_videos_created_at_idx
  on public.product_videos(created_at desc);

alter table public.product_videos enable row level security;

drop policy if exists "admin read product videos" on public.product_videos;
create policy "admin read product videos"
  on public.product_videos
  for select
  using (public.is_admin_user());

drop policy if exists "admin write product videos" on public.product_videos;
create policy "admin write product videos"
  on public.product_videos
  for all
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- Public can read videos only for published products they belong to.
drop policy if exists "public read product videos" on public.product_videos;
create policy "public read product videos"
  on public.product_videos
  for select
  using (
    exists (
      select 1
      from public.products
      where products.id = product_videos.product_id
        and products.status = 'publish'
    )
  );
