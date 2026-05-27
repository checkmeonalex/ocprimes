import type { NextRequest } from 'next/server'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { loadDashboardStats } from '@/lib/admin/dashboard-stats'

export async function GET(request: NextRequest) {
  const actor = await requireDashboardUser(request)
  if (!actor.user) {
    const response = jsonError('Unauthorized', 401)
    actor.applyCookies(response)
    return response
  }
  if (!actor.isAdmin && !actor.isVendor) {
    const response = jsonError('Forbidden', 403)
    actor.applyCookies(response)
    return response
  }

  try {
    const adminDb = createAdminSupabaseClient()
    const snapshot = await loadDashboardStats(
      adminDb,
      actor,
      request.nextUrl.searchParams.get('range'),
    )
    const response = jsonOk(snapshot)
    actor.applyCookies(response)
    return response
  } catch (error) {
    console.error('dashboard stats load failed:', error)
    const response = jsonError('Unable to load dashboard stats.', 500)
    actor.applyCookies(response)
    return response
  }
}
