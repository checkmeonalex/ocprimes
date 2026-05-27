create table if not exists public.location_suggestion_cache (
  cache_key text primary key,
  field text not null check (field in ('state', 'city')),
  query_text text not null,
  country text,
  state text,
  suggestions text[] not null default '{}',
  source text not null default 'nominatim',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists location_suggestion_cache_lookup_idx
  on public.location_suggestion_cache (field, country, state, query_text);

create index if not exists location_suggestion_cache_expires_idx
  on public.location_suggestion_cache (expires_at);

alter table public.location_suggestion_cache enable row level security;

drop policy if exists "Location suggestion cache deny anon" on public.location_suggestion_cache;
create policy "Location suggestion cache deny anon"
  on public.location_suggestion_cache
  for all
  using (false)
  with check (false);

