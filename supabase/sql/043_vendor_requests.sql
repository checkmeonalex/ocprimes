create table if not exists public.vendor_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  phone text not null,
  brand_name text not null,
  brand_slug text not null,
  shipping_country text not null,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text,
  constraint vendor_requests_status_check check (status in ('pending', 'approved', 'rejected')),
  constraint vendor_requests_user_unique unique (user_id),
  constraint vendor_requests_brand_slug_unique unique (brand_slug)
);

create index if not exists vendor_requests_status_idx on public.vendor_requests (status);
create index if not exists vendor_requests_requested_at_idx on public.vendor_requests (requested_at desc);

alter table public.vendor_requests enable row level security;

drop policy if exists "Vendor requests: insert own" on public.vendor_requests;
create policy "Vendor requests: insert own"
  on public.vendor_requests
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Vendor requests: update own pending" on public.vendor_requests;
create policy "Vendor requests: update own pending"
  on public.vendor_requests
  for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "Vendor requests: read own" on public.vendor_requests;
create policy "Vendor requests: read own"
  on public.vendor_requests
  for select
  using (auth.uid() = user_id);

drop policy if exists "Vendor requests: admins can read" on public.vendor_requests;
create policy "Vendor requests: admins can read"
  on public.vendor_requests
  for select
  using (public.is_admin_user());

drop policy if exists "Vendor requests: admins can update" on public.vendor_requests;
create policy "Vendor requests: admins can update"
  on public.vendor_requests
  for update
  using (public.is_admin_user())
  with check (public.is_admin_user());
