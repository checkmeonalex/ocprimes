import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { jsonError } from '@/lib/http/response'
import { getPublicNavKeys } from '@/lib/admin/page-visibility'

export async function GET(request: NextRequest) {
  const { applyCookies, user, role, isAdmin, isVendor } = await requireDashboardUser(request)

  if (!user) {
    return jsonError('Unauthorized.', 401)
  }

  // Admins already see every nav item; only vendors need to know which
  // otherwise admin-only pages an admin has marked public for them.
  const publicNavKeys = isVendor && !isAdmin ? Array.from(await getPublicNavKeys()) : []

  const response = NextResponse.json({
    role,
    is_admin: isAdmin,
    is_vendor: isVendor,
    roles: [role],
    public_nav_keys: publicNavKeys,
    user_id: user.id,
  })
  applyCookies(response)
  return response
}
