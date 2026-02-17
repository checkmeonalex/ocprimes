alter table public.admin_brands
  add column if not exists banner_slider_urls text[] default '{}',
  add column if not exists banner_slider_keys text[] default '{}',
  add column if not exists banner_slider_mobile_urls text[] default '{}',
  add column if not exists banner_slider_mobile_keys text[] default '{}',
  add column if not exists banner_slider_links text[] default '{}';

create index if not exists admin_brands_banner_slider_urls_idx
  on public.admin_brands using gin (banner_slider_urls);

create index if not exists admin_brands_banner_slider_mobile_urls_idx
  on public.admin_brands using gin (banner_slider_mobile_urls);
