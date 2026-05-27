create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  visibility text not null default 'private',
  share_token uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wishlists_visibility_check check (visibility in ('private', 'invite', 'public', 'unlisted'))
);

create index if not exists wishlists_user_id_idx on public.wishlists (user_id);
create index if not exists wishlists_visibility_idx on public.wishlists (visibility);

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  product_name text not null,
  product_slug text not null,
  product_price numeric(12,2) not null default 0,
  product_image text,
  created_at timestamptz not null default now(),
  constraint wishlist_items_unique unique (wishlist_id, product_id)
);

create index if not exists wishlist_items_list_idx on public.wishlist_items (wishlist_id);

create table if not exists public.wishlist_invites (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  invited_user_id uuid references auth.users(id) on delete cascade,
  invited_email text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint wishlist_invites_status_check check (status in ('pending', 'accepted', 'revoked'))
);

create index if not exists wishlist_invites_list_idx on public.wishlist_invites (wishlist_id);

alter table public.wishlists enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.wishlist_invites enable row level security;

drop policy if exists "wishlists owner read" on public.wishlists;
create policy "wishlists owner read"
  on public.wishlists
  for select
  using (auth.uid() = user_id);

drop policy if exists "wishlists owner insert" on public.wishlists;
create policy "wishlists owner insert"
  on public.wishlists
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "wishlists owner update" on public.wishlists;
create policy "wishlists owner update"
  on public.wishlists
  for update
  using (auth.uid() = user_id);

drop policy if exists "wishlists owner delete" on public.wishlists;
create policy "wishlists owner delete"
  on public.wishlists
  for delete
  using (auth.uid() = user_id);

drop policy if exists "wishlists invited read" on public.wishlists;

drop policy if exists "wishlist items owner read" on public.wishlist_items;
create policy "wishlist items owner read"
  on public.wishlist_items
  for select
  using (
    exists (
      select 1 from public.wishlists
      where wishlists.id = wishlist_items.wishlist_id
        and wishlists.user_id = auth.uid()
    )
  );

drop policy if exists "wishlist items owner insert" on public.wishlist_items;
create policy "wishlist items owner insert"
  on public.wishlist_items
  for insert
  with check (
    exists (
      select 1 from public.wishlists
      where wishlists.id = wishlist_items.wishlist_id
        and wishlists.user_id = auth.uid()
    )
  );

drop policy if exists "wishlist items owner delete" on public.wishlist_items;
create policy "wishlist items owner delete"
  on public.wishlist_items
  for delete
  using (
    exists (
      select 1 from public.wishlists
      where wishlists.id = wishlist_items.wishlist_id
        and wishlists.user_id = auth.uid()
    )
  );

drop policy if exists "wishlist items invited read" on public.wishlist_items;

drop policy if exists "wishlist invites owner read" on public.wishlist_invites;
create policy "wishlist invites owner read"
  on public.wishlist_invites
  for select
  using (
    exists (
      select 1 from public.wishlists
      where wishlists.id = wishlist_invites.wishlist_id
        and wishlists.user_id = auth.uid()
    )
  );

drop policy if exists "wishlist invites owner write" on public.wishlist_invites;
create policy "wishlist invites owner write"
  on public.wishlist_invites
  for insert
  with check (
    exists (
      select 1 from public.wishlists
      where wishlists.id = wishlist_invites.wishlist_id
        and wishlists.user_id = auth.uid()
    )
  );

drop policy if exists "wishlist invites owner update" on public.wishlist_invites;
create policy "wishlist invites owner update"
  on public.wishlist_invites
  for update
  using (
    exists (
      select 1 from public.wishlists
      where wishlists.id = wishlist_invites.wishlist_id
        and wishlists.user_id = auth.uid()
    )
  );

drop policy if exists "wishlist invites accept by email" on public.wishlist_invites;
create policy "wishlist invites accept by email"
  on public.wishlist_invites
  for update
  using (
    lower(wishlist_invites.invited_email) = lower((auth.jwt() ->> 'email'))
  );

create or replace function public.get_shared_wishlist(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'wishlist', jsonb_build_object(
      'id', w.id,
      'name', w.name,
      'visibility', w.visibility
    ),
    'items', coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id,
      'product_id', i.product_id,
      'product_name', i.product_name,
      'product_slug', i.product_slug,
      'product_price', i.product_price,
      'product_image', i.product_image,
      'created_at', i.created_at
    ) order by i.created_at desc) filter (where i.id is not null), '[]'::jsonb)
  )
  into result
  from public.wishlists w
  left join public.wishlist_items i on i.wishlist_id = w.id
  where w.share_token = p_token
    and w.visibility in ('public', 'unlisted')
  group by w.id;

  return result;
end;
$$;

grant execute on function public.get_shared_wishlist(uuid) to anon, authenticated;
