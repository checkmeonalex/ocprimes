alter table public.admin_category_hotspot_layouts
  drop constraint if exists admin_category_hotspot_layouts_category_id_key;

alter table public.admin_category_hotspot_layouts
  add column if not exists sort_order integer not null default 0;

create index if not exists admin_category_hotspot_layouts_sort_order_idx
  on public.admin_category_hotspot_layouts (category_id, sort_order);
