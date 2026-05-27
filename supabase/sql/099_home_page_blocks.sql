alter table admin_home_pages
  add column if not exists home_blocks jsonb not null default '[]'::jsonb;
