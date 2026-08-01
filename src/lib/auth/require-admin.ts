import type { NextRequest } from 'next/server'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'
import { getMcpServiceUserId, isMcpAdminRequest } from '@/lib/auth/mcp-token'

export async function requireAdmin(request: NextRequest) {
  if (isMcpAdminRequest(request)) {
    return {
      supabase: createAdminSupabaseClient(),
      applyCookies: () => {},
      user: { id: getMcpServiceUserId() || 'mcp-service', email: 'mcp-service@internal' } as any,
      isAdmin: true,
    }
  }

  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return { supabase, applyCookies, user: null, isAdmin: false }
  }

  const roleInfo = await getUserRoleInfoSafe(supabase, data.user.id, data.user.email || '')

  return {
    supabase,
    applyCookies,
    user: data.user,
    isAdmin: roleInfo.isAdmin,
  }
}
