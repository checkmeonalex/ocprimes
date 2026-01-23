with ranked as (
  select
    id,
    row_number() over (
      partition by
        cart_id,
        product_id,
        coalesce(selected_variation_id, 'default'),
        coalesce(selected_color, 'default'),
        coalesce(selected_size, 'default')
      order by updated_at desc, created_at desc
    ) as rn
  from public.cart_items
)
delete from public.cart_items
  where id in (select id from ranked where rn > 1);

update public.cart_items
  set selected_color = 'default'
  where selected_color is null;

update public.cart_items
  set selected_size = 'default'
  where selected_size is null;

alter table public.cart_items
  alter column selected_color set default 'default',
  alter column selected_size set default 'default';

alter table public.cart_items
  alter column selected_color set not null,
  alter column selected_size set not null;
