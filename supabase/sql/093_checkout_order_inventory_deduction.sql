alter table public.checkout_orders
  add column if not exists inventory_deducted_at timestamptz,
  add column if not exists inventory_deduction_issues jsonb not null default '[]'::jsonb;

create or replace function public.deduct_checkout_order_inventory(target_order_id uuid)
returns table (
  already_deducted boolean,
  deducted_at timestamptz,
  issues jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.checkout_orders%rowtype;
  issue_rows jsonb := '[]'::jsonb;
  item_record record;
  updated_product record;
  current_stock integer;
begin
  select *
  into order_row
  from public.checkout_orders
  where id = target_order_id
  for update;

  if not found then
    raise exception 'checkout order not found';
  end if;

  if order_row.inventory_deducted_at is not null then
    return query
    select true, order_row.inventory_deducted_at, coalesce(order_row.inventory_deduction_issues, '[]'::jsonb);
    return;
  end if;

  for item_record in
    select
      product_id,
      sum(quantity)::integer as quantity,
      max(name) as name
    from public.checkout_order_items
    where order_id = target_order_id
    group by product_id
  loop
    if item_record.product_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      issue_rows := issue_rows || jsonb_build_array(
        jsonb_build_object(
          'product_id', item_record.product_id,
          'name', item_record.name,
          'quantity', item_record.quantity,
          'reason', 'invalid_product_id'
        )
      );
      continue;
    end if;

    update public.products
    set
      stock_quantity = stock_quantity - item_record.quantity,
      updated_at = now()
    where id = item_record.product_id::uuid
      and stock_quantity >= item_record.quantity
    returning id, stock_quantity into updated_product;

    if found then
      continue;
    end if;

    select stock_quantity
    into current_stock
    from public.products
    where id = item_record.product_id::uuid;

    issue_rows := issue_rows || jsonb_build_array(
      jsonb_build_object(
        'product_id', item_record.product_id,
        'name', item_record.name,
        'quantity', item_record.quantity,
        'available_stock', greatest(0, coalesce(current_stock, 0)),
        'reason', case when current_stock is null then 'product_not_found' else 'insufficient_stock' end
      )
    );
  end loop;

  update public.checkout_orders
  set
    inventory_deducted_at = now(),
    inventory_deduction_issues = issue_rows,
    updated_at = now()
  where id = target_order_id
  returning inventory_deducted_at, inventory_deduction_issues
  into deducted_at, issues;

  return query
  select false, deducted_at, issues;
end;
$$;

revoke all on function public.deduct_checkout_order_inventory(uuid) from public;
grant execute on function public.deduct_checkout_order_inventory(uuid) to service_role;
