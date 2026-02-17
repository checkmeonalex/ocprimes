create table if not exists public.customer_vendor_follows (
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid not null references public.admin_brands(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint customer_vendor_follows_pkey primary key (customer_user_id, brand_id)
);

create index if not exists customer_vendor_follows_brand_idx
  on public.customer_vendor_follows (brand_id);

create index if not exists customer_vendor_follows_customer_created_idx
  on public.customer_vendor_follows (customer_user_id, created_at desc);

alter table public.customer_vendor_follows enable row level security;

drop policy if exists "Customer vendor follows: read own" on public.customer_vendor_follows;
create policy "Customer vendor follows: read own"
  on public.customer_vendor_follows
  for select
  using (auth.uid() = customer_user_id);

drop policy if exists "Customer vendor follows: insert own customer" on public.customer_vendor_follows;
create policy "Customer vendor follows: insert own customer"
  on public.customer_vendor_follows
  for insert
  with check (
    auth.uid() = customer_user_id
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'customer'
    )
  );

drop policy if exists "Customer vendor follows: delete own customer" on public.customer_vendor_follows;
create policy "Customer vendor follows: delete own customer"
  on public.customer_vendor_follows
  for delete
  using (
    auth.uid() = customer_user_id
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'customer'
    )
  );
