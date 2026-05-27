alter table public.products
  add column if not exists deal_expires_at timestamptz;

create index if not exists products_deal_expires_at_idx
  on public.products (deal_expires_at);
