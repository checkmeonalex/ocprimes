create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null,
  recipient_role text not null check (recipient_role in ('admin', 'vendor')),
  title text not null,
  message text not null,
  type text not null default 'system',
  severity text not null default 'info' check (severity in ('info', 'success', 'warning', 'error')),
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists admin_notifications_recipient_user_created_idx
  on public.admin_notifications (recipient_user_id, created_at desc);

create index if not exists admin_notifications_recipient_unread_idx
  on public.admin_notifications (recipient_user_id, is_read, created_at desc);

