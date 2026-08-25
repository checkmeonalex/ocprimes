import { createAdminSupabaseClient } from '@/lib/supabase/admin'

// Single source of truth for every admin-only nav item that can be toggled
// public for vendors. Keys mirror AdminSidebar.jsx's NAV_GROUPS structure —
// individual item hrefs, plus one entry for the whole "platform" group
// (Manage Sellers), which is gated at group level today.
export const TOGGLEABLE_NAV_ITEMS = [
  { key: 'pages', label: 'Pages', description: 'Homepage and other CMS page layouts.' },
  { key: 'customers', label: 'Customers', description: 'Customer profiles and activity across the whole platform.' },
  { key: 'categories', label: 'Categories', description: 'Shared product category taxonomy.' },
  { key: 'brands', label: 'Brands', description: 'Internal brand directory.' },
  { key: 'logistics', label: 'Logistics', description: 'Delivery city fees and ETA windows.' },
  { key: 'extra', label: 'Extra', description: 'Miscellaneous platform configuration.' },
  { key: 'platform', label: 'Manage Sellers', description: 'The seller-management area used to review vendor applications.' },
] as const

export type ToggleableNavKey = (typeof TOGGLEABLE_NAV_ITEMS)[number]['key']

const VALID_KEYS = new Set(TOGGLEABLE_NAV_ITEMS.map((item) => item.key))

export function isValidNavKey(key: string): key is ToggleableNavKey {
  return VALID_KEYS.has(key as ToggleableNavKey)
}

// Returns the full set of nav_keys currently marked public — used by both
// the sidebar's role-based filter (client, via an API route) and any
// server-side per-page/per-API gate that wants to allow a vendor through.
export async function getPublicNavKeys(): Promise<Set<string>> {
  const adminClient = createAdminSupabaseClient()
  const { data, error } = await adminClient
    .from('admin_page_visibility')
    .select('nav_key')
    .eq('is_public', true)

  if (error) {
    console.error('getPublicNavKeys failed:', error.message)
    return new Set()
  }

  return new Set((data ?? []).map((row: { nav_key: string }) => row.nav_key))
}

export async function isNavKeyPublic(key: string): Promise<boolean> {
  if (!isValidNavKey(key)) return false
  const adminClient = createAdminSupabaseClient()
  const { data, error } = await adminClient
    .from('admin_page_visibility')
    .select('is_public')
    .eq('nav_key', key)
    .maybeSingle()

  if (error) {
    console.error('isNavKeyPublic failed:', error.message)
    return false
  }

  return Boolean(data?.is_public)
}
