create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id text not null,
  name text not null,
  slug text,
  price numeric not null,
  original_price numeric,
  image text,
  selected_variation_id text not null default 'default',
  selected_variation_label text,
  selected_color text,
  selected_size text,
  quantity integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cart_items_unique unique (cart_id, product_id, selected_variation_id, selected_color, selected_size)
);

alter table public.carts enable row level security;
alter table public.cart_items enable row level security;

create policy "Carts: user can read" on public.carts
  for select using (auth.uid() = user_id);

create policy "Carts: user can insert" on public.carts
  for insert with check (auth.uid() = user_id);

create policy "Carts: user can update" on public.carts
  for update using (auth.uid() = user_id);

create policy "Carts: user can delete" on public.carts
  for delete using (auth.uid() = user_id);

create policy "Cart items: user can read" on public.cart_items
  for select using (
    exists (
      select 1 from public.carts where id = cart_id and user_id = auth.uid()
    )
  );

create policy "Cart items: user can insert" on public.cart_items
  for insert with check (
    exists (
      select 1 from public.carts where id = cart_id and user_id = auth.uid()
    )
  );

create policy "Cart items: user can update" on public.cart_items
  for update using (
    exists (
      select 1 from public.carts where id = cart_id and user_id = auth.uid()
    )
  );

create policy "Cart items: user can delete" on public.cart_items
  for delete using (
    exists (
      select 1 from public.carts where id = cart_id and user_id = auth.uid()
    )
  );
