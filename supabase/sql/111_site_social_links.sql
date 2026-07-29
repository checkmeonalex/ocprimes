-- Site-wide social profile links shown in the storefront footer. These are
-- the platform's own profiles and are intentionally separate from the
-- per-brand social columns on admin_brands (which belong to vendor
-- storefronts).
create table if not exists public.site_social_links (
  id integer primary key default 1,
  instagram_url text,
  tiktok_url text,
  x_url text,
  facebook_url text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint site_social_links_single_row check (id = 1)
);

insert into public.site_social_links (id)
values (1)
on conflict (id) do nothing;

alter table public.site_social_links enable row level security;

drop policy if exists "Site social links readable" on public.site_social_links;
create policy "Site social links readable"
  on public.site_social_links
  for select using (true);

drop policy if exists "Site social links insertable by admins" on public.site_social_links;
create policy "Site social links insertable by admins"
  on public.site_social_links
  for insert
  with check (public.is_admin_user());

drop policy if exists "Site social links updatable by admins" on public.site_social_links;
create policy "Site social links updatable by admins"
  on public.site_social_links
  for update
  using (public.is_admin_user())
  with check (public.is_admin_user());
