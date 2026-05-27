create table if not exists public.vendor_category_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  parent_id uuid references public.admin_categories(id) on delete set null,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text,
  approved_category_id uuid references public.admin_categories(id) on delete set null,
  constraint vendor_category_requests_status_check
    check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists vendor_category_requests_requester_status_idx
  on public.vendor_category_requests (requester_user_id, status, requested_at desc);

create index if not exists vendor_category_requests_status_idx
  on public.vendor_category_requests (status, requested_at desc);

create unique index if not exists vendor_category_requests_pending_slug_unique
  on public.vendor_category_requests (slug)
  where status = 'pending';

create table if not exists public.vendor_product_pending_category_requests (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  category_request_id uuid not null references public.vendor_category_requests(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint vendor_product_pending_category_requests_unique
    unique (product_id, category_request_id)
);

create index if not exists vendor_product_pending_category_requests_product_idx
  on public.vendor_product_pending_category_requests (product_id);

create index if not exists vendor_product_pending_category_requests_request_idx
  on public.vendor_product_pending_category_requests (category_request_id);

