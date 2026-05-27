create table if not exists public.admin_home_browse_cards (
  id uuid primary key default gen_random_uuid(),
  home_page_id uuid not null references public.admin_home_pages(id) on delete cascade,
  segment text not null check (segment in ('all', 'men', 'women')),
  name text not null,
  link text,
  image_url text not null,
  image_key text,
  image_alt text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists admin_home_browse_cards_page_sort_idx
  on public.admin_home_browse_cards (home_page_id, segment, sort_order, created_at desc);

insert into public.admin_home_browse_cards (
  home_page_id,
  segment,
  name,
  link,
  image_url,
  image_key,
  image_alt,
  sort_order
)
select
  hp.id,
  bc.segment,
  bc.name,
  bc.link,
  bc.image_url,
  bc.image_key,
  bc.image_alt,
  bc.sort_order
from public.admin_home_pages hp
join public.admin_category_browse_cards bc
  on bc.category_id = hp.legacy_category_id
where hp.page_key = 'home'
  and not exists (
    select 1
    from public.admin_home_browse_cards existing
    where existing.home_page_id = hp.id
  );

alter table public.admin_home_browse_cards enable row level security;

drop policy if exists "Admin home browse cards deny anon" on public.admin_home_browse_cards;
create policy "Admin home browse cards deny anon"
  on public.admin_home_browse_cards
  for all
  using (false)
  with check (false);
