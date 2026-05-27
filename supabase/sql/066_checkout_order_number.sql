alter table public.checkout_orders
  add column if not exists order_number text;

create unique index if not exists checkout_orders_order_number_unique
  on public.checkout_orders (order_number)
  where order_number is not null;
