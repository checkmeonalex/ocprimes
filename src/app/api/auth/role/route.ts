import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'
import { jsonError } from '@/lib/http/response'
import { getPublicNavKeys } from '@/lib/admin/page-visibility'

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return jsonError('Unauthorized.', 401)
  }

  const roleInfo = await getUserRoleInfoSafe(supabase, data.user.id, data.user.email || '')

  // Admins already see every nav item; only vendors need to know which
  // otherwise admin-only pages an admin has marked public for them.
  const publicNavKeys =
    roleInfo.isVendor && !roleInfo.isAdmin ? Array.from(await getPublicNavKeys()) : []

  const response = NextResponse.json({
    role: roleInfo.role,
    is_admin: roleInfo.isAdmin,
    is_vendor: roleInfo.isVendor,
    roles: roleInfo.roles,
    public_nav_keys: publicNavKeys,
    user_id: data.user.id,
  })
  applyCookies(response)
  return response
}
