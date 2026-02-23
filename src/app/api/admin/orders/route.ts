import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createNotifications } from '@/lib/admin/notifications'

const DEFAULT_PER_PAGE = 10
const MAX_PER_PAGE = 50
const VALID_STATUSES = new Set([
  'pending',
  'processing',
  'out_for_delivery',
  'delivered',
  'cancelled',
])

const parsePositiveInt = (value: unknown, fallback: number) => {
  const next = Number(value)
  if (!Number.isFinite(next) || next <= 0) return fallback
  return Math.floor(next)
}

const parseAddressJson = (value: unknown) => {
  if (value && typeof value === 'object') return value as Record<string, unknown>
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return {}
}

const getManualStatus = (shippingAddress: Record<string, unknown>) =>
  String(
    shippingAddress?.orderStatus ||
      shippingAddress?.order_status ||
      shippingAddress?.status ||
      '',
  )
    .trim()
    .toLowerCase()

const deriveStatus = (paymentStatus: string, shippingAddress: Record<string, unknown>) => {
  const stored = getManualStatus(shippingAddress)
  if (VALID_STATUSES.has(stored)) return stored

  const pay = String(paymentStatus || '').trim().toLowerCase()
  if (pay === 'paid') return 'delivered'
  if (pay === 'failed') return 'cancelled'
  return 'pending'
}

const toStatusLabel = (status: string) => {
  if (status === 'out_for_delivery') return 'Out for Delivery'
  if (status === 'pending') return 'Awaiting Payment'
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const resolveCustomerName = (shippingAddress: Record<string, unknown>) => {
  const fullName = String(shippingAddress?.fullName || shippingAddress?.full_name || '').trim()
  if (fullName) return fullName
  const directName = String(shippingAddress?.name || shippingAddress?.recipientName || '').trim()
  if (directName) return directName
  const firstName = String(shippingAddress?.firstName || shippingAddress?.first_name || '').trim()
  const lastName = String(shippingAddress?.lastName || shippingAddress?.last_name || '').trim()
  const merged = `${firstName} ${lastName}`.trim()
  return merged || 'Customer'
}

const resolvePaymentText = (paymentStatus: string) => {
  const status = String(paymentStatus || '').toLowerCase()
  if (status === 'paid') return 'Paid online'
  if (status === 'pending') return 'Awaiting Payment'
  if (status === 'failed') return 'Payment failed'
  return 'Payment'
}

const toOrderNumberLabel = (orderId: string, orderNumber: string) => {
  const cleanOrderNumber = String(orderNumber || '').trim()
  if (cleanOrderNumber) {
    return cleanOrderNumber.startsWith('#') ? cleanOrderNumber : `#${cleanOrderNumber}`
  }
  return `#${String(orderId || '').replace(/-/g, '').toUpperCase()}`
}

const toNotificationSeverity = (status: string): 'info' | 'success' | 'warning' => {
  if (status === 'delivered') return 'success'
  if (status === 'cancelled') return 'warning'
  return 'info'
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin.user || !admin.isAdmin) {
    const response = jsonError('Unauthorized', 401)
    admin.applyCookies(response)
    return response
  }

  const params = request.nextUrl.searchParams
  const adminDb = createAdminSupabaseClient()
  const page = parsePositiveInt(params.get('page'), 1)
  const perPage = Math.min(parsePositiveInt(params.get('perPage'), DEFAULT_PER_PAGE), MAX_PER_PAGE)
  const statusFilter = String(params.get('status') || 'all').trim().toLowerCase()
  const searchTerm = String(params.get('search') || '').trim().toLowerCase()

  let query = adminDb
    .from('checkout_orders')
    .select(
      'id, order_number, payment_status, currency, total_amount, created_at, item_count, shipping_address',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (searchTerm) {
    query = query.or(`order_number.ilike.%${searchTerm}%,paystack_reference.ilike.%${searchTerm}%`)
  }

  const { data: ordersRows, error: ordersError, count } = await query

  if (ordersError) {
    const response = jsonError('Unable to load orders.', 500)
    admin.applyCookies(response)
    return response
  }

  const rows = Array.isArray(ordersRows) ? ordersRows : []
  const orderIds = rows.map((row) => String(row.id))

  const { data: itemRows, error: itemsError } = orderIds.length
    ? await adminDb
        .from('checkout_order_items')
        .select('order_id, name, image, quantity')
        .in('order_id', orderIds)
    : { data: [], error: null as unknown }

  if (itemsError) {
    const response = jsonError('Unable to load order items.', 500)
    admin.applyCookies(response)
    return response
  }

  const itemsByOrderId = new Map<string, Array<{ name: string; image: string | null; quantity: number }>>()
  ;(Array.isArray(itemRows) ? itemRows : []).forEach((row: any) => {
    const key = String(row.order_id || '')
    if (!key) return
    const list = itemsByOrderId.get(key) || []
    list.push({
      name: String(row.name || 'Product'),
      image: row.image ? String(row.image) : null,
      quantity: Math.max(1, Number(row.quantity || 1)),
    })
    itemsByOrderId.set(key, list)
  })

  const mapped = rows
    .map((row: any) => {
      const shippingAddress = parseAddressJson(row.shipping_address)
      const status = deriveStatus(String(row.payment_status || ''), shippingAddress)
      const items = itemsByOrderId.get(String(row.id)) || []
      const firstItem = items[0]
      return {
        id: String(row.id),
        orderId: String(row.order_number || row.id),
        date: String(row.created_at || ''),
        amount: Number(row.total_amount || 0),
        currency: String(row.currency || 'NGN'),
        status,
        statusLabel: toStatusLabel(status),
        paymentText: resolvePaymentText(String(row.payment_status || '')),
        customerName: resolveCustomerName(shippingAddress),
        customerTag: 'Customer',
        productName: firstItem?.name || 'Order',
        productImage: firstItem?.image || null,
        itemCount: Math.max(1, Number(row.item_count || items.length || 1)),
      }
    })
    .filter((row) => (statusFilter === 'all' ? true : row.status === statusFilter))

  const response = jsonOk({
    items: mapped,
    totalCount: Number(count || 0),
    page,
    perPage,
    hasMore: page * perPage < Number(count || 0),
  })
  admin.applyCookies(response)
  return response
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin.user || !admin.isAdmin) {
    const response = jsonError('Unauthorized', 401)
    admin.applyCookies(response)
    return response
  }

  const body = await request.json().catch(() => null)
  const adminDb = createAdminSupabaseClient()
  const orderId = String(body?.orderId || '').trim()
  const nextStatus = String(body?.status || '').trim().toLowerCase()

  if (!orderId || !VALID_STATUSES.has(nextStatus)) {
    const response = jsonError('Invalid order status update request.', 400)
    admin.applyCookies(response)
    return response
  }

  const { data: existingOrder, error: existingError } = await adminDb
    .from('checkout_orders')
    .select('id, user_id, order_number, payment_status, shipping_address')
    .eq('id', orderId)
    .maybeSingle()

  if (existingError || !existingOrder?.id) {
    const response = jsonError('Order not found.', 404)
    admin.applyCookies(response)
    return response
  }

  const shippingAddress = parseAddressJson(existingOrder.shipping_address)
  const previousStatus = deriveStatus(String(existingOrder.payment_status || ''), shippingAddress)
  const hasStatusChanged = previousStatus !== nextStatus
  const nextShippingAddress = {
    ...shippingAddress,
    orderStatus: nextStatus,
    order_status: nextStatus,
    status: nextStatus,
  }

  const { error: updateError } = await adminDb
    .from('checkout_orders')
    .update({
      shipping_address: nextShippingAddress,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (updateError) {
    const response = jsonError('Unable to update order status.', 500)
    admin.applyCookies(response)
    return response
  }

  const recipientUserId = String(existingOrder.user_id || '').trim()
  if (hasStatusChanged && recipientUserId) {
    const statusLabel = toStatusLabel(nextStatus)
    const orderNumberLabel = toOrderNumberLabel(String(existingOrder.id), String(existingOrder.order_number || ''))
    await createNotifications(adminDb, [
      {
        recipient_user_id: recipientUserId,
        recipient_role: 'customer',
        title: 'Order status updated',
        message: `Your order ${orderNumberLabel} is now ${statusLabel}.`,
        type: 'order_status',
        severity: toNotificationSeverity(nextStatus),
        entity_type: 'order',
        entity_id: String(existingOrder.id),
        metadata: {
          order_id: String(existingOrder.id),
          order_number: orderNumberLabel,
          status: nextStatus,
          status_label: statusLabel,
          action_url: `/UserBackend/orders/${String(existingOrder.id)}`,
        },
        created_by: admin.user?.id || null,
      },
    ])
  }

  const response = jsonOk({
    orderId,
    status: nextStatus,
    statusLabel: toStatusLabel(nextStatus),
  })
  admin.applyCookies(response)
  return response
}
