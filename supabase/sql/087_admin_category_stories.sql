create table if not exists public.admin_home_pages (
  id uuid primary key default gen_random_uuid(),
  page_key text not null unique default 'home' check (page_key = 'home'),
  legacy_category_id uuid references public.admin_categories(id) on delete set null,
  banner_slider_urls text[] not null default '{}',
  banner_slider_keys text[] not null default '{}',
  banner_slider_mobile_urls text[] not null default '{}',
  banner_slider_mobile_keys text[] not null default '{}',
  banner_slider_links text[] not null default '{}',
  featured_strip_image_url text,
  featured_strip_image_key text,
  featured_strip_tag_id uuid,
  featured_strip_category_id uuid,
  hotspot_title_main text,
  featured_strip_title_main text,
  browse_categories_title text,
  home_catalog_title text,
  home_catalog_description text,
  home_catalog_filter_mode text not null default 'none' check (home_catalog_filter_mode in ('none', 'category', 'tag')),
  home_catalog_category_id uuid,
  home_catalog_tag_id uuid,
  home_catalog_limit integer not null default 12,
  layout_order text[] not null default array['featured_strip', 'hotspot', 'logo_grid'],
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_admin_home_pages_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists admin_home_pages_set_updated_at on public.admin_home_pages;
create trigger admin_home_pages_set_updated_at
before update on public.admin_home_pages
for each row execute function public.set_admin_home_pages_updated_at();

insert into public.admin_home_pages (
  page_key,
  legacy_category_id,
  banner_slider_urls,
  banner_slider_keys,
  banner_slider_mobile_urls,
  banner_slider_mobile_keys,
  banner_slider_links,
  featured_strip_image_url,
  featured_strip_image_key,
  featured_strip_tag_id,
  featured_strip_category_id,
  hotspot_title_main,
  featured_strip_title_main,
  browse_categories_title,
  home_catalog_title,
  home_catalog_description,
  home_catalog_filter_mode,
  home_catalog_category_id,
  home_catalog_tag_id,
  home_catalog_limit,
  layout_order,
  is_active
)
select
  'home',
  c.id,
  coalesce(c.banner_slider_urls, '{}'),
  coalesce(c.banner_slider_keys, '{}'),
  coalesce(c.banner_slider_mobile_urls, '{}'),
  coalesce(c.banner_slider_mobile_keys, '{}'),
  coalesce(c.banner_slider_links, '{}'),
  c.featured_strip_image_url,
  c.featured_strip_image_key,
  c.featured_strip_tag_id,
  c.featured_strip_category_id,
  c.hotspot_title_main,
  c.featured_strip_title_main,
  c.browse_categories_title,
  c.home_catalog_title,
  c.home_catalog_description,
  coalesce(c.home_catalog_filter_mode, 'none'),
  c.home_catalog_category_id,
  c.home_catalog_tag_id,
  coalesce(c.home_catalog_limit, 12),
  coalesce(c.layout_order, array['featured_strip', 'hotspot', 'logo_grid']),
  coalesce(c.is_active, true)
from public.admin_categories c
where c.slug = 'home'
  and not exists (
    select 1
    from public.admin_home_pages hp
    where hp.page_key = 'home'
  )
order by c.created_at asc
limit 1;

alter table public.admin_home_pages enable row level security;

drop policy if exists "Admin home pages deny anon" on public.admin_home_pages;
create policy "Admin home pages deny anon"
  on public.admin_home_pages
  for all
  using (false)
  with check (false);
