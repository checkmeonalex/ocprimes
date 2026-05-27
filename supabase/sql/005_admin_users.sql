create or replace function public.is_admin_user()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.list_admin_users()
returns table (
  id uuid,
  email text,
  created_at timestamptz,
  role text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'not authorized';
  end if;

  return query
  select
    u.id::uuid,
    u.email::text,
    u.created_at::timestamptz,
    coalesce(p.role, 'customer')::text as role
  from auth.users u
  left join public.user_roles p on p.user_id = u.id
  order by u.created_at desc;
end;
$$;

create or replace function public.delete_admin_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'not authorized';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'cannot delete self';
  end if;

  delete from auth.users where id = target_user_id;
end;
$$;

alter function public.list_admin_users() owner to postgres;
alter function public.delete_admin_user(uuid) owner to postgres;
