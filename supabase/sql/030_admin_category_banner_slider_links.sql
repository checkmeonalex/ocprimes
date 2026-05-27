alter table public.admin_categories
  add column if not exists banner_slider_links text[] default '{}';

create index if not exists admin_categories_banner_slider_links_idx
  on public.admin_categories using gin (banner_slider_links);
