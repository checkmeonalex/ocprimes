import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireAdmin } from '@/lib/auth/require-admin'
import { sendAdminCustomerPasswordReset } from '@/lib/admin/customers'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  const params = await context.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) return jsonError('Invalid customer id.', 400)

  const { applyCookies, isAdmin, user } = await requireAdmin(request)
  if (!isAdmin) return jsonError('Forbidden.', 403)

  const result = await sendAdminCustomerPasswordReset(parsed.data.id, user?.id || null)
  if ('error' in result) {
    const response = jsonError(result.error, result.status)
    applyCookies(response)
    return response
  }

  const response = jsonOk(result.payload)
  applyCookies(response)
  return response
}
