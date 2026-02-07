alter table public.admin_categories
  add column if not exists image_url text,
  add column if not exists image_alt text,
  add column if not exists is_active boolean not null default true;

create index if not exists admin_categories_active_idx on public.admin_categories (is_active);

do $$
begin
  create policy "Public categories: select active" on public.admin_categories
    for select
    using (is_active = true);
exception
  when duplicate_object then null;
end $$;
