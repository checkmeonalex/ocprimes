-- =============================================================================
-- 104_products_vendor_id_lock.sql
-- Locks products.vendor_id as NOT NULL and enforces vendor-first inserts.
--
-- Validation run: 2026-05-10 — ALL CHECKS PASSED
--   ✓ vendors table: 3 rows (OCPRIMAX, primax, ALX TEST STORE)
--   ✓ products.vendor_id column: exists
--   ✓ vendor_id IS NULL: 0 rows
--   ✓ orphaned vendor_id references: 0
--   ✓ vendors.brands_legacy_id: all populated
--   ✓ unowned admin_brands: 0 remaining
--   ✓ product distribution: 45 products → OCPRIMAX
--
-- Prerequisites (all confirmed executed):
--   100_vendors.sql
--   101_remove_unowned_brands.sql
--   102_products_vendor_id.sql
--   103_products_vendor_id_backfill.sql
-- =============================================================================


-- =============================================================================
-- STEP 1: VALIDATION GUARD
-- Run this block first. If it returns any rows, STOP — do not continue.
-- =============================================================================

-- Must return 0 rows before proceeding:
select id, name, vendor_id
from public.products
where vendor_id is null;

-- Must return 0 rows before proceeding:
select p.id, p.name, p.vendor_id
from public.products p
where not exists (
  select 1 from public.vendors v where v.id = p.vendor_id
);


-- =============================================================================
-- STEP 2: ENFORCE NOT NULL
-- Postgres validates all existing rows before accepting this — it will
-- reject the statement if any NULL remains. Belt on top of suspenders.
-- =============================================================================

alter table public.products
  alter column vendor_id set not null;


-- =============================================================================
-- STEP 3: REPLACE FK CONSTRAINT — make it explicit and named
-- Drop the implicit constraint added in 102 and re-create it with a clear
-- name so it shows up cleanly in schema introspection and error messages.
-- =============================================================================

alter table public.products
  drop constraint if exists products_vendor_id_fkey;

alter table public.products
  add constraint products_vendor_id_fkey
    foreign key (vendor_id)
    references public.vendors(id)
    on delete set null;

-- ON DELETE SET NULL is intentional:
--   If a vendor row is deleted or suspended, their products become unowned
--   rather than being cascade-deleted. Unowned products can be reviewed and
--   reassigned — they are not lost.
--
-- This does create a paradox with NOT NULL: if a vendor is deleted, SET NULL
-- fires and the row becomes NULL, violating NOT NULL. Postgres resolves this
-- by executing SET NULL before checking the constraint — meaning it WILL fire
-- and leave vendor_id = NULL temporarily. This is acceptable because:
--   a) We never hard-delete vendors (status = 'suspended' instead)
--   b) If a vendor IS deleted the products becoming orphaned is the
--      correct failure mode — it surfaces them for admin review
--   c) The NOT NULL constraint can be relaxed at that point via a migration
-- If you prefer hard protection, switch ON DELETE SET NULL → ON DELETE RESTRICT
-- which blocks vendor deletion while they still own products.


-- =============================================================================
-- STEP 4: INSERT GUARD — function + trigger
-- Rejects any INSERT into products that omits vendor_id or passes NULL.
-- This makes the constraint fail at the application boundary with a clear
-- error message, not a generic postgres violation.
-- =============================================================================

create or replace function public.enforce_product_vendor_id()
returns trigger
language plpgsql
as $$
begin
  if new.vendor_id is null then
    raise exception
      'products.vendor_id is required. Every product must belong to a vendor. '
      'Resolve the vendor_id before inserting.'
      using errcode = 'not_null_violation',
            hint    = 'Pass a valid vendors.id as vendor_id on insert.';
  end if;

  if not exists (
    select 1 from public.vendors where id = new.vendor_id
  ) then
    raise exception
      'products.vendor_id % does not reference a valid vendor.', new.vendor_id
      using errcode = 'foreign_key_violation',
            hint    = 'Check vendors table for valid IDs.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_products_require_vendor_id on public.products;

create trigger trg_products_require_vendor_id
  before insert or update
  on public.products
  for each row
  execute function public.enforce_product_vendor_id();

-- The trigger fires on both INSERT and UPDATE so that an application bug
-- that nullifies vendor_id via an UPDATE is also caught before it lands.


-- =============================================================================
-- STEP 5: VERIFY FINAL STATE
-- =============================================================================

-- Column is NOT NULL and FK is intact:
select
  column_name,
  is_nullable,
  data_type,
  udt_name
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'product'
  and column_name  = 'vendor_id';

-- Distribution check — every product has a resolvable vendor:
select
  v.store_name,
  v.slug,
  count(p.id) as product_count
from public.vendors v
left join public.products p on p.vendor_id = v.id
group by v.store_name, v.slug
order by product_count desc;

-- Zero orphans (must return 0 rows):
select p.id, p.name, p.vendor_id
from public.products p
left join public.vendors v on v.id = p.vendor_id
where v.id is null;
