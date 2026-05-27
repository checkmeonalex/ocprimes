drop policy if exists "Cart shipping progress settings insertable by admins" on public.cart_shipping_progress_settings;
create policy "Cart shipping progress settings insertable by admins"
  on public.cart_shipping_progress_settings
  for insert
  with check (public.is_admin_user());

drop policy if exists "Cart shipping progress settings updatable by admins" on public.cart_shipping_progress_settings;
create policy "Cart shipping progress settings updatable by admins"
  on public.cart_shipping_progress_settings
  for update
  using (public.is_admin_user())
  with check (public.is_admin_user());
