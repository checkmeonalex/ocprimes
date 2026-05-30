import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

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

  const { data: authData } = await supabase.auth.getUser()
  if (authData?.user?.id === parsed.data.id) {
    return jsonError('You cannot delete your own account.', 400)
  }

  const adminDb = createAdminSupabaseClient()
  const targetId = parsed.data.id

  // Nullify non-cascading reviewed_by references
  await adminDb
    .from('admin_requests')
    .update({ reviewed_by: null })
    .eq('reviewed_by', targetId)

  // Remove vendor ownership record (ON DELETE RESTRICT — NOT NULL so must delete row)
  await adminDb
    .from('vendors')
    .delete()
    .eq('user_id', targetId)

  // Now safe to delete the auth user (all remaining refs are CASCADE or SET NULL)
  const { error } = await adminDb.auth.admin.deleteUser(targetId)

  if (error) {
    console.error('deleteUser error:', error.message)
    return jsonError(error.message || 'Unable to delete user.', 500)
  }

  const response = jsonOk({ success: true })
  applyCookies(response)
  return response
}
