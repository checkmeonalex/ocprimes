-- Vendor profile metrics: rating, review count, follower growth %
alter table admin_brands
  add column if not exists custom_profile_rating     numeric(3,1) default 0,
  add column if not exists custom_profile_reviews    integer      default 0,
  add column if not exists followers_growth_pct      integer      default 0;
