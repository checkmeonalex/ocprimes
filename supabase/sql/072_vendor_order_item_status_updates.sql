create table if not exists public.checkout_order_item_vendor_updates (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.checkout_orders(id) on delete cascade,
  order_item_id uuid not null references public.checkout_order_items(id) on delete cascade,
  vendor_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null
    check (status in ('item_not_available', 'packaged_ready_for_shipment', 'handed_to_delivery', 'delivered')),
  note text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists checkout_order_item_vendor_updates_order_item_created_idx
  on public.checkout_order_item_vendor_updates (order_item_id, created_at desc);

create index if not exists checkout_order_item_vendor_updates_order_created_idx
  on public.checkout_order_item_vendor_updates (order_id, created_at desc);

create index if not exists checkout_order_item_vendor_updates_vendor_created_idx
  on public.checkout_order_item_vendor_updates (vendor_user_id, created_at desc);

alter table public.checkout_order_item_vendor_updates enable row level security;

drop policy if exists "Vendor updates owner read" on public.checkout_order_item_vendor_updates;
create policy "Vendor updates owner read"
  on public.checkout_order_item_vendor_updates
  for select
  using (auth.uid() = vendor_user_id);

drop policy if exists "Vendor updates owner insert" on public.checkout_order_item_vendor_updates;
create policy "Vendor updates owner insert"
  on public.checkout_order_item_vendor_updates
  for insert
  with check (auth.uid() = vendor_user_id);

