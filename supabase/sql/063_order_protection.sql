alter table public.cart_items
  add column if not exists is_protected boolean not null default false;

create table if not exists public.order_protection_settings (
  id integer primary key default 1,
  protection_percentage numeric(6,5) not null default 0.02,
  minimum_fee numeric(12,2) not null default 100,
  maximum_fee numeric(12,2) not null default 2500,
  claim_window_hours integer not null default 48,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint order_protection_settings_single_row check (id = 1),
  constraint order_protection_settings_percentage_check check (protection_percentage > 0 and protection_percentage <= 1),
  constraint order_protection_settings_fee_bounds_check check (minimum_fee >= 0 and maximum_fee >= minimum_fee),
  constraint order_protection_settings_claim_window_check check (claim_window_hours >= 1 and claim_window_hours <= 720)
);

insert into public.order_protection_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.order_protection_settings enable row level security;

drop policy if exists "Order protection settings readable" on public.order_protection_settings;
create policy "Order protection settings readable"
  on public.order_protection_settings
  for select using (true);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'orders'
  ) then
    execute 'alter table public.orders add column if not exists protection_fee numeric(12,2) not null default 0';
    execute 'alter table public.orders add column if not exists protection_status text not null default ''unused''';
    execute 'alter table public.orders drop constraint if exists orders_protection_status_check';
    execute 'alter table public.orders add constraint orders_protection_status_check check (protection_status in (''active'', ''unused'', ''claimed'', ''expired''))';
  end if;
end $$;

create table if not exists public.order_protection_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id text not null,
  order_item_key text,
  status text not null default 'submitted',
  reason text,
  evidence_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  notes text,
  constraint order_protection_claims_status_check check (status in ('submitted', 'in_review', 'approved', 'rejected'))
);

create index if not exists order_protection_claims_user_created_idx
  on public.order_protection_claims (user_id, created_at desc);

create unique index if not exists order_protection_claims_order_item_unique
  on public.order_protection_claims (user_id, order_id, coalesce(order_item_key, ''));

alter table public.order_protection_claims enable row level security;

drop policy if exists "Order protection claims owner read" on public.order_protection_claims;
create policy "Order protection claims owner read"
  on public.order_protection_claims
  for select using (auth.uid() = user_id);

drop policy if exists "Order protection claims owner insert" on public.order_protection_claims;
create policy "Order protection claims owner insert"
  on public.order_protection_claims
  for insert with check (auth.uid() = user_id);

drop policy if exists "Order protection claims owner update" on public.order_protection_claims;
create policy "Order protection claims owner update"
  on public.order_protection_claims
  for update using (auth.uid() = user_id);
