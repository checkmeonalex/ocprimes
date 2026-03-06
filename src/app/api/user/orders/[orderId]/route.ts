import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { isReturnPolicyDisabled, normalizeReturnPolicyKey } from '@/lib/cart/return-policy'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createNotifications, notifyAllAdmins } from '@/lib/admin/notifications'
import { reconcilePendingCheckoutOrderPayment } from '@/lib/payments/reconcile-pending-checkout'

const PAYMENT_WINDOW_MINUTES = 10
const PAYMENT_WINDOW_MS = PAYMENT_WINDOW_MINUTES * 60 * 1000
const RETURN_WINDOW_HOURS = 72
const PROTECTION_WINDOW_HOURS = 24
const CUSTOMER_CANCEL_ALLOWED_STATUS = new Set([
  'awaiting_payment',
  'failed',
])

const getManualStatus = (shippingAddress: Record<string, unknown>) =>
  String(
    shippingAddress?.orderStatus ||
      shippingAddress?.order_status ||
      shippingAddress?.status ||
      '',
  )
    .trim()
    .toLowerCase()

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

const isPendingExpired = (paymentStatus: string, createdAt: unknown) => {
  const normalized = String(paymentStatus || '').toLowerCase()
  if (normalized !== 'pending') return false
  const createdAtMs = new Date(String(createdAt || '')).getTime()
  if (!Number.isFinite(createdAtMs)) return false
  return Date.now() - createdAtMs >= PAYMENT_WINDOW_MS
}

const toStatusKey = (
  paymentStatus: string,
  shippingAddress: Record<string, unknown>,
  createdAt: unknown,
) => {
  const manual = getManualStatus(shippingAddress)
  if (manual === 'delivered') return 'delivered'
  if (manual === 'out_for_delivery') return 'out_for_delivery'
  if (manual === 'ready_to_ship') return 'ready_to_ship'
  if (manual === 'processing') return 'processing'
  if (manual === 'refunded') return 'refunded'
  if (manual === 'completed') return 'delivered'
  if (manual === 'cancelled') return 'cancelled'
  if (manual === 'pending') return 'pending'
  if (manual === 'awaiting_payment') return 'awaiting_payment'
  if (manual === 'failed') return 'failed'
  if (isPendingExpired(paymentStatus, createdAt)) return 'failed'

  const normalized = String(paymentStatus || '').toLowerCase()
  if (normalized === 'paid') return 'delivered'
  if (normalized === 'refunded') return 'refunded'
  if (normalized === 'failed') return 'failed'
  if (normalized === 'cancelled') return 'cancelled'
  if (normalized === 'pending') return 'awaiting_payment'
  return 'pending'
}

const toStatusLabel = (statusKey: string) => {
  const normalized = String(statusKey || '').trim().toLowerCase()
  if (normalized === 'delivered') return 'Completed'
  if (normalized === 'out_for_delivery') return 'Out for delivery'
  if (normalized === 'ready_to_ship') return 'Ready To Ship'
  if (normalized === 'processing') return 'Processing'
  if (normalized === 'pending') return 'Pending'
  if (normalized === 'awaiting_payment') return 'Awaiting Payment'
  if (normalized === 'cancelled') return 'Cancelled'
  if (normalized === 'refunded') return 'Refunded'
  if (normalized === 'failed') return 'Payment Failed'
  return 'Pending'
}

const toOrderNumberLabel = (orderId: string, orderNumber: string) => {
  const cleanOrderNumber = String(orderNumber || '').trim()
  if (cleanOrderNumber) {
    return cleanOrderNumber.startsWith('#') ? cleanOrderNumber : `#${cleanOrderNumber}`
  }
  return `#${String(orderId || '').replace(/-/g, '').toUpperCase()}`
}

type BrandLinkRow = {
  product_id: string
  admin_brands?: { name?: string | null } | Array<{ name?: string | null }> | null
}

const formatAddress = (address: Record<string, unknown>) => {
  const parts = [
    String(address?.line1 || address?.streetAddress || '').trim(),
    String(address?.line2 || '').trim(),
    String(address?.city || '').trim(),
    String(address?.state || '').trim(),
    String(address?.postalCode || '').trim(),
    String(address?.country || '').trim(),
  ].filter(Boolean)
  return parts.join(', ')
}

const toPaymentMethodLabel = (methodId: string, channel: string) => {
  const id = String(methodId || '').trim().toLowerCase()
  const ch = String(channel || '').trim().toLowerCase()
  if (id === 'visa') return 'Visa Card'
  if (id === 'mastercard') return 'MasterCard'
  if (id === 'verve') return 'Verve Card'
  if (id === 'amex') return 'American Express'
  if (id === 'bank-transfer' || ch === 'bank_transfer') return 'Bank Transfer'
  if (id === 'ussd' || ch === 'ussd') return 'USSD'
  if (ch === 'card') return 'Card'
  if (ch === 'bank_transfer') return 'Bank Transfer'
  if (ch === 'ussd') return 'USSD'
  return 'Online Wallet'
}

const toTimestamp = (value: unknown) => {
  const raw = String(value || '').trim()
  if (!raw) return 0
  const next = new Date(raw).getTime()
  if (!Number.isFinite(next)) return 0
  return next
}

const getFirstValidTimestamp = (...values: unknown[]) => {
  for (const value of values) {
    const ts = toTimestamp(value)
    if (ts > 0) return ts
  }
  return 0
}

const toIsoOrNull = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return null
  return new Date(value).toISOString()
}

export async function GET(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params
  const safeOrderId = String(orderId || '').trim()
  if (!safeOrderId) {
    return jsonError('Order id is required.', 400)
  }

  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data: auth, error: authError } = await supabase.auth.getUser()

  if (authError || !auth?.user) {
    const response = jsonError('You must be signed in.', 401)
    applyCookies(response)
    return response
  }

  const { data: orderRow, error: orderError } = await supabase
    .from('checkout_orders')
    .select(
      'id, order_number, payment_status, total_amount, shipping_fee, tax_amount, protection_fee, subtotal, currency, created_at, updated_at, shipping_address, paystack_reference',
    )
    .eq('id', safeOrderId)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (orderError) {
    const response = jsonError('Unable to load order.', 500)
    applyCookies(response)
    return response
  }

  if (!orderRow?.id) {
    const response = jsonError('Order not found.', 404)
    applyCookies(response)
    return response
  }

  const { data: itemsRows, error: itemsError } = await supabase
    .from('checkout_order_items')
    .select(
      'id, item_key, product_id, name, image, selected_variation_label, quantity, unit_price, original_unit_price, line_total, created_at',
    )
    .eq('order_id', orderRow.id)
    .order('created_at', { ascending: true })

  if (itemsError) {
    const response = jsonError('Unable to load order items.', 500)
    applyCookies(response)
    return response
  }

  const productIds = Array.from(
    new Set((itemsRows || []).map((entry) => String(entry.product_id || '')).filter(Boolean)),
  )
  const vendorByProductId = new Map<string, string>()
  const returnPolicyByProductId = new Map<string, string>()
  const productSlugByProductId = new Map<string, string>()

  if (productIds.length > 0) {
    const [{ data: brandLinkRows }, { data: productPolicyRows }] = await Promise.all([
      supabase
        .from('product_brand_links')
        .select('product_id, admin_brands(name)')
        .in('product_id', productIds),
      supabase
        .from('products')
        .select('id, slug, return_policy')
        .in('id', productIds),
    ])

    ;((brandLinkRows || []) as BrandLinkRow[]).forEach((row) => {
      const productId = String(row.product_id || '')
      if (!productId || vendorByProductId.has(productId)) return

      const relation = row.admin_brands
      let vendorName = ''
      if (Array.isArray(relation)) {
        vendorName = String(relation[0]?.name || '').trim()
      } else {
        vendorName = String(relation?.name || '').trim()
      }
      if (vendorName) {
        vendorByProductId.set(productId, vendorName)
      }
    })

    ;((productPolicyRows || []) as Array<{ id: string; slug?: string | null; return_policy?: string | null }>).forEach((row) => {
      const productId = String(row.id || '')
      if (!productId) return
      returnPolicyByProductId.set(productId, normalizeReturnPolicyKey(row.return_policy))
      productSlugByProductId.set(productId, String(row.slug || '').trim())
    })
  }

  const shippingAddress = (orderRow.shipping_address || {}) as Record<string, unknown>
  let adminDbForReconcile: ReturnType<typeof createAdminSupabaseClient> | null = null
  try {
    adminDbForReconcile = createAdminSupabaseClient()
  } catch {
    adminDbForReconcile = null
  }
  const reconciledPaymentStatus = adminDbForReconcile
    ? await reconcilePendingCheckoutOrderPayment({
        adminDb: adminDbForReconcile,
        input: {
          id: String(orderRow.id || ''),
          userId: String(auth.user.id || ''),
          reference: String(orderRow.paystack_reference || ''),
          paymentStatus: String(orderRow.payment_status || ''),
          createdAt: String(orderRow.created_at || ''),
          totalAmount: Number(orderRow.total_amount || 0),
          currency: String(orderRow.currency || 'NGN'),
        },
        paymentWindowMinutes: PAYMENT_WINDOW_MINUTES,
      })
    : String(orderRow.payment_status || '').trim().toLowerCase()
  const effectivePaymentStatus =
    String(reconciledPaymentStatus || '').trim() || String(orderRow.payment_status || '').trim()
  const statusKey = toStatusKey(
    effectivePaymentStatus,
    shippingAddress,
    orderRow.created_at,
  )
  const deliveredAtTimestamp = getFirstValidTimestamp(
    shippingAddress?.deliveredAt,
    shippingAddress?.delivered_at,
    shippingAddress?.statusUpdatedAt,
    shippingAddress?.status_updated_at,
    statusKey === 'delivered' ? orderRow.updated_at : '',
    statusKey === 'delivered' ? orderRow.created_at : '',
  )
  const isDeliveredState = statusKey === 'delivered'
  const returnWindowEndsAtTimestamp = isDeliveredState
    ? deliveredAtTimestamp + RETURN_WINDOW_HOURS * 60 * 60 * 1000
    : 0
  const protectionWindowEndsAtTimestamp = isDeliveredState
    ? deliveredAtTimestamp + PROTECTION_WINDOW_HOURS * 60 * 60 * 1000
    : 0
  const isReturnWindowOpen =
    isDeliveredState && returnWindowEndsAtTimestamp > 0 && Date.now() <= returnWindowEndsAtTimestamp
  const hasProtection = Number(orderRow.protection_fee || 0) > 0
  const isProtectionWindowOpen =
    hasProtection &&
    isDeliveredState &&
    protectionWindowEndsAtTimestamp > 0 &&
    Date.now() <= protectionWindowEndsAtTimestamp
  const protectedItemKeysRaw = Array.isArray(shippingAddress?.protectedItemKeys)
    ? shippingAddress.protectedItemKeys
    : Array.isArray(shippingAddress?.protected_item_keys)
      ? shippingAddress.protected_item_keys
      : []
  const protectedItemKeys = new Set(
    protectedItemKeysRaw
      .map((entry) => String(entry || '').trim())
      .filter(Boolean),
  )
  const contactPhone = String(
    shippingAddress?.phone ||
      shippingAddress?.phoneNumber ||
      shippingAddress?.contactPhone ||
      '',
  ).trim()
  const deliveryMethod = String(
    shippingAddress?.shippingLabel ||
      shippingAddress?.selectedShippingOption ||
      shippingAddress?.deliveryMethod ||
      '',
  ).trim()
  let paymentMethod = String(
    shippingAddress?.paymentMethod || shippingAddress?.selectedPaymentMethod || '',
  ).trim()
  let paymentChannel = String(
    shippingAddress?.paymentChannel || shippingAddress?.selectedPaymentChannel || '',
  ).trim()

  if ((!paymentMethod && !paymentChannel) && orderRow.paystack_reference) {
    const secretKey = String(process.env.PAYSTACK_SECRET_KEY || '').trim()
    if (secretKey) {
      try {
        const verifyResponse = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(String(orderRow.paystack_reference || '').trim())}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${secretKey}`,
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
          },
        )
        const verifyPayload = await verifyResponse.json().catch(() => null)
        const metadata =
          verifyPayload && typeof verifyPayload === 'object'
            ? ((verifyPayload as { data?: { metadata?: Record<string, unknown> } }).data?.metadata || {})
            : {}
        paymentMethod = String(metadata.selected_payment_method || '').trim()
        paymentChannel = String(metadata.selected_payment_channel || '').trim()
      } catch {
        // keep default fallback label
      }
    }
  }

  const mappedItems = (itemsRows || []).map((entry) => {
    const itemKey = String((entry as { item_key?: string | null })?.item_key || '').trim()
    const productId = String(entry.product_id || '')
    const returnPolicyEnabled = !isReturnPolicyDisabled(
      returnPolicyByProductId.get(productId) || '',
    )
    const isProtectionCovered =
      hasProtection && (protectedItemKeys.size === 0 || (itemKey && protectedItemKeys.has(itemKey)))
    const isReturnPolicyEligible = isDeliveredState && isReturnWindowOpen && returnPolicyEnabled
    const isProtectionEligible = isDeliveredState && isProtectionWindowOpen && isProtectionCovered

    return {
      id: String(entry.id),
      itemKey,
      productId,
      productSlug: productSlugByProductId.get(productId) || '',
      vendor: vendorByProductId.get(productId) || 'OCPRIMES',
      name: String(entry.name || 'Product'),
      image: entry.image ? String(entry.image) : null,
      variation: entry.selected_variation_label ? String(entry.selected_variation_label) : '',
      quantity: Number(entry.quantity || 0),
      unitPrice: Number(entry.unit_price || 0),
      originalUnitPrice:
        entry.original_unit_price !== null && entry.original_unit_price !== undefined
          ? Number(entry.original_unit_price)
          : null,
      lineTotal: Number(entry.line_total || 0),
      isReturnable: returnPolicyEnabled,
      isProtectionCovered,
      isReturnPolicyEligible,
      isProtectionEligible,
      isReturnEligible: isReturnPolicyEligible || isProtectionEligible,
      returnWindowEndsAt: toIsoOrNull(returnWindowEndsAtTimestamp),
      protectionWindowEndsAt: toIsoOrNull(protectionWindowEndsAtTimestamp),
    }
  })

  const response = jsonOk({
    order: {
      id: String(orderRow.id),
      orderNumber: String(orderRow.order_number || '').trim() || `#${String(orderRow.id).replace(/-/g, '').toUpperCase()}`,
      statusKey,
      status: toStatusLabel(statusKey),
      paymentStatus: effectivePaymentStatus,
      createdAt: String(orderRow.created_at || ''),
      deliveredAt: toIsoOrNull(deliveredAtTimestamp),
      returnWindowHours: RETURN_WINDOW_HOURS,
      protectionWindowHours: PROTECTION_WINDOW_HOURS,
      returnWindowEndsAt: toIsoOrNull(returnWindowEndsAtTimestamp),
      protectionWindowEndsAt: toIsoOrNull(protectionWindowEndsAtTimestamp),
      isReturnWindowOpen,
      isProtectionWindowOpen,
      totalAmount: Number(orderRow.total_amount || 0),
      subtotal: Number(orderRow.subtotal || 0),
      shippingFee: Number(orderRow.shipping_fee || 0),
      taxAmount: Number(orderRow.tax_amount || 0),
      protectionFee: Number(orderRow.protection_fee || 0),
      seller: 'OCPRIMES',
      paystackReference: String(orderRow.paystack_reference || ''),
      trackId: String(orderRow.paystack_reference || orderRow.id || ''),
      addressLabel: formatAddress(shippingAddress),
      contactPhone,
      deliveryMethod: deliveryMethod || 'Standard delivery',
      paymentMode: toPaymentMethodLabel(paymentMethod, paymentChannel),
      hasEligibleReturnItems: mappedItems.some((entry) => entry.isReturnEligible),
      hasReturnPolicyItems: mappedItems.some((entry) => entry.isReturnable),
      hasProtectionCoveredItems: mappedItems.some((entry) => entry.isProtectionCovered),
      items: mappedItems,
    },
  })
  applyCookies(response)
  return response
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params
  const safeOrderId = String(orderId || '').trim()
  if (!safeOrderId) {
    return jsonError('Order id is required.', 400)
  }

  const body = await request.json().catch(() => null)
  const action = String(body?.action || '').trim().toLowerCase()
  if (action !== 'cancel') {
    return jsonError('Invalid order action.', 400)
  }

  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth?.user) {
    const response = jsonError('You must be signed in.', 401)
    applyCookies(response)
    return response
  }

  const adminDb = createAdminSupabaseClient()
  const { data: orderRow, error: orderError } = await adminDb
    .from('checkout_orders')
    .select('id, user_id, order_number, payment_status, shipping_address, created_at')
    .eq('id', safeOrderId)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (orderError) {
    const response = jsonError('Unable to load order.', 500)
    applyCookies(response)
    return response
  }
  if (!orderRow?.id) {
    const response = jsonError('Order not found.', 404)
    applyCookies(response)
    return response
  }

  const shippingAddress = parseAddressJson(orderRow.shipping_address)
  const currentStatus = toStatusKey(
    String(orderRow.payment_status || ''),
    shippingAddress,
    orderRow.created_at,
  )
  if (!CUSTOMER_CANCEL_ALLOWED_STATUS.has(currentStatus)) {
    const response = jsonError('This order can no longer be cancelled.', 400)
    applyCookies(response)
    return response
  }

  const nowIso = new Date().toISOString()
  const nextShippingAddress = {
    ...shippingAddress,
    orderStatus: 'cancelled',
    order_status: 'cancelled',
    status: 'cancelled',
    statusUpdatedAt: nowIso,
    status_updated_at: nowIso,
  }

  const { error: updateError } = await adminDb
    .from('checkout_orders')
    .update({
      shipping_address: nextShippingAddress,
      updated_at: nowIso,
    })
    .eq('id', safeOrderId)
    .eq('user_id', auth.user.id)

  if (updateError) {
    const response = jsonError('Unable to cancel order.', 500)
    applyCookies(response)
    return response
  }

  const orderNumberLabel = toOrderNumberLabel(String(orderRow.id || ''), String(orderRow.order_number || ''))
  await createNotifications(adminDb, [
    {
      recipient_user_id: String(auth.user.id || ''),
      recipient_role: 'customer',
      title: 'Order cancelled',
      message: `Your order ${orderNumberLabel} has been cancelled.`,
      type: 'order_status',
      severity: 'warning',
      entity_type: 'order',
      entity_id: String(orderRow.id || ''),
      metadata: {
        order_id: String(orderRow.id || ''),
        order_number: orderNumberLabel,
        status: 'cancelled',
        status_label: 'Cancelled',
        action_url: `/UserBackend/orders/${String(orderRow.id || '')}`,
      },
      created_by: String(auth.user.id || '') || null,
    },
  ])
  await notifyAllAdmins(adminDb, {
    title: 'Order cancelled by customer',
    message: `Order ${orderNumberLabel} was cancelled by the customer.`,
    type: 'order_status',
    severity: 'warning',
    entityType: 'order',
    entityId: String(orderRow.id || ''),
    metadata: {
      order_id: String(orderRow.id || ''),
      order_number: orderNumberLabel,
      status: 'cancelled',
      status_label: 'Cancelled',
      action_url: '/backend/admin/orders',
      cancelled_by_user_id: String(auth.user.id || ''),
    },
    createdBy: String(auth.user.id || '') || null,
  })

  const response = jsonOk({
    orderId: String(orderRow.id || ''),
    status: 'cancelled',
    statusLabel: 'Cancelled',
  })
  applyCookies(response)
  return response
}
