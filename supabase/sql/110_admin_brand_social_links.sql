alter table public.admin_brands
  add column if not exists social_whatsapp text;

alter table public.admin_brands
  add column if not exists social_instagram_url text;

alter table public.admin_brands
  add column if not exists social_instagram_handle text;

alter table public.admin_brands
  add column if not exists social_facebook_url text;

alter table public.admin_brands
  add column if not exists social_facebook_handle text;

alter table public.admin_brands
  add column if not exists social_x_url text;

alter table public.admin_brands
  add column if not exists social_x_handle text;

alter table public.admin_brands
  add column if not exists social_twitch_url text;

alter table public.admin_brands
  add column if not exists social_twitch_handle text;

alter table public.admin_brands
  add column if not exists social_tiktok_url text;

alter table public.admin_brands
  add column if not exists social_tiktok_handle text;

alter table public.admin_brands
  add column if not exists social_pinterest_url text;

alter table public.admin_brands
  add column if not exists social_pinterest_handle text;
