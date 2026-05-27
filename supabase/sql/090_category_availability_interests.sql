create table if not exists public.category_availability_interests (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.admin_categories(id) on delete cascade,
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  category_name text not null,
  category_slug text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint category_availability_interests_unique unique (category_id, requester_user_id)
);

create index if not exists category_availability_interests_category_idx
  on public.category_availability_interests (category_id, created_at desc);

create index if not exists category_availability_interests_created_idx
  on public.category_availability_interests (created_at desc);

create index if not exists category_availability_interests_requester_idx
  on public.category_availability_interests (requester_user_id, created_at desc);

create or replace function public.set_category_availability_interests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists category_availability_interests_set_updated_at
  on public.category_availability_interests;
create trigger category_availability_interests_set_updated_at
before update on public.category_availability_interests
for each row execute function public.set_category_availability_interests_updated_at();

create or replace function public.get_category_interest_dashboard_stats(
  p_current_start timestamptz,
  p_current_end timestamptz,
  p_previous_start timestamptz,
  p_previous_end timestamptz
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with scoped as (
    select
      category_id,
      category_name,
      category_slug,
      created_at
    from public.category_availability_interests
    where created_at < p_current_end
  ),
  totals as (
    select
      count(*)::int as total_interested,
      count(*) filter (
        where created_at >= p_current_start
          and created_at < p_current_end
      )::int as new_interested,
      count(*) filter (
        where created_at >= p_previous_start
          and created_at < p_previous_end
      )::int as previous_interested,
      count(distinct category_id)::int as categories_tracked
    from scoped
  ),
  ranked as (
    select
      category_id,
      max(category_name) as category_name,
      max(category_slug) as category_slug,
      count(*)::int as total_interested,
      count(*) filter (
        where created_at >= p_current_start
          and created_at < p_current_end
      )::int as new_interested
    from scoped
    group by category_id
    order by total_interested desc, max(created_at) desc
    limit 6
  )
  select jsonb_build_object(
    'total_interested', coalesce((select total_interested from totals), 0),
    'new_interested', coalesce((select new_interested from totals), 0),
    'previous_interested', coalesce((select previous_interested from totals), 0),
    'categories_tracked', coalesce((select categories_tracked from totals), 0),
    'top_categories', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'category_id', category_id,
          'category_name', category_name,
          'category_slug', category_slug,
          'total_interested', total_interested,
          'new_interested', new_interested
        )
        order by total_interested desc, category_name asc
      )
      from ranked
    ), '[]'::jsonb)
  );
$$;

alter table public.category_availability_interests enable row level security;

drop policy if exists "Category availability interests deny anon" on public.category_availability_interests;
create policy "Category availability interests deny anon"
  on public.category_availability_interests
  for all
  using (false)
  with check (false);

revoke all on public.category_availability_interests from public, anon, authenticated;
grant all on public.category_availability_interests to service_role;

revoke all on function public.get_category_interest_dashboard_stats(timestamptz, timestamptz, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.get_category_interest_dashboard_stats(timestamptz, timestamptz, timestamptz, timestamptz) to service_role;
