alter table public.carts
  add column if not exists cart_version bigint not null default 1;

create table if not exists public.cart_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  item_id uuid,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  constraint cart_idempotency_unique unique (cart_id, idempotency_key)
);

create index if not exists cart_idempotency_cart_idx
  on public.cart_idempotency_keys(cart_id);

alter table public.cart_idempotency_keys enable row level security;

drop policy if exists "Cart idempotency: user can read" on public.cart_idempotency_keys;
create policy "Cart idempotency: user can read"
  on public.cart_idempotency_keys
  for select using (
    exists (
      select 1 from public.carts where id = cart_id and user_id = auth.uid()
    )
  );

drop policy if exists "Cart idempotency: user can insert" on public.cart_idempotency_keys;
create policy "Cart idempotency: user can insert"
  on public.cart_idempotency_keys
  for insert with check (
    exists (
      select 1 from public.carts where id = cart_id and user_id = auth.uid()
    )
  );
