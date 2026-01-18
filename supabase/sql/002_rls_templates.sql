-- Apply after creating tables like public.orders and public.customers.
-- These templates assume a "user_id" column for ownership.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders'
  ) THEN
    EXECUTE 'alter table public.orders enable row level security';

    EXECUTE $$
      create policy "Orders: owners can read" on public.orders
      for select using (auth.uid() = user_id)
    $$;

    EXECUTE $$
      create policy "Orders: admins can read" on public.orders
      for select using (
        exists (
          select 1 from public.profiles where id = auth.uid() and role = ''admin''
        )
      )
    $$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customers'
  ) THEN
    EXECUTE 'alter table public.customers enable row level security';

    EXECUTE $$
      create policy "Customers: owners can read" on public.customers
      for select using (auth.uid() = user_id)
    $$;

    EXECUTE $$
      create policy "Customers: admins can read" on public.customers
      for select using (
        exists (
          select 1 from public.profiles where id = auth.uid() and role = ''admin''
        )
      )
    $$;
  END IF;
END
$$;
