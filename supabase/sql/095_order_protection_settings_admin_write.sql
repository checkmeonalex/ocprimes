drop policy if exists "Order protection settings insertable by admins" on public.order_protection_settings;
create policy "Order protection settings insertable by admins"
  on public.order_protection_settings
  for insert
  with check (public.is_admin_user());

drop policy if exists "Order protection settings updatable by admins" on public.order_protection_settings;
create policy "Order protection settings updatable by admins"
  on public.order_protection_settings
  for update
  using (public.is_admin_user())
  with check (public.is_admin_user());
