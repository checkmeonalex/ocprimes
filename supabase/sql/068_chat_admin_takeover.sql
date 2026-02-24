alter table public.chat_conversations
  add column if not exists admin_takeover_enabled boolean not null default false;

alter table public.chat_conversations
  add column if not exists admin_takeover_by uuid references auth.users(id) on delete set null;

alter table public.chat_conversations
  add column if not exists admin_takeover_at timestamptz;

create index if not exists chat_conversations_admin_takeover_idx
  on public.chat_conversations (admin_takeover_enabled, updated_at desc);
