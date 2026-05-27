do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'product_reviews'
  ) then
    alter table public.product_reviews
      drop constraint if exists product_reviews_product_id_fkey;

    alter table public.product_reviews
      add constraint product_reviews_product_id_fkey
      foreign key (product_id)
      references public.products(id)
      on delete cascade;
  end if;
end
$$;
