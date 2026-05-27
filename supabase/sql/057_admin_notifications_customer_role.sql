alter table public.admin_notifications
  drop constraint if exists admin_notifications_recipient_role_check;

alter table public.admin_notifications
  add constraint admin_notifications_recipient_role_check
  check (recipient_role in ('admin', 'vendor', 'customer'));
