create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  vendor_user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_message_preview text,
  constraint chat_conversations_distinct_participants
    check (customer_user_id <> vendor_user_id)
);

create unique index if not exists chat_conversations_unique_pair_product
  on public.chat_conversations (customer_user_id, vendor_user_id, product_id);

create index if not exists chat_conversations_customer_updated_idx
  on public.chat_conversations (customer_user_id, updated_at desc);

create index if not exists chat_conversations_vendor_updated_idx
  on public.chat_conversations (vendor_user_id, updated_at desc);

create index if not exists chat_conversations_product_idx
  on public.chat_conversations (product_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint chat_messages_body_not_empty check (char_length(trim(body)) > 0),
  constraint chat_messages_body_length check (char_length(body) <= 2000)
);

create index if not exists chat_messages_conversation_created_idx
  on public.chat_messages (conversation_id, created_at desc);

create index if not exists chat_messages_sender_created_idx
  on public.chat_messages (sender_user_id, created_at desc);

alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

create or replace function public.is_chat_participant(target_conversation_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.chat_conversations
    where id = target_conversation_id
      and auth.uid() in (customer_user_id, vendor_user_id)
  );
$$;

create or replace function public.touch_chat_conversation_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_conversations
  set
    updated_at = new.created_at,
    last_message_at = new.created_at,
    last_message_preview = left(regexp_replace(new.body, '\\s+', ' ', 'g'), 120)
  where id = new.conversation_id;

  return new;
end;
$$;

create or replace function public.trim_chat_messages_per_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.chat_messages
  where id in (
    select id
    from public.chat_messages
    where conversation_id = new.conversation_id
    order by created_at desc, id desc
    offset 500
  );

  return new;
end;
$$;

drop trigger if exists chat_messages_touch_conversation_trigger on public.chat_messages;
create trigger chat_messages_touch_conversation_trigger
  after insert on public.chat_messages
  for each row
  execute function public.touch_chat_conversation_metadata();

drop trigger if exists chat_messages_retention_trigger on public.chat_messages;
create trigger chat_messages_retention_trigger
  after insert on public.chat_messages
  for each row
  execute function public.trim_chat_messages_per_conversation();

drop policy if exists "Chat conversations: participants read" on public.chat_conversations;
create policy "Chat conversations: participants read"
  on public.chat_conversations
  for select
  using (auth.uid() in (customer_user_id, vendor_user_id));

drop policy if exists "Chat conversations: participants insert" on public.chat_conversations;
create policy "Chat conversations: participants insert"
  on public.chat_conversations
  for insert
  with check (
    auth.uid() in (customer_user_id, vendor_user_id)
    and customer_user_id <> vendor_user_id
  );

drop policy if exists "Chat messages: participants read" on public.chat_messages;
create policy "Chat messages: participants read"
  on public.chat_messages
  for select
  using (public.is_chat_participant(conversation_id));

drop policy if exists "Chat messages: participants insert" on public.chat_messages;
create policy "Chat messages: participants insert"
  on public.chat_messages
  for insert
  with check (
    auth.uid() = sender_user_id
    and public.is_chat_participant(conversation_id)
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'chat_messages'
    ) THEN
      EXECUTE 'alter publication supabase_realtime add table public.chat_messages';
    END IF;
  END IF;
END
$$;
