# Supabase setup

## 1) Environment variables
Add the following to `.env.local` (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- `SUPER_ADMIN_EMAIL` (default: ocprimes@gmail.com)

## 2) Profiles + roles
Run `supabase/sql/001_profiles.sql` in the Supabase SQL editor to create the profiles table and base RLS policies.

## 3) Admin requests
Run the following after creating `profiles`:

- `supabase/sql/004_admin_requests.sql`
- `supabase/sql/003_profiles_trigger.sql` (updated to create admin requests)

## 4) Admin users functions (list/delete)
Run:

- `supabase/sql/005_admin_users.sql`

## 5) User roles table (admin-only roles)
Run:

- `supabase/sql/006_user_roles.sql`
- `supabase/sql/003_profiles_trigger.sql` (updated to seed user roles)

## 6) Orders/customers RLS templates
After you create `public.orders` and `public.customers` tables (with a `user_id` column), run:

- `supabase/sql/002_rls_templates.sql`

## 7) Cart tables (cross-device cart)
Run:

- `supabase/sql/007_cart.sql`
- `supabase/sql/008_cart_variations.sql` (adds variation fields + unique constraint)

These policies allow admins to read all rows and customers to read their own rows.
