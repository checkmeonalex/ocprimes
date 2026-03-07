create table if not exists public.search_query_suggestions (
  normalized_query text primary key,
  query_text text not null,
  search_count integer not null default 1 check (search_count >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_searched_at timestamptz not null default now()
);

create index if not exists search_query_suggestions_count_idx
  on public.search_query_suggestions (search_count desc, last_searched_at desc);

alter table public.search_query_suggestions enable row level security;

drop policy if exists "Search query suggestions deny anon" on public.search_query_suggestions;
create policy "Search query suggestions deny anon"
  on public.search_query_suggestions
  for all
  using (false)
  with check (false);

create or replace function public.record_search_query(p_query_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_query_text text;
  v_normalized_query text;
begin
  v_query_text := trim(coalesce(p_query_text, ''));
  v_normalized_query := lower(regexp_replace(v_query_text, '\s+', ' ', 'g'));

  if v_query_text = '' or length(v_query_text) < 2 or length(v_query_text) > 120 then
    return;
  end if;

  insert into public.search_query_suggestions (
    normalized_query,
    query_text,
    search_count,
    updated_at,
    last_searched_at
  )
  values (
    v_normalized_query,
    v_query_text,
    1,
    now(),
    now()
  )
  on conflict (normalized_query)
  do update set
    query_text = excluded.query_text,
    search_count = public.search_query_suggestions.search_count + 1,
    updated_at = now(),
    last_searched_at = now();
end;
$$;

revoke all on function public.record_search_query(text) from public;
