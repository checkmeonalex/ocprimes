alter table public.admin_categories
  add column if not exists parent_id uuid references public.admin_categories(id) on delete set null;

alter table public.admin_categories
  add column if not exists sort_order integer not null default 0;

alter table public.admin_categories
  add constraint admin_categories_parent_not_self
  check (parent_id is null or parent_id <> id);

create index if not exists admin_categories_parent_id_idx on public.admin_categories (parent_id);
create index if not exists admin_categories_sort_order_idx on public.admin_categories (sort_order);
