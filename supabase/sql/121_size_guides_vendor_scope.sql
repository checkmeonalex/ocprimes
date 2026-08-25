-- Lets vendors create their own size guides that stay private to them,
-- reusing the same created_by convention already used by admin_attributes
-- (see attribute-route.ts): created_by is null for a shared/admin-published
-- guide, or a user id for a guide private to that vendor. No new column —
-- size_guides.created_by already exists (113_size_guides.sql).
--
-- RLS here is defense-in-depth (API routes use the service-role client and
-- do the actual scoping), mirroring 014_admin_attributes.sql's policies.
drop policy if exists "Size guides: public select" on public.size_guides;

do $$
begin
  create policy "Size guides: select shared or own" on public.size_guides
    for select using (
      created_by is null
      or created_by = auth.uid()
      or public.is_admin_user()
    );
exception
  when duplicate_object then null;
end $$;

drop policy if exists "Size guides: admin insert" on public.size_guides;

do $$
begin
  create policy "Size guides: admin or owner insert" on public.size_guides
    for insert with check (
      public.is_admin_user() or created_by = auth.uid()
    );
exception
  when duplicate_object then null;
end $$;

drop policy if exists "Size guides: admin update" on public.size_guides;

do $$
begin
  create policy "Size guides: admin or owner update" on public.size_guides
    for update using (
      public.is_admin_user() or created_by = auth.uid()
    ) with check (
      public.is_admin_user() or created_by = auth.uid()
    );
exception
  when duplicate_object then null;
end $$;

drop policy if exists "Size guides: admin delete" on public.size_guides;

do $$
begin
  create policy "Size guides: admin or owner delete" on public.size_guides
    for delete using (
      public.is_admin_user() or created_by = auth.uid()
    );
exception
  when duplicate_object then null;
end $$;
