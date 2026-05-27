alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'vendor', 'customer'));

alter table public.user_roles
  drop constraint if exists user_roles_role_check;

alter table public.user_roles
  add constraint user_roles_role_check
  check (role in ('admin', 'vendor', 'customer'));

alter table public.products
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists products_created_by_idx on public.products (created_by);

alter table public.product_images
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists product_images_created_by_idx on public.product_images (created_by);

with ranked_brands as (
  select
    id,
    created_by,
    row_number() over (
      partition by created_by
      order by created_at asc nulls last, id asc
    ) as row_num
  from public.admin_brands
  where created_by is not null
)
update public.admin_brands as brands
set created_by = null
from ranked_brands
where brands.id = ranked_brands.id
  and ranked_brands.row_num > 1;

create unique index if not exists admin_brands_created_by_unique
  on public.admin_brands (created_by)
  where created_by is not null;
