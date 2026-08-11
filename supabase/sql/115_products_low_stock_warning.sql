alter table public.products
  add column if not exists show_low_stock_warning boolean not null default false;
