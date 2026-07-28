alter table public.admin_brands
  add column if not exists logo_size_desktop smallint;

alter table public.admin_brands
  add column if not exists logo_size_mobile smallint;
