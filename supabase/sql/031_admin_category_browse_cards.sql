create table if not exists public.admin_category_browse_cards (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.admin_categories(id) on delete cascade,
  segment text not null check (segment in ('all', 'men', 'women')),
  name text not null,
  link text,
  image_url text not null,
  image_key text,
  image_alt text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_category_browse_cards_category_idx
  on public.admin_category_browse_cards (category_id);

create index if not exists admin_category_browse_cards_segment_sort_idx
  on public.admin_category_browse_cards (category_id, segment, sort_order);

alter table public.admin_category_browse_cards enable row level security;

drop policy if exists "admin read browse cards" on public.admin_category_browse_cards;
create policy "admin read browse cards"
  on public.admin_category_browse_cards
  for select
  using (public.is_admin_user());

drop policy if exists "admin write browse cards" on public.admin_category_browse_cards;
create policy "admin write browse cards"
  on public.admin_category_browse_cards
  for all
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "public read browse cards" on public.admin_category_browse_cards;
create policy "public read browse cards"
  on public.admin_category_browse_cards
  for select
  using (
    exists (
      select 1
      from public.admin_categories categories
      where categories.id = admin_category_browse_cards.category_id
        and categories.is_active = true
    )
  );
