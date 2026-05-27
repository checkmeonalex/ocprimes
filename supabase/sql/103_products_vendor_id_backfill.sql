-- =============================================================================
-- 103_products_vendor_id_backfill.sql
-- Populates products.vendor_id via the existing brand link chain:
--
--   products
--     → product_brand_links  (product_id = products.id)
--     → admin_brands         (id = product_brand_links.brand_id)
--     → vendors              (brands_legacy_id = admin_brands.id)
--
-- Prerequisites:
--   100_vendors.sql           (vendors table exists and is populated)
--   101_remove_unowned_brands.sql
--   102_products_vendor_id.sql (vendor_id column exists on products)
--
-- Live preview counts (run 2026-05-10 before migration):
--   Total products:               45
--   Will receive vendor_id:       45  (all via ocprimax brand)
--   Will remain NULL:              0
--   Multi-brand ambiguity:         0
-- =============================================================================


-- =============================================================================
-- STEP 1 — PREVIEW (run this first, read the numbers, then run Step 2)
-- =============================================================================

-- How many products vendor_id will be filled vs. remain NULL:
select
  count(*)                                              as total_products,
  count(*) filter (where p.vendor_id is not null)       as already_filled,
  count(distinct pbl.product_id)                        as will_be_filled,
  count(*) filter (
    where p.vendor_id is null
      and pbl.product_id is null
  )                                                     as will_remain_null
from public.products p
left join public.product_brand_links pbl on pbl.product_id = p.id
left join public.admin_brands b          on b.id = pbl.brand_id
left join public.vendors v               on v.brands_legacy_id = b.id;

-- Per-vendor breakdown — shows how many products each vendor will own:
select
  v.store_name,
  v.slug,
  v.id as vendor_id,
  count(distinct pbl.product_id) as product_count
from public.product_brand_links pbl
join public.admin_brands b on b.id = pbl.brand_id
join public.vendors v      on v.brands_legacy_id = b.id
group by v.store_name, v.slug, v.id
order by product_count desc;

-- Spot-check: show the first 5 products that will be updated
-- with their resolved vendor_id, so you can verify correctness:
select
  p.id          as product_id,
  p.name        as product_name,
  b.slug        as via_brand,
  v.store_name  as vendor_name,
  v.id          as resolves_to_vendor_id
from public.products p
join public.product_brand_links pbl on pbl.product_id = p.id
join public.admin_brands b          on b.id = pbl.brand_id
join public.vendors v               on v.brands_legacy_id = b.id
where p.vendor_id is null
order by p.created_at
limit 5;


-- =============================================================================
-- STEP 2 — BACKFILL UPDATE
-- Run only after Step 1 preview matches expectations.
-- =============================================================================

update public.products p
set
  vendor_id  = v.id,
  updated_at = now()
from public.product_brand_links pbl
join public.admin_brands b on b.id = pbl.brand_id
join public.vendors v      on v.brands_legacy_id = b.id
where p.id        = pbl.product_id
  and p.vendor_id is null;

-- If a product is linked to more than one owned brand, the join will
-- match the first row returned by the planner. This is safe here because
-- the live audit confirmed zero multi-brand products (count = 0).
-- When that changes, revisit with an explicit ORDER BY / DISTINCT ON.


-- =============================================================================
-- STEP 3 — VERIFY
-- =============================================================================

select
  count(*)                                            as total_products,
  count(*) filter (where vendor_id is not null)       as with_vendor_id,
  count(*) filter (where vendor_id is null)           as still_null
from public.products;

-- Expected after backfill:
--   total_products = 45
--   with_vendor_id = 45
--   still_null     = 0

-- Double-check referential integrity — should return 0 rows if all good:
select p.id, p.name
from public.products p
where p.vendor_id is not null
  and not exists (
    select 1 from public.vendors v where v.id = p.vendor_id
  );
