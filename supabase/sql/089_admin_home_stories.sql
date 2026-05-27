create table if not exists public.admin_home_stories (
  id uuid primary key default gen_random_uuid(),
  home_page_id uuid not null references public.admin_home_pages(id) on delete cascade,
  title text not null,
  media_type text not null check (media_type in ('image', 'video')),
  media_url text not null,
  media_key text,
  media_alt text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists admin_home_stories_page_sort_idx
  on public.admin_home_stories (home_page_id, sort_order, created_at desc);

do $$
begin
  if to_regclass('public.admin_category_stories') is not null then
    insert into public.admin_home_stories (
      home_page_id,
      title,
      media_type,
      media_url,
      media_key,
      media_alt,
      sort_order
    )
    select
      hp.id,
      s.title,
      s.media_type,
      s.media_url,
      s.media_key,
      s.media_alt,
      s.sort_order
    from public.admin_home_pages hp
    join public.admin_category_stories s
      on s.category_id = hp.legacy_category_id
    where hp.page_key = 'home'
      and not exists (
        select 1
        from public.admin_home_stories existing
        where existing.home_page_id = hp.id
      );
  end if;
end;
$$;

alter table public.admin_home_stories enable row level security;

drop policy if exists "Admin home stories deny anon" on public.admin_home_stories;
create policy "Admin home stories deny anon"
  on public.admin_home_stories
  for all
  using (false)
  with check (false);
