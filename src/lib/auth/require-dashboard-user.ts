import type { NextRequest } from 'next/server'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'

export async function requireDashboardUser(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return {
      supabase,
      applyCookies,
      user: null,
      role: 'customer',
      isAdmin: false,
      isVendor: false,
      canManageCatalog: false,
    }
  }

  const roleInfo = await getUserRoleInfoSafe(supabase, data.user.id, data.user.email || '')
  const role = roleInfo.role
  const isAdmin = roleInfo.isAdmin
  // Admin must never be vendor-scoped in dashboard data queries.
  // Some accounts can carry both roles; admin privileges should take precedence.
  const isVendor = roleInfo.isVendor && !isAdmin

  return {
    supabase,
    applyCookies,
    user: data.user,
    role,
    isAdmin,
    isVendor,
    canManageCatalog: isAdmin || isVendor,
  }
}
