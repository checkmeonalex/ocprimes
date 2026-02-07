alter table public.admin_categories
  drop column if exists hotspot_title_kicker,
  drop column if exists featured_strip_title_kicker;
