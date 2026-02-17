import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireAdmin } from '@/lib/auth/require-admin'
import { listAdminCustomers } from '@/lib/admin/customers'

export async function GET(request: NextRequest) {
  const { applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) return jsonError('Forbidden.', 403)

  const { searchParams } = new URL(request.url)
  const result = await listAdminCustomers({
    page: searchParams.get('page') || undefined,
    per_page: searchParams.get('per_page') || undefined,
    q: searchParams.get('q') || undefined,
  })

  if ('error' in result) {
    const response = jsonError(result.error, result.status)
    applyCookies(response)
    return response
  }

  const response = jsonOk(result.payload)
  applyCookies(response)
  return response
}
