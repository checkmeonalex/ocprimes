alter table public.admin_categories
  add column if not exists hotspot_title_kicker text,
  add column if not exists hotspot_title_main text,
  add column if not exists featured_strip_title_kicker text,
  add column if not exists featured_strip_title_main text;
