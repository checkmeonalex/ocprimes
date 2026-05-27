create table if not exists public.checkout_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paystack_reference text not null unique,
  paystack_transaction_id text,
  payment_status text not null default 'paid',
  currency text not null default 'NGN',
  subtotal numeric(12,2) not null default 0,
  shipping_fee numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  protection_fee numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  item_count integer not null default 0,
  shipping_address jsonb not null default '{}'::jsonb,
  billing_address jsonb not null default '{}'::jsonb,
  contact_phone text,
  checkout_selection text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checkout_orders_payment_status_check
    check (payment_status in ('paid', 'failed', 'pending')),
  constraint checkout_orders_item_count_nonnegative check (item_count >= 0)
);

create index if not exists checkout_orders_user_created_idx
  on public.checkout_orders (user_id, created_at desc);

create table if not exists public.checkout_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.checkout_orders(id) on delete cascade,
  item_key text not null,
  product_id text not null,
  name text not null,
  image text,
  selected_variation_label text,
  quantity integer not null default 1,
  unit_price numeric(12,2) not null default 0,
  original_unit_price numeric(12,2),
  line_total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  constraint checkout_order_items_quantity_check check (quantity > 0),
  constraint checkout_order_items_line_total_nonnegative check (line_total >= 0)
);

create index if not exists checkout_order_items_order_idx
  on public.checkout_order_items (order_id);

create unique index if not exists checkout_order_items_order_key_unique
  on public.checkout_order_items (order_id, item_key);

alter table public.checkout_orders enable row level security;
alter table public.checkout_order_items enable row level security;

drop policy if exists "Checkout orders owner read" on public.checkout_orders;
create policy "Checkout orders owner read"
  on public.checkout_orders
  for select using (auth.uid() = user_id);

drop policy if exists "Checkout orders owner insert" on public.checkout_orders;
create policy "Checkout orders owner insert"
  on public.checkout_orders
  for insert with check (auth.uid() = user_id);

drop policy if exists "Checkout order items owner read" on public.checkout_order_items;
create policy "Checkout order items owner read"
  on public.checkout_order_items
  for select using (
    exists (
      select 1
      from public.checkout_orders
      where checkout_orders.id = checkout_order_items.order_id
        and checkout_orders.user_id = auth.uid()
    )
  );

drop policy if exists "Checkout order items owner insert" on public.checkout_order_items;
create policy "Checkout order items owner insert"
  on public.checkout_order_items
  for insert with check (
    exists (
      select 1
      from public.checkout_orders
      where checkout_orders.id = checkout_order_items.order_id
        and checkout_orders.user_id = auth.uid()
    )
  );
