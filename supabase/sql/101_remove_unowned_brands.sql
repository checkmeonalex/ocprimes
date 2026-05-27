-- =============================================================================
-- 101_remove_unowned_brands.sql
-- Removes 3 admin_brands rows that have no vendor user (created_by IS NULL)
-- and cannot migrate into the vendors table.
--
-- Preflight audit run: 2026-05-10
-- Checks passed:
--   ✓ No product_brand_links references
--   ✓ No customer_vendor_follows references
--   ✓ No R2 media assets (logo, banners, storefront_blocks, banner_grid)
--   ✓ No vendor_requests references
--   ✓ No other FK dependencies
--
-- Safe to run BEFORE 100_vendors.sql.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- STEP 1: Verify targets still match expectations before deleting
--         Run this SELECT first — confirm 3 rows, all with created_by IS NULL.
-- -----------------------------------------------------------------------------

select
  id,
  name,
  slug,
  created_by,
  created_at
from public.admin_brands
where id in (
  '29d2b93a-404a-41a0-8cc1-3e4b756dd4d7', -- TEST 1
  '1210c4ee-9b2b-42db-8759-38c92575a359', -- JUMIA
  '799713f0-a3a3-4645-8593-b72968c07af4'  -- JIJI
);

-- Expected output: 3 rows, created_by = NULL on all three.
-- If any row shows a non-null created_by, STOP — do not run the DELETE.


-- -----------------------------------------------------------------------------
-- STEP 2: Safety guard — abort if any of these brands now have products
--         This returns 0 rows if safe. If it returns any rows, stop.
-- -----------------------------------------------------------------------------

select
  pbl.brand_id,
  b.name,
  count(pbl.product_id) as linked_products
from public.product_brand_links pbl
join public.admin_brands b on b.id = pbl.brand_id
where pbl.brand_id in (
  '29d2b93a-404a-41a0-8cc1-3e4b756dd4d7',
  '1210c4ee-9b2b-42db-8759-38c92575a359',
  '799713f0-a3a3-4645-8593-b72968c07af4'
)
group by pbl.brand_id, b.name;

-- Expected output: 0 rows.
-- If any rows appear, products have been linked since the audit — do NOT delete.


-- -----------------------------------------------------------------------------
-- STEP 3: The DELETE
--         Run only after both SELECTs above confirm clean state.
-- -----------------------------------------------------------------------------

delete from public.admin_brands
where id in (
  '29d2b93a-404a-41a0-8cc1-3e4b756dd4d7', -- TEST 1   / test-12
  '1210c4ee-9b2b-42db-8759-38c92575a359', -- JUMIA    / jumia
  '799713f0-a3a3-4645-8593-b72968c07af4'  -- JIJI     / jiji
)
and created_by is null;                   -- extra guard: never delete owned brands

-- The `and created_by is null` clause means this DELETE is a no-op if any of
-- these rows has had an owner assigned since the audit was run. Belt and
-- suspenders — it cannot accidentally remove a real vendor.


-- -----------------------------------------------------------------------------
-- STEP 4: Verify the delete
-- -----------------------------------------------------------------------------

select
  count(*) as remaining_brands,
  count(*) filter (where created_by is null) as unowned_brands
from public.admin_brands;

-- Expected: remaining_brands = 3, unowned_brands = 0.
