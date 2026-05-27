import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'
import { jsonError } from '@/lib/http/response'

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return jsonError('Unauthorized.', 401)
  }

  const roleInfo = await getUserRoleInfoSafe(supabase, data.user.id, data.user.email || '')
  const response = NextResponse.json({
    role: roleInfo.role,
    is_admin: roleInfo.isAdmin,
    is_vendor: roleInfo.isVendor,
    roles: roleInfo.roles,
  })
  applyCookies(response)
  return response
}
