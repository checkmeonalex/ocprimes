alter table public.admin_brands
  add column if not exists require_product_review_for_publish boolean default false;

update public.admin_brands
set require_product_review_for_publish = false
where require_product_review_for_publish is null;
