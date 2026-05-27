alter table public.chat_conversations
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by_user_id uuid references auth.users(id) on delete set null;

create index if not exists chat_conversations_closed_at_idx
  on public.chat_conversations (closed_at);
