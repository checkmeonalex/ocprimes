alter table public.products
  add column if not exists packaging_style text;

update public.products
set packaging_style = 'in_wrap_nylon'
where packaging_style is null or btrim(packaging_style) = '';

alter table public.products
  alter column packaging_style set default 'in_wrap_nylon',
  alter column packaging_style set not null;
