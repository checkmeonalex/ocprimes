alter table public.wishlist_items
  drop constraint if exists wishlist_items_unique;

alter table public.wishlist_items
  alter column product_id type text using product_id::text;

alter table public.wishlist_items
  add constraint wishlist_items_unique unique (wishlist_id, product_id);
