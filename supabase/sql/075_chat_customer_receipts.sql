alter table public.chat_messages
  add column if not exists customer_received_at timestamptz;

alter table public.chat_messages
  add column if not exists customer_read_at timestamptz;

create index if not exists chat_messages_customer_read_idx
  on public.chat_messages (conversation_id, customer_read_at, created_at desc);
