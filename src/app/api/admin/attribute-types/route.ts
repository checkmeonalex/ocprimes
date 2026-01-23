import type { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'

const TABLE = 'admin_attribute_types'

export async function GET(request: NextRequest) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const { data, error } = await supabase
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
