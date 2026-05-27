alter table public.admin_brands
  add column if not exists use_custom_profile_metrics boolean default false,
  add column if not exists custom_profile_followers integer default 0,
  add column if not exists custom_profile_sold integer default 0,
  add column if not exists is_trusted_vendor boolean default false,
  add column if not exists trusted_badge_url text;

update public.admin_brands
set use_custom_profile_metrics = false
where use_custom_profile_metrics is null;

update public.admin_brands
set custom_profile_followers = 0
where custom_profile_followers is null or custom_profile_followers < 0;

update public.admin_brands
set custom_profile_sold = 0
where custom_profile_sold is null or custom_profile_sold < 0;

update public.admin_brands
set is_trusted_vendor = false
where is_trusted_vendor is null;

alter table public.admin_brands
  drop constraint if exists admin_brands_custom_profile_followers_check;

alter table public.admin_brands
  add constraint admin_brands_custom_profile_followers_check
  check (custom_profile_followers >= 0);

alter table public.admin_brands
  drop constraint if exists admin_brands_custom_profile_sold_check;

alter table public.admin_brands
  add constraint admin_brands_custom_profile_sold_check
  check (custom_profile_sold >= 0);
