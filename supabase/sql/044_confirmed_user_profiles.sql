create or replace function public.sync_confirmed_user_profile(user_row auth.users)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if user_row.email_confirmed_at is null then
    return;
  end if;

  insert into public.profiles (id, role)
  values (user_row.id, 'customer')
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (user_row.id, 'customer')
  on conflict (user_id) do nothing;

  if coalesce(user_row.raw_user_meta_data ->> 'admin_request', '') = 'true' then
    insert into public.admin_requests (user_id, email, status)
    values (user_row.id, user_row.email, 'pending')
    on conflict (user_id) do nothing;
  end if;
end;
$$;

alter function public.sync_confirmed_user_profile(auth.users) owner to postgres;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_confirmed_user_profile(new);
  return new;
end;
$$;

alter function public.handle_new_user() owner to postgres;

create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform public.sync_confirmed_user_profile(new);
  end if;
  return new;
end;
$$;

alter function public.handle_user_confirmed() owner to postgres;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute procedure public.handle_user_confirmed();

delete from public.admin_requests ar
using auth.users u
where ar.user_id = u.id
  and u.email_confirmed_at is null;

delete from public.user_roles ur
using auth.users u
where ur.user_id = u.id
  and u.email_confirmed_at is null
  and ur.role = 'customer';

delete from public.profiles p
using auth.users u
where p.id = u.id
  and u.email_confirmed_at is null
  and p.role = 'customer';
