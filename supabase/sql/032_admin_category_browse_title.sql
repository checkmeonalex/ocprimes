alter table public.admin_categories
  add column if not exists browse_categories_title text;
