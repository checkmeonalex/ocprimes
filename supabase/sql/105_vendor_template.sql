-- Vendor storefront template selection
-- Controls which visual template is used for a vendor's storefront, catalog, and product pages.
-- Default is 'default' (the original design). Additional templates added without breaking existing stores.

ALTER TABLE admin_brands
  ADD COLUMN IF NOT EXISTS template TEXT NOT NULL DEFAULT 'default';

-- Optional: constrain to known template IDs at the DB level.
-- Commented out for now so new templates can be rolled out without a migration.
-- ALTER TABLE admin_brands
--   ADD CONSTRAINT admin_brands_template_check
--   CHECK (template IN ('default', 'prestige'));
