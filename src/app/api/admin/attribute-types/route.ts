import type { NextRequest } from 'next/server'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'

const TABLE = 'admin_attribute_types'

export async function GET(request: NextRequest) {
  const { applyCookies, canManageCatalog } = await requireDashboardUser(request)
  const db = createAdminSupabaseClient()

  if (!canManageCatalog) {
    return jsonError('Forbidden.', 403)
  }

  const { data, error } = await db
    .from(TABLE)
    .select('id, name, slug, description, created_at')
    .order('created_at', { ascending: true })

  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('attribute types list failed:', error.message)
    if (errorCode === '42P01') {
      return jsonError('attribute types table not found. Run migration 017_admin_attribute_types.sql.', 500)
    }
    return jsonError('Unable to load attribute types.', 500)
  }

  const response = jsonOk({ items: data ?? [] })
  applyCookies(response)
  return response
}
