alter table public.admin_brands
  add column if not exists logo_full_url text;

alter table public.admin_brands
  add column if not exists logo_font text;
