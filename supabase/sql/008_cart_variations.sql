alter table public.cart_items
  add column if not exists selected_variation_id text,
  add column if not exists selected_variation_label text;

update public.cart_items
  set selected_variation_id = 'default'
  where selected_variation_id is null;

alter table public.cart_items
  alter column selected_variation_id set default 'default';

alter table public.cart_items
  drop constraint if exists cart_items_unique;

alter table public.cart_items
  add constraint cart_items_unique
  unique (cart_id, product_id, selected_variation_id, selected_color, selected_size);
