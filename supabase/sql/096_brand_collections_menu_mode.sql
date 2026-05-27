-- Adds collections_menu_mode to admin_brands.
-- 'grouped' = root → sub drill-down panel (default)
-- 'flat'    = all categories listed at once
alter table admin_brands
  add column if not exists collections_menu_mode text not null default 'grouped'
    check (collections_menu_mode in ('grouped', 'flat'));
