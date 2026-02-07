alter table public.admin_categories
  add column if not exists banner_slider_mobile_urls text[] default '{}',
  add column if not exists banner_slider_mobile_keys text[] default '{}';

create index if not exists admin_categories_banner_slider_mobile_urls_idx
  on public.admin_categories using gin (banner_slider_mobile_urls);
