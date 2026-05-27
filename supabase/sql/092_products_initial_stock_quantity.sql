alter table public.products
  add column if not exists initial_stock_quantity integer not null default 0;

update public.products
set initial_stock_quantity = greatest(0, coalesce(stock_quantity, 0))
where initial_stock_quantity is null
   or initial_stock_quantity = 0;

alter table public.products
  add constraint products_initial_stock_quantity_check
  check (initial_stock_quantity >= 0);
