alter table public.chat_messages
  add column if not exists vendor_received_at timestamptz;

alter table public.chat_messages
  add column if not exists vendor_read_at timestamptz;

create index if not exists chat_messages_vendor_read_idx
  on public.chat_messages (conversation_id, vendor_read_at, created_at desc);
