import type { NextRequest } from 'next/server'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'
import { getMcpServiceUserId, isMcpAdminRequest } from '@/lib/auth/mcp-token'

function isWorkplaceAppRequest(request: NextRequest): boolean {
  const secret = process.env.ALXORA_WORKPLACE_API_TOKEN
  if (!secret) return false
  const header = request.headers.get('x-alxora-workplace-token') || ''
  return header === secret
}

// Extracts a bearer token from the Authorization header, if present. Used
// for the mobile-app auth path below — distinct from isMcpAdminRequest,
// which compares against a static shared secret rather than verifying a
// real per-user Supabase session.
function extractBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization') || ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  return match ? match[1] : null
}

export async function requireDashboardUser(request: NextRequest) {
  if (isMcpAdminRequest(request)) {
    return {
      supabase: createAdminSupabaseClient(),
      applyCookies: () => {},
      user: { id: getMcpServiceUserId() || 'mcp-service', email: 'mcp-service@internal' } as any,
      role: 'admin' as const,
      isAdmin: true,
      isVendor: false,
      canManageCatalog: true,
    }
  }

  if (isWorkplaceAppRequest(request)) {
    return {
      supabase: createAdminSupabaseClient(),
      applyCookies: () => {},
      user: { id: process.env.MCP_SERVICE_USER_ID || 'workplace-app', email: 'workplace-app@internal' } as any,
      role: 'admin' as const,
      isAdmin: true,
      isVendor: false,
      canManageCatalog: true,
    }
  }

  // Mobile app (Alxora Workplace) auth path: it holds a real Supabase
  // session (signed in via supabase.auth.signInWithPassword) rather than
  // the dashboard's browser cookies, so it sends its access token as a
  // Bearer header instead. supabase.auth.getUser(token) cryptographically
  // verifies the token against Supabase Auth — this is not a shared
  // secret, it authenticates the specific signed-in user — then the same
  // user_roles-based admin/vendor check below applies exactly as it does
  // for cookie-authenticated dashboard sessions. Falls through to the
  // cookie path if the header is absent or the token doesn't verify, so
  // existing dashboard behavior is unchanged.
  const bearerToken = extractBearerToken(request)
  if (bearerToken) {
    const adminSupabase = createAdminSupabaseClient()
    const { data, error } = await adminSupabase.auth.getUser(bearerToken)
    if (!error && data.user) {
      const roleInfo = await getUserRoleInfoSafe(adminSupabase, data.user.id, data.user.email || '')
      const isAdmin = roleInfo.isAdmin
      const isVendor = roleInfo.isVendor && !isAdmin
      return {
        supabase: adminSupabase,
        applyCookies: () => {},
        user: data.user,
        role: roleInfo.role,
        isAdmin,
        isVendor,
        canManageCatalog: isAdmin || isVendor,
      }
    }
  }

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
