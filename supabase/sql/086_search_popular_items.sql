create table if not exists public.search_popular_items (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(trim(text)) between 1 and 80),
  image_url text not null check (char_length(trim(image_url)) between 1 and 2048),
  target_url text not null check (char_length(trim(target_url)) between 1 and 2048),
  sort_order integer not null default 0 check (sort_order >= 0 and sort_order <= 9999),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists search_popular_items_active_sort_idx
  on public.search_popular_items (is_active, sort_order, updated_at desc);

alter table public.search_popular_items enable row level security;

drop policy if exists "Search popular items deny anon" on public.search_popular_items;
create policy "Search popular items deny anon"
  on public.search_popular_items
  for all
  using (false)
  with check (false);
