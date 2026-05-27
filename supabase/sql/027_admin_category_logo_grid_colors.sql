alter table public.admin_category_logo_grids
  add column if not exists title_bg_color text,
  add column if not exists title_text_color text;
