-- =============================================================================
-- 102_products_vendor_id.sql
-- Adds nullable vendor_id to products table.
--
-- Prerequisites:
--   101_remove_unowned_brands.sql  (removes TEST 1, JUMIA, JIJI)
--   100_vendors.sql                (creates vendors table)
--
-- This migration is deliberately non-destructive:
--   - vendor_id is nullable — existing rows are not broken
--   - product_brand_links is NOT touched
--   - Backfill is in a separate file: 103_products_vendor_id_backfill.sql
-- =============================================================================


-- -----------------------------------------------------------------------------
-- STEP 1: Add the column
-- -----------------------------------------------------------------------------

alter table public.products
  add column if not exists vendor_id uuid
    references public.vendors(id)
    on delete set null;

-- on delete set null: if a vendor row is ever removed, products become
-- unowned rather than being cascade-deleted. Intentional — products are
-- valuable records even if a vendor is suspended.


-- -----------------------------------------------------------------------------
-- STEP 2: Index
-- -----------------------------------------------------------------------------

create index if not exists products_vendor_id_idx
  on public.products (vendor_id);

-- Partial index for unowned products (vendor_id IS NULL).
-- Lets you quickly audit how many products still need backfilling.
create index if not exists products_vendor_id_null_idx
  on public.products (id)
  where vendor_id is null;


-- -----------------------------------------------------------------------------
-- STEP 3: Verify
-- -----------------------------------------------------------------------------

-- Run after migration to confirm:
select
  count(*)                                      as total_products,
  count(*) filter (where vendor_id is not null) as with_vendor_id,
  count(*) filter (where vendor_id is null)     as pending_backfill
from public.products;

-- Expected immediately after this migration (before backfill):
--   total_products   = 45
--   with_vendor_id   = 0
--   pending_backfill = 45
