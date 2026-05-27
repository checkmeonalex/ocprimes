alter table public.admin_categories
  add column if not exists home_catalog_title text,
  add column if not exists home_catalog_description text,
  add column if not exists home_catalog_filter_mode text default 'none',
  add column if not exists home_catalog_category_id uuid references public.admin_categories(id) on delete set null,
  add column if not exists home_catalog_tag_id uuid references public.admin_tags(id) on delete set null,
  add column if not exists home_catalog_limit integer default 12;

alter table public.admin_categories
  drop constraint if exists admin_categories_home_catalog_filter_mode_check;

alter table public.admin_categories
  add constraint admin_categories_home_catalog_filter_mode_check
  check (home_catalog_filter_mode in ('none', 'category', 'tag'));

alter table public.admin_categories
  drop constraint if exists admin_categories_home_catalog_limit_check;

alter table public.admin_categories
  add constraint admin_categories_home_catalog_limit_check
  check (home_catalog_limit between 1 and 30);
