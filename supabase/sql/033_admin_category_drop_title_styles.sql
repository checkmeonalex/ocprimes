alter table public.admin_categories
  drop constraint if exists admin_categories_hotspot_title_style_check;

alter table public.admin_categories
  drop constraint if exists admin_categories_featured_strip_title_style_check;

alter table public.admin_categories
  drop column if exists hotspot_title_style,
  drop column if exists featured_strip_title_style;
