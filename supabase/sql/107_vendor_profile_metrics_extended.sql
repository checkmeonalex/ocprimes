-- Extended vendor profile metrics: manual toggle per stat
alter table admin_brands
  add column if not exists use_custom_rating            boolean      default false,
  add column if not exists custom_profile_rating        numeric(3,1) default 0,
  add column if not exists custom_profile_reviews       integer      default 0,
  add column if not exists use_custom_orders            boolean      default false,
  add column if not exists custom_profile_sold_display  integer      default 0,
  add column if not exists use_custom_followers_growth  boolean      default false,
  add column if not exists followers_growth_pct         integer      default 0;
