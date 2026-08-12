alter table public.admin_brands
  add column if not exists whatsapp_buy_enabled boolean not null default false;
