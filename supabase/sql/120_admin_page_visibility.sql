-- Lets an admin selectively expose an otherwise admin-only dashboard page to
-- vendors ("make public"). Rows are keyed by the same nav_key used in
-- AdminSidebar.jsx's NAV_GROUPS (item hrefs/group ids that carry
-- adminOnly: true). Absence of a row for a key means "not public" —
-- everything defaults private/hidden from vendors until an admin explicitly
-- flips it, per product decision. Pages vendors could already see are
-- untouched by this table entirely; it only ever grants additional access,
-- never removes any.
create table if not exists public.admin_page_visibility (
  nav_key text primary key,
  is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create index if not exists admin_page_visibility_is_public_idx
  on public.admin_page_visibility(is_public)
  where is_public;
