import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'

type RawOrder = {
  id: string
  order_number: string | null
  paystack_reference: string
  payment_status: string
  shipping_address?: Record<string, unknown> | null
  total_amount: number | string
  subtotal: number | string
  currency: string
  created_at: string
  item_count: number | string
}

type RawOrderItem = {
  order_id: string
  name: string
  image: string | null
  quantity: number | string
}

const PAYMENT_WINDOW_MINUTES = 2
const PAYMENT_WINDOW_MS = PAYMENT_WINDOW_MINUTES * 60 * 1000

const getManualStatus = (shippingAddress: Record<string, unknown>) =>
  String(
    shippingAddress?.orderStatus ||
      shippingAddress?.order_status ||
      shippingAddress?.status ||
      '',
  )
    .trim()
    .toLowerCase()

const isPendingExpired = (paymentStatus: string, createdAt: unknown) => {
  const normalized = String(paymentStatus || '').toLowerCase()
  if (normalized !== 'pending') return false
  const createdAtMs = new Date(String(createdAt || '')).getTime()
  if (!Number.isFinite(createdAtMs)) return false
  return Date.now() - createdAtMs >= PAYMENT_WINDOW_MS
}

const toUiStatus = (
  paymentStatus: string,
  shippingAddress: Record<string, unknown>,
  createdAt: unknown,
) => {
  const manual = getManualStatus(shippingAddress)
  if (manual === 'delivered') return 'completed'
  if (manual === 'cancelled') return 'cancelled'
  if (manual === 'failed') return 'failed'
  if (manual === 'processing' || manual === 'out_for_delivery' || manual === 'pending') return 'pending'
  if (manual === 'awaiting_payment') return 'awaiting_payment'
  if (isPendingExpired(paymentStatus, createdAt)) return 'failed'

  const normalized = String(paymentStatus || '').toLowerCase()
  if (normalized === 'paid') return 'completed'
  if (normalized === 'failed') return 'failed'
  if (normalized === 'cancelled') return 'cancelled'
  if (normalized === 'pending') return 'awaiting_payment'
  return 'pending'
}

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data: auth, error: authError } = await supabase.auth.getUser()

  if (authError || !auth?.user) {
    const response = jsonError('You must be signed in.', 401)
    applyCookies(response)
    return response
  }

  const { data: ordersData, error: ordersError } = await supabase
    .from('checkout_orders')
    .select(
      'id, order_number, paystack_reference, payment_status, shipping_address, total_amount, subtotal, currency, created_at, item_count',
    )
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })

  if (ordersError) {
    const response = jsonError('Unable to load orders.', 500)
    applyCookies(response)
    return response
  }

  const orders = (ordersData || []) as RawOrder[]
  if (orders.length === 0) {
    const response = jsonOk({ items: [] })
    applyCookies(response)
    return response
  }

  const orderIds = orders.map((entry) => entry.id)
  const { data: orderItemsData, error: itemsError } = await supabase
    .from('checkout_order_items')
    .select('order_id, name, image, quantity')
    .in('order_id', orderIds)
    .order('created_at', { ascending: true })

  if (itemsError) {
    const response = jsonError('Unable to load order items.', 500)
    applyCookies(response)
    return response
  }

  const groupedItems = new Map<string, RawOrderItem[]>()
  ;((orderItemsData || []) as RawOrderItem[]).forEach((item) => {
    const list = groupedItems.get(item.order_id) || []
    list.push(item)
    groupedItems.set(item.order_id, list)
  })

  const items = orders.map((order, index) => {
    const lineItems = groupedItems.get(order.id) || []
    const firstItem = lineItems[0] || null
    return {
      id: order.id,
      orderNumber: String(order.order_number || '').trim() || `#${String(order.id || '').replace(/-/g, '').toUpperCase()}`,
      paystackReference: String(order.paystack_reference || ''),
      status: toUiStatus(
        order.payment_status,
        (order.shipping_address || {}) as Record<string, unknown>,
        order.created_at,
      ),
      paymentStatus: String(order.payment_status || ''),
      totalAmount: Number(order.total_amount || 0),
      subtotal: Number(order.subtotal || 0),
      currency: String(order.currency || 'NGN'),
      itemCount: Number(order.item_count || 0),
      createdAt: String(order.created_at || ''),
      isRecent: index === 0,
      firstItem: firstItem
        ? {
            name: String(firstItem.name || ''),
            image: firstItem.image ? String(firstItem.image) : null,
            quantity: Number(firstItem.quantity || 0),
          }
        : null,
      previewText:
        lineItems.length > 1
          ? `${lineItems
              .slice(0, 2)
              .map((entry) => String(entry.name || '').trim())
              .filter(Boolean)
              .join(', ')} +${lineItems.length - 2} item${lineItems.length - 2 === 1 ? '' : 's'}`
          : lineItems[0]
            ? String(lineItems[0].name || '').trim()
            : 'Order items',
    }
  })

  const response = jsonOk({ items })
  applyCookies(response)
  return response
}
