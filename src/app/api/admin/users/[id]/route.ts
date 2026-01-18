import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireAdmin } from '@/lib/auth/require-admin'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const params = await context.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) {
    return jsonError('Invalid user id.', 400)
  }

  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const { error } = await supabase.rpc('delete_admin_user', {
    target_user_id: parsed.data.id,
  })

  if (error) {
    const message =
      error.message?.includes('cannot delete self')
        ? 'You cannot delete your own account.'
        : 'Unable to delete user.'
    return jsonError(message, 400)
  }

  const response = jsonOk({ success: true })
  applyCookies(response)
  return response
}
