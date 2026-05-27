alter table public.chat_conversations
  add column if not exists closed_reason text;

create index if not exists chat_conversations_closed_reason_idx
  on public.chat_conversations (closed_reason);
