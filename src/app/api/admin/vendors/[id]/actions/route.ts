import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createNotifications } from '@/lib/admin/notifications'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const bodySchema = z.object({
  action: z.enum(['deactivate', 'reactivate', 'delete_user']),
  confirmation: z.string().trim().optional(),
})

const missingTableCodes = new Set(['42P01', 'PGRST205', '42703'])

const safeDelete = async (query: any) => {
  const { error } = await query
  if (!error) return
  const code = String(error?.code || '')
  if (missingTableCodes.has(code)) return
  throw new Error(error.message || 'Delete failed.')
}

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { isAdmin, user, applyCookies } = await requireAdmin(request)
  if (!isAdmin || !user?.id) return jsonError('Forbidden.', 403)

  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) return jsonError('Invalid vendor id.', 400)
  const vendorId = parsedParams.data.id

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid payload.', 400)
  }
  const parsedBody = bodySchema.safeParse(body)
  if (!parsedBody.success) {
    return jsonError(parsedBody.error.issues[0]?.message || 'Invalid action payload.', 400)
  }

  const adminDb = createAdminSupabaseClient()
  const { data: userRow, error: userError } = await adminDb.auth.admin.getUserById(vendorId)
  if (userError || !userRow?.user?.id) {
    return jsonError('Vendor user not found.', 404)
  }

  const action = parsedBody.data.action
  if (action === 'deactivate') {
    await adminDb.from('user_roles').upsert({ user_id: vendorId, role: 'customer' }, { onConflict: 'user_id' })
    await adminDb.from('profiles').upsert({ id: vendorId, role: 'customer' }, { onConflict: 'id' })

    await createNotifications(adminDb, [
      {
        recipient_user_id: vendorId,
        recipient_role: 'vendor',
        title: 'Vendor access deactivated',
        message: 'Your vendor access was deactivated by admin.',
        severity: 'warning',
        type: 'vendor_access',
        entity_type: 'vendor',
        entity_id: vendorId,
        created_by: user.id,
      },
    ])

    const response = jsonOk({ success: true, state: 'deactivated' })
    applyCookies(response)
    return response
  }

  if (action === 'reactivate') {
    await adminDb.from('user_roles').upsert({ user_id: vendorId, role: 'vendor' }, { onConflict: 'user_id' })
    await adminDb.from('profiles').upsert({ id: vendorId, role: 'vendor' }, { onConflict: 'id' })

    await createNotifications(adminDb, [
      {
        recipient_user_id: vendorId,
        recipient_role: 'vendor',
        title: 'Vendor access reactivated',
        message: 'Your vendor access was reactivated by admin.',
        severity: 'success',
        type: 'vendor_access',
        entity_type: 'vendor',
        entity_id: vendorId,
        created_by: user.id,
      },
    ])

    const response = jsonOk({ success: true, state: 'active' })
    applyCookies(response)
    return response
  }

  const confirmation = String(parsedBody.data.confirmation || '').trim()
  if (confirmation !== 'DELETE') {
    return jsonError('Type DELETE to confirm destructive removal.', 400)
  }

  try {
    const { data: brandRows } = await adminDb
      .from('admin_brands')
      .select('id')
      .eq('created_by', vendorId)
    const brandIds = (Array.isArray(brandRows) ? brandRows : [])
      .map((row: any) => String(row?.id || '').trim())
      .filter(Boolean)

    const [ownProductsResult, brandLinkedResult] = await Promise.all([
      adminDb.from('products').select('id').eq('created_by', vendorId),
      brandIds.length
        ? adminDb.from('product_brand_links').select('product_id').in('brand_id', brandIds)
        : Promise.resolve({ data: [], error: null } as any),
    ])

    const mergedProductIds = Array.from(
      new Set([
        ...(Array.isArray(ownProductsResult.data) ? ownProductsResult.data : []).map((row: any) =>
          String(row?.id || '').trim(),
        ),
        ...(Array.isArray(brandLinkedResult.data) ? brandLinkedResult.data : []).map((row: any) =>
          String(row?.product_id || '').trim(),
        ),
      ].filter(Boolean)),
    )

    await safeDelete(adminDb.from('product_images').delete().eq('created_by', vendorId))
    if (mergedProductIds.length) {
      await safeDelete(adminDb.from('products').delete().in('id', mergedProductIds))
    }
    if (brandIds.length) {
      await safeDelete(adminDb.from('admin_brands').delete().in('id', brandIds))
    }
    await safeDelete(adminDb.from('vendor_requests').delete().eq('user_id', vendorId))
    await safeDelete(adminDb.from('admin_notifications').delete().eq('recipient_user_id', vendorId))
    await safeDelete(adminDb.from('admin_notifications').delete().eq('created_by', vendorId))
    if (brandIds.length) {
      await safeDelete(adminDb.from('customer_vendor_follows').delete().in('brand_id', brandIds))
    }

    await safeDelete(adminDb.from('profiles').delete().eq('id', vendorId))
    await safeDelete(adminDb.from('user_roles').delete().eq('user_id', vendorId))

    const { error: deleteAuthError } = await adminDb.auth.admin.deleteUser(vendorId)
    if (deleteAuthError) {
      return jsonError(deleteAuthError.message || 'Unable to delete auth user.', 500)
    }
  } catch (error: any) {
    return jsonError(error?.message || 'Unable to delete vendor account data.', 500)
  }

  const response = jsonOk({ success: true, state: 'deleted' })
  applyCookies(response)
  return response
}
