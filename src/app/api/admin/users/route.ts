import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireAdmin } from '@/lib/auth/require-admin'

export async function GET(request: NextRequest) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const { data, error } = await supabase.rpc('list_admin_users')

  if (error) {
    console.error('Admin users fetch failed:', error.message)
    return jsonError('Unable to load users.', 500)
  }

  const response = jsonOk({ items: data ?? [] })
  applyCookies(response)
  return response
}
