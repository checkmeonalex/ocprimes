import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireAdmin } from '@/lib/auth/require-admin'
import { getAdminCustomerStats } from '@/lib/admin/customers'

export async function GET(request: NextRequest) {
  const { applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) return jsonError('Forbidden.', 403)

  const result = await getAdminCustomerStats()
  const response = jsonOk(result.payload)
  applyCookies(response)
  return response
}
