import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { notifyAllAdmins } from '@/lib/admin/notifications'

const paramsSchema = z.object({
  orderId: z.string().trim().uuid(),
  itemId: z.string().trim().uuid(),
})

const bodySchema = z.object({
  status: z.enum([
    'item_not_available',
    'packaged_ready_for_shipment',
    'handed_to_delivery',
    'delivered',
  ]),
  note: z.string().trim().max(300).optional().default(''),
})

const toSellerStatusLabel = (status: string) => {
  if (status === 'item_not_available') return 'Item not available'
  if (status === 'packaged_ready_for_shipment') return 'Packaged and ready for shipment'
  if (status === 'handed_to_delivery') return 'Handed to delivery'
  if (status === 'delivered') return 'Delivered'
  return 'Updated'
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderId: string; itemId: string }> },
) {
  const actor = await requireDashboardUser(request)
  if (!actor.user) {
    const response = jsonError('Unauthorized', 401)
    actor.applyCookies(response)
    return response
  }
  if (!actor.isAdmin && !actor.isVendor) {
    const response = jsonError('Forbidden', 403)
    actor.applyCookies(response)
    return response
  }

  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) {
    const response = jsonError('Invalid order item reference.', 400)
    actor.applyCookies(response)
    return response
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    const response = jsonError('Invalid JSON payload.', 400)
    actor.applyCookies(response)
    return response
  }

  const parsedBody = bodySchema.safeParse(payload)
  if (!parsedBody.success) {
    const response = jsonError(parsedBody.error.issues[0]?.message || 'Invalid status payload.', 400)
    actor.applyCookies(response)
    return response
  }

  const adminDb = createAdminSupabaseClient()
  const { orderId, itemId } = parsedParams.data
  const nextStatus = parsedBody.data.status
  const note = String(parsedBody.data.note || '').trim()

  const { data: orderItem, error: orderItemError } = await adminDb
    .from('checkout_order_items')
    .select('id, order_id, product_id, name')
    .eq('id', itemId)
    .eq('order_id', orderId)
    .maybeSingle()

  if (orderItemError) {
    const response = jsonError('Unable to validate order item.', 500)
    actor.applyCookies(response)
    return response
  }

  if (!orderItem?.id) {
    const response = jsonError('Order item not found.', 404)
    actor.applyCookies(response)
    return response
  }

  const { data: brandLinks, error: brandLinkError } = await adminDb
    .from('product_brand_links')
    .select('admin_brands(name, created_by)')
    .eq('product_id', String(orderItem.product_id || ''))
    .limit(1)

  if (brandLinkError) {
    const response = jsonError('Unable to resolve seller ownership.', 500)
    actor.applyCookies(response)
    return response
  }

  const relation =
    Array.isArray(brandLinks) && brandLinks.length > 0
      ? (brandLinks[0] as any)?.admin_brands
      : null
  const vendorUserId = Array.isArray(relation)
    ? String(relation[0]?.created_by || '').trim()
    : String(relation?.created_by || '').trim()
  const vendorName = Array.isArray(relation)
    ? String(relation[0]?.name || '').trim()
    : String(relation?.name || '').trim()

  if (!vendorUserId) {
    const response = jsonError('Seller ownership is not linked for this product.', 400)
    actor.applyCookies(response)
    return response
  }

  if (actor.isVendor && !actor.isAdmin && vendorUserId !== String(actor.user.id || '').trim()) {
    const response = jsonError('Forbidden', 403)
    actor.applyCookies(response)
    return response
  }

  const { data: inserted, error: insertError } = await adminDb
    .from('checkout_order_item_vendor_updates')
    .insert({
      order_id: orderId,
      order_item_id: itemId,
      vendor_user_id: vendorUserId,
      status: nextStatus,
      note,
      updated_by: actor.user.id,
    })
    .select('id, status, note, created_at')
    .single()

  if (insertError || !inserted?.id) {
    const response = jsonError('Unable to save seller update.', 500)
    actor.applyCookies(response)
    return response
  }

  const statusLabel = toSellerStatusLabel(nextStatus)
  await notifyAllAdmins(adminDb, {
    title: `Seller item update: ${statusLabel}`,
    message: `${vendorName || 'Seller'} updated "${String(orderItem.name || 'Product')}" in order ${orderId}.`,
    type: 'seller_order_item_status',
    severity: nextStatus === 'item_not_available' ? 'warning' : 'info',
    entityType: 'order',
    entityId: orderId,
    metadata: {
      order_id: orderId,
      order_item_id: itemId,
      product_id: String(orderItem.product_id || ''),
      status: nextStatus,
      status_label: statusLabel,
      note,
      vendor_user_id: vendorUserId,
      action_url: `/backend/admin/orders/${orderId}`,
    },
    createdBy: actor.user.id,
  })

  const response = jsonOk({
    update: {
      id: String(inserted.id),
      status: nextStatus,
      statusLabel,
      note: String(inserted.note || ''),
      createdAt: String(inserted.created_at || ''),
    },
  })
  actor.applyCookies(response)
  return response
}

