-- =============================================================================
-- 100_vendors.sql
-- Creates the `vendors` table as the new canonical ownership source.
-- admin_brands remains untouched. Migration data is mapped below.
-- DO NOT RUN until Phase 1 pre-flight checks are complete.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- STEP 1: Create the vendors table
-- -----------------------------------------------------------------------------

create table if not exists public.vendors (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null unique references auth.users(id) on delete restrict,
  slug            text        not null unique,
  store_name      text        not null,
  niche           text        not null default 'general',
  commission_rate numeric(5,4) not null default 0.10,
  status          text        not null default 'active',
  created_at      timestamptz not null default now(),

  constraint vendors_status_check
    check (status in ('pending', 'approved', 'active', 'suspended')),

  constraint vendors_commission_rate_check
    check (commission_rate >= 0 and commission_rate <= 1),

  constraint vendors_slug_format_check
    check (slug ~ '^[a-z0-9][a-z0-9\-]{1,62}[a-z0-9]$')
);

create index if not exists vendors_slug_idx       on public.vendors (slug);
create index if not exists vendors_user_id_idx    on public.vendors (user_id);
create index if not exists vendors_status_idx     on public.vendors (status);
create index if not exists vendors_niche_idx      on public.vendors (niche);
create index if not exists vendors_created_at_idx on public.vendors (created_at desc);

alter table public.vendors enable row level security;


-- -----------------------------------------------------------------------------
-- STEP 2: RLS policies
-- -----------------------------------------------------------------------------

-- Vendors can read their own row
drop policy if exists "Vendors: read own" on public.vendors;
create policy "Vendors: read own"
  on public.vendors
  for select
  using (auth.uid() = user_id);

-- Platform admins can read all
drop policy if exists "Vendors: admin read all" on public.vendors;
create policy "Vendors: admin read all"
  on public.vendors
  for select
  using (public.is_admin_user());

-- Platform admins can update any vendor row
drop policy if exists "Vendors: admin write all" on public.vendors;
create policy "Vendors: admin write all"
  on public.vendors
  for all
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- Public can read active/approved vendor names + slugs (needed for storefront routing)
drop policy if exists "Vendors: public read active" on public.vendors;
create policy "Vendors: public read active"
  on public.vendors
  for select
  using (status in ('active', 'approved'));


-- =============================================================================
-- MIGRATION MAP: admin_brands → vendors
-- =============================================================================
--
-- Column mapping from admin_brands to vendors:
--
--   admin_brands.id          → NOT mapped (vendors gets a fresh uuid)
--                              Link is maintained by brands_legacy_id below
--   admin_brands.created_by  → vendors.user_id
--   admin_brands.slug        → vendors.slug
--   admin_brands.name        → vendors.store_name
--   admin_brands.created_at  → vendors.created_at
--   vendor_requests.status   → vendors.status
--                              ('approved' → 'active', missing → 'active')
--   [no source]              → vendors.niche       (default 'general', set manually after)
--   [no source]              → vendors.commission_rate (default 0.10 platform-wide)
--
-- Columns that DO NOT map to vendors (belong in vendor_storefronts, Phase 3):
--   admin_brands.description
--   admin_brands.logo_url
--   admin_brands.banner_slider_urls / _keys / _mobile_urls / _mobile_keys / _links
--   admin_brands.storefront_filter_mode
--   admin_brands.storefront_filter_category_ids
--   admin_brands.storefront_filter_tag_ids
--   admin_brands.storefront_filter_title
--   admin_brands.storefront_filter_product_limit
--   admin_brands.storefront_blocks
--   admin_brands.storefront_section_order
--   admin_brands.banner_grid
--   admin_brands.collections_menu_mode
--   admin_brands.use_custom_profile_metrics
--   admin_brands.custom_profile_followers
--   admin_brands.custom_profile_sold
--   admin_brands.trusted_badge_url
--
-- Columns that map to vendors directly (identity-level, not layout):
--   admin_brands.is_trusted_vendor → vendors.is_trusted_vendor (add column below)
--   admin_brands.require_product_review_for_publish → vendor_settings (Phase 3)
--
-- SKIP rows where admin_brands.created_by IS NULL
-- (platform-created brands with no vendor user — handle manually)
--
-- =============================================================================


-- -----------------------------------------------------------------------------
-- STEP 3: Add brands_legacy_id for the transition period
--          This links vendors back to admin_brands so existing FK chains
--          (product_brand_links, customer_vendor_follows, etc.) keep working
--          until each table is migrated to vendor_id in Phase 2+.
-- -----------------------------------------------------------------------------

alter table public.vendors
  add column if not exists brands_legacy_id uuid references public.admin_brands(id) on delete set null;

create index if not exists vendors_brands_legacy_id_idx
  on public.vendors (brands_legacy_id)
  where brands_legacy_id is not null;

-- Also surface trusted status at the identity level
alter table public.vendors
  add column if not exists is_trusted boolean not null default false;


-- -----------------------------------------------------------------------------
-- STEP 4: Backfill vendors from admin_brands
--          Only rows where created_by IS NOT NULL (has a real vendor user).
--          Status resolved from vendor_requests where available.
-- -----------------------------------------------------------------------------

-- (DO NOT RUN — review output of the dry-run SELECT first)
--
-- Dry-run SELECT to verify the join before inserting:
--
-- select
--   b.id                   as brands_legacy_id,
--   b.created_by           as user_id,
--   b.slug                 as slug,
--   b.name                 as store_name,
--   'general'              as niche,
--   0.10                   as commission_rate,
--   coalesce(
--     case vr.status
--       when 'approved' then 'active'
--       when 'pending'  then 'pending'
--       when 'rejected' then 'suspended'
--       else 'active'
--     end,
--     'active'
--   )                      as status,
--   b.is_trusted_vendor    as is_trusted,
--   b.created_at           as created_at
-- from public.admin_brands b
-- left join public.vendor_requests vr on vr.user_id = b.created_by
-- where b.created_by is not null
-- order by b.created_at;

-- Actual insert (run only after dry-run confirms data is clean):

insert into public.vendors (
  brands_legacy_id,
  user_id,
  slug,
  store_name,
  niche,
  commission_rate,
  status,
  is_trusted,
  created_at
)
select
  b.id                   as brands_legacy_id,
  b.created_by           as user_id,
  b.slug                 as slug,
  b.name                 as store_name,
  'general'              as niche,
  0.10                   as commission_rate,
  coalesce(
    case vr.status
      when 'approved' then 'active'
      when 'pending'  then 'pending'
      when 'rejected' then 'suspended'
      else 'active'
    end,
    'active'
  )                      as status,
  coalesce(b.is_trusted_vendor, false) as is_trusted,
  b.created_at           as created_at
from public.admin_brands b
left join public.vendor_requests vr on vr.user_id = b.created_by
where b.created_by is not null
on conflict (user_id) do nothing;


-- -----------------------------------------------------------------------------
-- STEP 5: Verify — run these after insert to confirm correctness
-- -----------------------------------------------------------------------------

-- 1. Count should match admin_brands rows with created_by NOT NULL:
--    select count(*) from public.vendors;
--    select count(*) from public.admin_brands where created_by is not null;

-- 2. Find any admin_brands rows that did NOT migrate (created_by IS NULL):
--    select id, name, slug from public.admin_brands where created_by is null;
--    These are platform-created brands — assign user_id manually or archive.

-- 3. Confirm status distribution looks correct:
--    select status, count(*) from public.vendors group by status;

-- 4. Confirm no duplicate user_id (unique constraint should catch this,
--    but double-check):
--    select user_id, count(*) from public.vendors
--    group by user_id having count(*) > 1;
