import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createNotifications } from '@/lib/admin/notifications'
import { loadVendorOrderIds, loadVendorProductIds } from '@/lib/orders/vendor-scope'

const DEFAULT_PER_PAGE = 10
const MAX_PER_PAGE = 50
const VALID_STATUSES = new Set([
  'pending',
  'awaiting_payment',
  'payment_failed',
  'processing',
  'ready_to_ship',
  'out_for_delivery',
  'delivered',
  'refunded',
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
  if (pay === 'paid') return 'pending'
  if (pay === 'failed') return 'payment_failed'
  return 'awaiting_payment'
}

const toStatusLabel = (status: string) => {
  if (status === 'pending') return 'Pending'
  if (status === 'awaiting_payment') return 'Awaiting Payment'
  if (status === 'payment_failed') return 'Payment Failed'
  if (status === 'ready_to_ship') return 'Ready To Ship'
  if (status === 'out_for_delivery') return 'Out for Delivery'
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
  if (status === 'refunded') return 'warning'
  if (status === 'cancelled') return 'warning'
  if (status === 'payment_failed') return 'warning'
  return 'info'
}

export async function GET(request: NextRequest) {
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

  const params = request.nextUrl.searchParams
  const adminDb = createAdminSupabaseClient()
  const page = parsePositiveInt(params.get('page'), 1)
  const perPage = Math.min(parsePositiveInt(params.get('perPage'), DEFAULT_PER_PAGE), MAX_PER_PAGE)
  const statusFilter = String(params.get('status') || 'all').trim().toLowerCase()
  const searchTerm = String(params.get('search') || '').trim().toLowerCase()
  const isSellerScoped = actor.isVendor && !actor.isAdmin

  if (isSellerScoped) {
    try {
      const vendorProductIds = await loadVendorProductIds(adminDb, actor.user.id)
      if (vendorProductIds.length === 0) {
        const response = jsonOk({
          items: [],
          totalCount: 0,
          page,
          perPage,
          hasMore: false,
          capabilities: {
            isSellerScoped: true,
            canUpdateStatus: false,
          },
        })
        actor.applyCookies(response)
        return response
      }

      const vendorOrderIds = await loadVendorOrderIds(adminDb, vendorProductIds)
      if (vendorOrderIds.length === 0) {
        const response = jsonOk({
          items: [],
          totalCount: 0,
          page,
          perPage,
          hasMore: false,
          capabilities: {
            isSellerScoped: true,
            canUpdateStatus: false,
          },
        })
        actor.applyCookies(response)
        return response
      }

      let scopedOrdersQuery = adminDb
        .from('checkout_orders')
        .select('id, order_number, payment_status, currency, created_at, shipping_address')
        .in('id', vendorOrderIds)
        .order('created_at', { ascending: false })

      if (searchTerm) {
        scopedOrdersQuery = scopedOrdersQuery.or(
          `order_number.ilike.%${searchTerm}%,paystack_reference.ilike.%${searchTerm}%`,
        )
      }

      const { data: scopedOrderRows, error: scopedOrderError } = await scopedOrdersQuery
      if (scopedOrderError) {
        const response = jsonError('Unable to load orders.', 500)
        actor.applyCookies(response)
        return response
      }

      const statusFilteredRows = (Array.isArray(scopedOrderRows) ? scopedOrderRows : []).filter((row: any) => {
        const shippingAddress = parseAddressJson(row?.shipping_address)
        const status = deriveStatus(String(row?.payment_status || ''), shippingAddress)
        return statusFilter === 'all' ? true : status === statusFilter
      })

      const totalCount = statusFilteredRows.length
      const startIndex = (page - 1) * perPage
      const pageRows = statusFilteredRows.slice(startIndex, startIndex + perPage)
      const pageOrderIds = pageRows.map((row: any) => String(row.id || '')).filter(Boolean)

      const { data: pageItemRows, error: pageItemsError } = pageOrderIds.length
        ? await adminDb
            .from('checkout_order_items')
            .select('order_id, product_id, name, image, quantity, line_total')
            .in('order_id', pageOrderIds)
            .in('product_id', vendorProductIds)
        : { data: [], error: null as unknown }

      if (pageItemsError) {
        const response = jsonError('Unable to load order items.', 500)
        actor.applyCookies(response)
        return response
      }

      const itemsByOrderId = new Map<
        string,
        Array<{ name: string; image: string | null; quantity: number; lineTotal: number }>
      >()
      ;(Array.isArray(pageItemRows) ? pageItemRows : []).forEach((row: any) => {
        const key = String(row.order_id || '')
        if (!key) return
        const list = itemsByOrderId.get(key) || []
        list.push({
          name: String(row.name || 'Product'),
          image: row.image ? String(row.image) : null,
          quantity: Math.max(1, Number(row.quantity || 1)),
          lineTotal: Number(row.line_total || 0),
        })
        itemsByOrderId.set(key, list)
      })

      const mapped = pageRows.map((row: any) => {
        const shippingAddress = parseAddressJson(row.shipping_address)
        const status = deriveStatus(String(row.payment_status || ''), shippingAddress)
        const items = itemsByOrderId.get(String(row.id)) || []
        const firstItem = items[0]
        const scopedAmount = items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0)
        return {
          id: String(row.id),
          orderId: String(row.order_number || row.id),
          date: String(row.created_at || ''),
          amount: scopedAmount,
          currency: String(row.currency || 'NGN'),
          status,
          statusLabel: toStatusLabel(status),
          paymentText: resolvePaymentText(String(row.payment_status || '')),
          customerName: resolveCustomerName(shippingAddress),
          customerTag: 'Customer',
          productName: firstItem?.name || 'Order',
          productImage: firstItem?.image || null,
          itemCount: Math.max(1, items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)),
        }
      })

      const response = jsonOk({
        items: mapped,
        totalCount,
        page,
        perPage,
        hasMore: page * perPage < totalCount,
        capabilities: {
          isSellerScoped: true,
          canUpdateStatus: false,
        },
      })
      actor.applyCookies(response)
      return response
    } catch {
      const response = jsonError('Unable to load orders.', 500)
      actor.applyCookies(response)
      return response
    }
  }

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
    actor.applyCookies(response)
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
    actor.applyCookies(response)
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
    capabilities: {
      isSellerScoped: false,
      canUpdateStatus: true,
    },
  })
  actor.applyCookies(response)
  return response
}

export async function PATCH(request: NextRequest) {
  const actor = await requireDashboardUser(request)
  if (!actor.user || !actor.isAdmin) {
    const response = jsonError('Unauthorized', 401)
    actor.applyCookies(response)
    return response
  }

  const body = await request.json().catch(() => null)
  const adminDb = createAdminSupabaseClient()
  const orderId = String(body?.orderId || '').trim()
  const nextStatus = String(body?.status || '').trim().toLowerCase()

  if (!orderId || !VALID_STATUSES.has(nextStatus)) {
    const response = jsonError('Invalid order status update request.', 400)
    actor.applyCookies(response)
    return response
  }

  const { data: existingOrder, error: existingError } = await adminDb
    .from('checkout_orders')
    .select('id, user_id, order_number, payment_status, shipping_address')
    .eq('id', orderId)
    .maybeSingle()

  if (existingError || !existingOrder?.id) {
    const response = jsonError('Order not found.', 404)
    actor.applyCookies(response)
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
    actor.applyCookies(response)
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
        created_by: actor.user?.id || null,
      },
    ])
  }

  const response = jsonOk({
    orderId,
    status: nextStatus,
    statusLabel: toStatusLabel(nextStatus),
  })
  actor.applyCookies(response)
  return response
}
