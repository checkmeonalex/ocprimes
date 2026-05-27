import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createNotifications } from '@/lib/admin/notifications'
import { getAdminCustomerById, updateAdminCustomerById } from '@/lib/admin/customers'

const paramsSchema = z.object({
  id: z.string().uuid(),
})
const deleteSchema = z.object({
  confirmation: z.string().trim().min(1),
})

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await context.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) return jsonError('Invalid customer id.', 400)

  const { applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) return jsonError('Forbidden.', 403)

  const result = await getAdminCustomerById(parsed.data.id)
  if ('error' in result) {
    const response = jsonError(result.error, result.status)
    applyCookies(response)
    return response
  }

  const response = jsonOk(result.payload)
  applyCookies(response)
  return response
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const params = await context.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) return jsonError('Invalid customer id.', 400)

  const { applyCookies, isAdmin, user } = await requireAdmin(request)
  if (!isAdmin) return jsonError('Forbidden.', 403)

  const payload = await request.json().catch(() => null)
  const result = await updateAdminCustomerById(parsed.data.id, payload)
  if ('error' in result) {
    const response = jsonError(result.error, result.status)
    applyCookies(response)
    return response
  }

  if (result.payload.notify_customer) {
    const db = createAdminSupabaseClient()
    await createNotifications(db, [
      {
        recipient_user_id: parsed.data.id,
        recipient_role:
          result.payload?.item?.role === 'admin'
            ? 'admin'
            : result.payload?.item?.role === 'vendor'
              ? 'vendor'
              : 'customer',
        title: 'Profile updated',
        message: 'Your profile information was updated by an administrator.',
        type: 'customer_profile',
        severity: 'info',
        entity_type: 'customer',
        entity_id: parsed.data.id,
        created_by: user?.id || null,
      },
    ])
  }

  const response = jsonOk(result.payload)
  applyCookies(response)
  return response
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) return jsonError('Invalid customer id.', 400)

  const { applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) return jsonError('Forbidden.', 403)

  const body = await request.json().catch(() => null)
  const parsedBody = deleteSchema.safeParse(body)
  if (!parsedBody.success) {
    return jsonError(parsedBody.error.issues[0]?.message || 'Invalid delete payload.', 400)
  }
  if (parsedBody.data.confirmation !== 'DELETE') {
    return jsonError('Type DELETE to confirm customer deletion.', 400)
  }

  const customerId = parsedParams.data.id
  const adminDb = createAdminSupabaseClient()

  await adminDb.from('customer_vendor_follows').delete().eq('customer_user_id', customerId)
  await adminDb.from('admin_notifications').delete().eq('recipient_user_id', customerId)
  await adminDb.from('admin_notifications').delete().eq('created_by', customerId)
  await adminDb.from('user_roles').delete().eq('user_id', customerId)
  await adminDb.from('profiles').delete().eq('id', customerId)

  const { error: deleteError } = await adminDb.auth.admin.deleteUser(customerId)
  if (deleteError) {
    console.error('admin customer delete failed:', deleteError.message)
    return jsonError('Unable to delete customer account.', 500)
  }

  const response = jsonOk({ deleted: true })
  applyCookies(response)
  return response
}
