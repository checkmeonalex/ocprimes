import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createNotifications } from '@/lib/admin/notifications'

type AnyRecord = Record<string, unknown>

type BrandLinkRow = {
  product_id: string
  admin_brands?:
    | { name?: string | null; created_by?: string | null }
    | Array<{ name?: string | null; created_by?: string | null }>
    | null
}

type CustomerSpendRow = {
  total_amount: number | string | null
}

type VendorItemUpdateRow = {
  id: string
  order_item_id: string
  vendor_user_id: string
  status: string
  note: string | null
  created_at: string
}

const PAYMENT_WINDOW_MINUTES = 2
const PAYMENT_WINDOW_MS = PAYMENT_WINDOW_MINUTES * 60 * 1000

const orderIdParamsSchema = z.object({
  orderId: z.string().trim().min(1),
})

const shippingAddressUpdateSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional().default(''),
  line1: z.string().trim().min(1).max(180),
  line2: z.string().trim().max(180).optional().default(''),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().max(80).optional().default(''),
  postalCode: z.string().trim().max(30).optional().default(''),
  country: z.string().trim().min(1).max(80),
})

const patchBodySchema = z.object({
  shippingAddress: shippingAddressUpdateSchema,
})

const parseAddressJson = (value: unknown): AnyRecord => {
  if (value && typeof value === 'object') return value as AnyRecord
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === 'object') return parsed as AnyRecord
    } catch {
      return {}
    }
  }
  return {}
}

const getManualStatus = (shippingAddress: AnyRecord) =>
  String(
    shippingAddress?.orderStatus ||
      shippingAddress?.order_status ||
      shippingAddress?.status ||
      '',
  )
    .trim()
    .toLowerCase()

const isPendingExpired = (paymentStatus: string, createdAt: unknown) => {
  const normalized = String(paymentStatus || '').trim().toLowerCase()
  if (normalized !== 'pending') return false
  const createdMs = new Date(String(createdAt || '')).getTime()
  if (!Number.isFinite(createdMs)) return false
  return Date.now() - createdMs >= PAYMENT_WINDOW_MS
}

const normalizeStatus = (paymentStatus: string, shippingAddress: AnyRecord, createdAt: unknown) => {
  const manual = getManualStatus(shippingAddress)
  if (manual === 'pending') return 'pending'
  if (manual === 'awaiting_payment') return 'awaiting_payment'
  if (manual === 'payment_failed') return 'payment_failed'
  if (manual === 'delivered') return 'delivered'
  if (manual === 'ready_to_ship') return 'ready_to_ship'
  if (manual === 'out_for_delivery') return 'out_for_delivery'
  if (manual === 'processing') return 'processing'
  if (manual === 'refunded') return 'refunded'
  if (manual === 'cancelled') return 'cancelled'
  if (isPendingExpired(paymentStatus, createdAt)) return 'payment_failed'

  const pay = String(paymentStatus || '').trim().toLowerCase()
  if (pay === 'paid') return 'pending'
  if (pay === 'failed') return 'payment_failed'
  if (pay === 'cancelled') return 'cancelled'
  if (pay === 'refunded') return 'refunded'
  return 'awaiting_payment'
}

const toStatusLabel = (status: string) => {
  if (status === 'pending') return 'Pending'
  if (status === 'awaiting_payment') return 'Awaiting Payment'
  if (status === 'payment_failed') return 'Payment Failed'
  if (status === 'ready_to_ship') return 'Ready To Ship'
  if (status === 'out_for_delivery') return 'Out for delivery'
  return status
    .split('_')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ')
}

const toSellerItemStatusLabel = (status: string) => {
  if (status === 'item_not_available') return 'Item not available'
  if (status === 'packaged_ready_for_shipment') return 'Packaged and ready for shipment'
  if (status === 'handed_to_delivery') return 'Handed to delivery'
  if (status === 'delivered') return 'Delivered'
  return 'Updated'
}

const toOrderNumber = (orderId: string, orderNumber: string) => {
  const clean = String(orderNumber || '').trim()
  if (clean) return clean
  return `#${String(orderId || '').replace(/-/g, '').toUpperCase()}`
}

const toAddressText = (address: AnyRecord) => {
  const parts = [
    String(address?.line1 || address?.streetAddress || address?.address1 || '').trim(),
    String(address?.line2 || '').trim(),
    String(address?.city || '').trim(),
    String(address?.state || '').trim(),
    String(address?.postalCode || '').trim(),
    String(address?.country || '').trim(),
  ].filter(Boolean)
  return parts.join(', ')
}

const fallbackNameFromEmail = (value: string) => {
  const clean = String(value || '').trim()
  if (!clean.includes('@')) return ''
  const local = clean.split('@')[0] || ''
  return local.replace(/[._-]+/g, ' ').trim()
}

const toAuthUserName = (value: unknown) => {
  const metadata = value && typeof value === 'object' ? (value as AnyRecord) : {}
  const fullName = String(metadata.fullName || metadata.full_name || metadata.name || '').trim()
  if (fullName) return fullName
  const firstName = String(metadata.firstName || metadata.first_name || '').trim()
  const lastName = String(metadata.lastName || metadata.last_name || '').trim()
  const merged = `${firstName} ${lastName}`.trim()
  return merged
}

const toAddressField = (address: AnyRecord, keys: string[]) => {
  for (const key of keys) {
    const value = String(address?.[key] || '').trim()
    if (value) return value
  }
  return ''
}

const toAddressShape = (address: AnyRecord, fallbackName = '', fallbackPhone = '') => ({
  fullName:
    toAddressField(address, ['fullName', 'full_name', 'recipientName', 'name']) ||
    fallbackName,
  phone:
    toAddressField(address, ['phone', 'phoneNumber', 'contactPhone']) ||
    fallbackPhone,
  line1: toAddressField(address, ['line1', 'streetAddress', 'address1', 'address_1', 'address_line_1', 'shipping_address_1']),
  line2: toAddressField(address, ['line2', 'address2', 'address_2', 'address_line_2', 'shipping_address_2']),
  city: toAddressField(address, ['city']),
  state: toAddressField(address, ['state', 'region', 'province']),
  postalCode: toAddressField(address, ['postalCode', 'postal_code', 'postcode', 'zip', 'zipCode']),
  country: toAddressField(address, ['country']),
})

const splitName = (value: string) => {
  const clean = String(value || '').trim()
  if (!clean) return { firstName: '', lastName: '' }
  const chunks = clean.split(/\s+/).filter(Boolean)
  if (chunks.length <= 1) return { firstName: chunks[0] || '', lastName: '' }
  return { firstName: chunks[0] || '', lastName: chunks.slice(1).join(' ') }
}

const buildName = (shippingAddress: AnyRecord, billingAddress: AnyRecord, fallbackName = '') => {
  const shippingFull = String(shippingAddress?.fullName || '').trim()
  if (shippingFull) return shippingFull

  const shippingName = String(shippingAddress?.name || shippingAddress?.recipientName || '').trim()
  if (shippingName) return shippingName

  const billingFull = String(billingAddress?.fullName || '').trim()
  if (billingFull) return billingFull

  const billingName = String(billingAddress?.name || billingAddress?.recipientName || '').trim()
  if (billingName) return billingName

  const firstName = String(
    shippingAddress?.firstName ||
      shippingAddress?.first_name ||
      billingAddress?.firstName ||
      billingAddress?.first_name ||
      '',
  ).trim()
  const lastName = String(
    shippingAddress?.lastName ||
      shippingAddress?.last_name ||
      billingAddress?.lastName ||
      billingAddress?.last_name ||
      '',
  ).trim()
  const merged = `${firstName} ${lastName}`.trim()
  if (merged) return merged
  return String(fallbackName || '').trim() || 'Customer'
}

const toPaymentMode = (shippingAddress: AnyRecord) => {
  const method = String(
    shippingAddress?.paymentMethod ||
      shippingAddress?.selectedPaymentMethod ||
      shippingAddress?.payment_method ||
      '',
  )
    .trim()
    .toLowerCase()

  if (method === 'visa') return 'Visa Card'
  if (method === 'mastercard') return 'MasterCard'
  if (method === 'verve') return 'Verve Card'
  if (method === 'amex') return 'American Express'
  if (method === 'paypal') return 'PayPal'
  if (method === 'bank-transfer') return 'Bank Transfer'
  if (method === 'ussd') return 'USSD'
  return 'Online Wallet'
}

const formatDateTime = (value: string) => {
  const timestamp = new Date(value || '').getTime()
  if (Number.isNaN(timestamp)) return '—'
  return new Date(timestamp).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const toNumberSafe = (value: unknown) => {
  const next = Number(value || 0)
  if (!Number.isFinite(next)) return 0
  return next
}

export async function GET(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
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
  const isSellerScoped = actor.isVendor && !actor.isAdmin

  const params = await context.params
  const adminDb = createAdminSupabaseClient()
  const parsedParams = orderIdParamsSchema.safeParse(params)
  if (!parsedParams.success) {
    const response = jsonError('Order id is required.', 400)
    actor.applyCookies(response)
    return response
  }
  const safeOrderId = parsedParams.data.orderId

  const { data: orderRow, error: orderError } = await adminDb
    .from('checkout_orders')
    .select(
      'id, user_id, order_number, paystack_reference, payment_status, currency, subtotal, shipping_fee, tax_amount, protection_fee, total_amount, item_count, created_at, updated_at, shipping_address, billing_address, contact_phone',
    )
    .eq('id', safeOrderId)
    .maybeSingle()

  if (orderError) {
    const response = jsonError('Unable to load order.', 500)
    actor.applyCookies(response)
    return response
  }

  if (!orderRow?.id) {
    const response = jsonError('Order not found.', 404)
    actor.applyCookies(response)
    return response
  }

  const shippingAddress = parseAddressJson(orderRow.shipping_address)
  const billingAddress = parseAddressJson(orderRow.billing_address)

  let userEmail = ''
  let userName = ''
  let userLastSeenAt = ''
  try {
    const { data: userLookup } = await adminDb.auth.admin.getUserById(String(orderRow.user_id || '').trim())
    userEmail = String(userLookup?.user?.email || '').trim()
    userName = toAuthUserName(userLookup?.user?.user_metadata)
    userLastSeenAt = String(
      userLookup?.user?.last_sign_in_at ||
        userLookup?.user?.updated_at ||
        userLookup?.user?.created_at ||
        '',
    ).trim()
  } catch {
    // Best-effort fallback only.
  }

  const [{ data: itemRows, error: itemError }, ordersCountQuery, spendRowsQuery] = await Promise.all([
    adminDb
      .from('checkout_order_items')
      .select(
        'id, product_id, item_key, name, image, selected_variation_label, quantity, unit_price, original_unit_price, line_total, created_at',
      )
      .eq('order_id', orderRow.id)
      .order('created_at', { ascending: true }),
    adminDb
      .from('checkout_orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', orderRow.user_id),
    adminDb
      .from('checkout_orders')
      .select('total_amount')
      .eq('user_id', orderRow.user_id),
  ])

  if (itemError) {
    const response = jsonError('Unable to load order items.', 500)
    actor.applyCookies(response)
    return response
  }

  const productIds = Array.from(
    new Set(
      (Array.isArray(itemRows) ? itemRows : [])
        .map((entry) => String(entry.product_id || '').trim())
        .filter(Boolean),
    ),
  )

  const vendorByProductId = new Map<string, string>()
  const vendorUserIdByProductId = new Map<string, string>()
  if (productIds.length > 0) {
    const { data: brandLinkRows } = await adminDb
      .from('product_brand_links')
      .select('product_id, admin_brands(name, created_by)')
      .in('product_id', productIds)

    ;((brandLinkRows || []) as BrandLinkRow[]).forEach((row) => {
      const productId = String(row.product_id || '')
      if (!productId || vendorByProductId.has(productId)) return

      const relation = row.admin_brands
      const vendorName = Array.isArray(relation)
        ? String(relation[0]?.name || '').trim()
        : String(relation?.name || '').trim()

      if (vendorName) {
        vendorByProductId.set(productId, vendorName)
      }

      const vendorUserId = Array.isArray(relation)
        ? String(relation[0]?.created_by || '').trim()
        : String(relation?.created_by || '').trim()
      if (vendorUserId) {
        vendorUserIdByProductId.set(productId, vendorUserId)
      }
    })
  }

  const status = normalizeStatus(
    String(orderRow.payment_status || ''),
    shippingAddress,
    orderRow.created_at,
  )
  const itemCount = Math.max(1, Number(orderRow.item_count || itemRows?.length || 1))
  const customerName = buildName(
    shippingAddress,
    billingAddress,
    userName || fallbackNameFromEmail(userEmail),
  )
  const shippingText = toAddressText(shippingAddress)
  const billingText = toAddressText(billingAddress) || shippingText
  const shippingShape = toAddressShape(
    shippingAddress,
    customerName,
    String(orderRow.contact_phone || shippingAddress?.phone || shippingAddress?.phoneNumber || '').trim(),
  )

  const rawItems = Array.isArray(itemRows) ? itemRows : []
  const items = rawItems.map((entry) => ({
    id: String(entry.id),
    productId: String(entry.product_id || ''),
    vendor: vendorByProductId.get(String(entry.product_id || '')) || 'OCPRIMES',
    vendorUserId: vendorUserIdByProductId.get(String(entry.product_id || '')) || null,
    name: String(entry.name || 'Product'),
    image: entry.image ? String(entry.image) : null,
    variation: entry.selected_variation_label ? String(entry.selected_variation_label) : 'Standard option',
    quantity: Math.max(1, Number(entry.quantity || 1)),
    unitPrice: Number(entry.unit_price || 0),
    originalUnitPrice:
      entry.original_unit_price !== null && entry.original_unit_price !== undefined
        ? Number(entry.original_unit_price)
        : null,
    lineTotal: Number(entry.line_total || 0),
    isProtected: Number(orderRow.protection_fee || 0) > 0,
  }))
  const scopedItems = isSellerScoped
    ? items.filter((entry) => String(entry.vendorUserId || '').trim() === String(actor.user?.id || '').trim())
    : items
  if (isSellerScoped && scopedItems.length === 0) {
    const response = jsonError('Order not found.', 404)
    actor.applyCookies(response)
    return response
  }
  const scopedItemCount = Math.max(1, scopedItems.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0))
  const scopedItemsTotal = scopedItems.reduce((sum, entry) => sum + Number(entry.lineTotal || 0), 0)
  const scopedItemIds = scopedItems.map((entry) => String(entry.id || '')).filter(Boolean)

  const { data: vendorUpdateRows } = scopedItemIds.length
    ? await adminDb
        .from('checkout_order_item_vendor_updates')
        .select('id, order_item_id, vendor_user_id, status, note, created_at')
        .in('order_item_id', scopedItemIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const latestVendorUpdateByItemId = new Map<string, VendorItemUpdateRow>()
  ;(Array.isArray(vendorUpdateRows) ? (vendorUpdateRows as VendorItemUpdateRow[]) : []).forEach((row) => {
    const key = String(row.order_item_id || '').trim()
    if (!key || latestVendorUpdateByItemId.has(key)) return
    latestVendorUpdateByItemId.set(key, row)
  })

  const scopedItemsWithUpdates = scopedItems.map((entry) => {
    const update = latestVendorUpdateByItemId.get(String(entry.id || '').trim())
    return {
      ...entry,
      sellerStatus: update ? String(update.status || '').trim() : '',
      sellerStatusLabel: update ? toSellerItemStatusLabel(String(update.status || '').trim()) : '',
      sellerStatusNote: update ? String(update.note || '').trim() : '',
      sellerStatusAt: update ? String(update.created_at || '') : '',
    }
  })

  const activity = [
    {
      key: 'created',
      title: 'Order was placed',
      detail: `Order ${toOrderNumber(String(orderRow.id), String(orderRow.order_number || ''))}`,
      at: String(orderRow.created_at || ''),
      tone: 'done',
    },
    ...(String(orderRow.payment_status || '').toLowerCase() === 'paid'
      ? [
          {
            key: 'paid',
            title: 'Payment confirmed',
            detail: 'Payment received successfully.',
            at: String(orderRow.updated_at || orderRow.created_at || ''),
            tone: 'done',
          },
        ]
      : []),
    {
      key: 'status',
      title: `Order ${toStatusLabel(status)}`,
      detail: `Current status: ${toStatusLabel(status)}.`,
      at: String(orderRow.updated_at || orderRow.created_at || ''),
      tone: status === 'cancelled' ? 'danger' : 'active',
    },
    ...(Array.isArray(vendorUpdateRows)
      ? (vendorUpdateRows as VendorItemUpdateRow[]).slice(0, 8).map((row) => ({
          key: `seller-${String(row.id || '')}`,
          title: `Seller marked item as ${toSellerItemStatusLabel(String(row.status || '').trim())}`,
          detail: String(row.note || '').trim() || 'Seller shared a product update for fulfillment.',
          at: String(row.created_at || ''),
          tone: String(row.status || '').trim() === 'item_not_available' ? 'danger' : 'active',
        }))
      : []),
  ]

  const deliveryMethod = String(
    shippingAddress?.shippingLabel ||
      shippingAddress?.selectedShippingOption ||
      shippingAddress?.deliveryMethod ||
      'Standard delivery',
  ).trim()

  const paymentStatusNormalized = String(orderRow.payment_status || '').toLowerCase()
  const paymentStatusLabel =
    paymentStatusNormalized === 'paid'
      ? 'Paid'
      : paymentStatusNormalized === 'failed'
        ? 'Failed'
        : paymentStatusNormalized === 'cancelled'
          ? 'Cancelled'
          : paymentStatusNormalized === 'refunded'
            ? 'Refunded'
            : 'Awaiting Payment'
  const totalSpent = (Array.isArray(spendRowsQuery.data) ? (spendRowsQuery.data as CustomerSpendRow[]) : []).reduce(
    (sum, row) => sum + toNumberSafe(row?.total_amount),
    0,
  )
  const fallbackLastSeenAt = String(orderRow.updated_at || orderRow.created_at || '').trim()
  const lastSeenAt = userLastSeenAt || fallbackLastSeenAt
  const lastSeenLabel = formatDateTime(lastSeenAt)

  const response = jsonOk({
    order: {
      id: String(orderRow.id),
      orderNumber: toOrderNumber(String(orderRow.id), String(orderRow.order_number || '')),
      status,
      statusLabel: toStatusLabel(status),
      paymentStatus: String(orderRow.payment_status || ''),
      paymentStatusLabel,
      createdAt: String(orderRow.created_at || ''),
      createdAtLabel: formatDateTime(String(orderRow.created_at || '')),
      trackId: String(orderRow.paystack_reference || orderRow.id || ''),
      seller: 'OCPRIMES',
      customer: {
        name: customerName,
        email: isSellerScoped
          ? ''
          : String(
              shippingAddress?.email ||
                billingAddress?.email ||
                shippingAddress?.contactEmail ||
                billingAddress?.contactEmail ||
                userEmail ||
                '',
            ).trim(),
        phone: isSellerScoped
          ? ''
          : String(orderRow.contact_phone || shippingAddress?.phone || shippingAddress?.phoneNumber || '').trim(),
        ordersCount: isSellerScoped ? 0 : Math.max(1, Number(ordersCountQuery.count || 1)),
        totalSpent: isSellerScoped ? 0 : totalSpent,
        lastSeenAt: isSellerScoped ? '' : lastSeenAt,
        lastSeenLabel: isSellerScoped ? '' : lastSeenLabel,
      },
      shippingAddress: {
        name: customerName,
        text: isSellerScoped ? 'Address hidden for seller' : shippingText || 'Address not available',
        method: deliveryMethod,
        fullName: isSellerScoped ? '' : shippingShape.fullName || customerName,
        phone: isSellerScoped ? '' : shippingShape.phone,
        line1: isSellerScoped ? '' : shippingShape.line1,
        line2: isSellerScoped ? '' : shippingShape.line2,
        city: isSellerScoped ? '' : shippingShape.city,
        state: isSellerScoped ? '' : shippingShape.state,
        postalCode: isSellerScoped ? '' : shippingShape.postalCode,
        country: isSellerScoped ? '' : shippingShape.country,
      },
      billingAddress: {
        name: customerName,
        text: isSellerScoped ? 'Hidden' : billingText || 'Address not available',
      },
      paymentMode: toPaymentMode(shippingAddress),
      itemCount: isSellerScoped ? scopedItemCount : itemCount,
      unfulfilledCount: status === 'delivered' ? 0 : isSellerScoped ? scopedItemCount : itemCount,
      currency: String(orderRow.currency || 'NGN'),
      subtotal: isSellerScoped ? scopedItemsTotal : Number(orderRow.subtotal || 0),
      shippingFee: Number(orderRow.shipping_fee || 0),
      taxAmount: Number(orderRow.tax_amount || 0),
      protectionFee: Number(orderRow.protection_fee || 0),
      totalAmount: isSellerScoped ? scopedItemsTotal : Number(orderRow.total_amount || 0),
      items: scopedItemsWithUpdates,
      activity,
      permissions: {
        isSellerScoped,
        canUpdateStatus: !isSellerScoped,
        canViewCustomerContact: !isSellerScoped,
        canViewBillingAddress: !isSellerScoped,
        canViewShippingAddress: !isSellerScoped,
        canEditShippingAddress: !isSellerScoped,
        canUpdateItemStatus: isSellerScoped,
      },
    },
  })

  actor.applyCookies(response)
  return response
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const actor = await requireDashboardUser(request)
  if (!actor.user || !actor.isAdmin) {
    const response = jsonError('Unauthorized', 401)
    actor.applyCookies(response)
    return response
  }

  const params = await context.params
  const adminDb = createAdminSupabaseClient()
  const parsedParams = orderIdParamsSchema.safeParse(params)
  if (!parsedParams.success) {
    const response = jsonError('Order id is required.', 400)
    actor.applyCookies(response)
    return response
  }

  const body = await request.json().catch(() => null)
  const parsedBody = patchBodySchema.safeParse(body)
  if (!parsedBody.success) {
    const response = jsonError(parsedBody.error.issues[0]?.message || 'Invalid shipping address payload.', 400)
    actor.applyCookies(response)
    return response
  }

  const orderId = parsedParams.data.orderId
  const shippingInput = parsedBody.data.shippingAddress

  const { data: currentOrder, error: currentOrderError } = await adminDb
    .from('checkout_orders')
    .select('id, user_id, order_number, shipping_address, contact_phone')
    .eq('id', orderId)
    .maybeSingle()

  if (currentOrderError) {
    const response = jsonError('Unable to load order.', 500)
    actor.applyCookies(response)
    return response
  }

  if (!currentOrder?.id) {
    const response = jsonError('Order not found.', 404)
    actor.applyCookies(response)
    return response
  }

  const existingAddress = parseAddressJson(currentOrder.shipping_address)
  const { firstName, lastName } = splitName(shippingInput.fullName)
  const normalizedPhone = String(shippingInput.phone || '').trim()
  const previousShippingShape = toAddressShape(
    existingAddress,
    '',
    String(existingAddress?.phone || existingAddress?.phoneNumber || currentOrder.contact_phone || '').trim(),
  )
  const nextShippingShape = {
    fullName: String(shippingInput.fullName || '').trim(),
    phone: normalizedPhone,
    line1: String(shippingInput.line1 || '').trim(),
    line2: String(shippingInput.line2 || '').trim(),
    city: String(shippingInput.city || '').trim(),
    state: String(shippingInput.state || '').trim(),
    postalCode: String(shippingInput.postalCode || '').trim(),
    country: String(shippingInput.country || '').trim(),
  }
  const hasShippingChanged =
    String(previousShippingShape.fullName || '').trim() !== nextShippingShape.fullName ||
    String(previousShippingShape.phone || '').trim() !== nextShippingShape.phone ||
    String(previousShippingShape.line1 || '').trim() !== nextShippingShape.line1 ||
    String(previousShippingShape.line2 || '').trim() !== nextShippingShape.line2 ||
    String(previousShippingShape.city || '').trim() !== nextShippingShape.city ||
    String(previousShippingShape.state || '').trim() !== nextShippingShape.state ||
    String(previousShippingShape.postalCode || '').trim() !== nextShippingShape.postalCode ||
    String(previousShippingShape.country || '').trim() !== nextShippingShape.country

  const nextShippingAddress: AnyRecord = {
    ...existingAddress,
    fullName: shippingInput.fullName,
    firstName,
    lastName,
    line1: shippingInput.line1,
    line2: shippingInput.line2,
    streetAddress: shippingInput.line1,
    address1: shippingInput.line1,
    address_1: shippingInput.line1,
    address2: shippingInput.line2,
    address_2: shippingInput.line2,
    city: shippingInput.city,
    state: shippingInput.state,
    postalCode: shippingInput.postalCode,
    postcode: shippingInput.postalCode,
    zip: shippingInput.postalCode,
    country: shippingInput.country,
    phone: normalizedPhone,
    phoneNumber: normalizedPhone,
    contactPhone: normalizedPhone,
  }

  const { error: updateError } = await adminDb
    .from('checkout_orders')
    .update({
      shipping_address: nextShippingAddress,
      contact_phone: normalizedPhone || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (updateError) {
    const response = jsonError('Unable to update shipping address.', 500)
    actor.applyCookies(response)
    return response
  }

  const recipientUserId = String(currentOrder.user_id || '').trim()
  if (hasShippingChanged && recipientUserId) {
    const orderNumberLabel = toOrderNumber(String(currentOrder.id), String(currentOrder.order_number || ''))
    await createNotifications(adminDb, [
      {
        recipient_user_id: recipientUserId,
        recipient_role: 'customer',
        title: 'Shipping address updated',
        message: `Delivery details for your order ${orderNumberLabel} were updated.`,
        type: 'order_update',
        severity: 'info',
        entity_type: 'order',
        entity_id: String(currentOrder.id),
        metadata: {
          order_id: String(currentOrder.id),
          order_number: orderNumberLabel,
          change_type: 'shipping_address',
          action_url: `/UserBackend/orders/${String(currentOrder.id)}`,
        },
        created_by: actor.user?.id || null,
      },
    ])
  }

  const nextShippingText = toAddressText(nextShippingAddress)
  const deliveryMethod = String(
    nextShippingAddress?.shippingLabel ||
      nextShippingAddress?.selectedShippingOption ||
      nextShippingAddress?.deliveryMethod ||
      'Standard delivery',
  ).trim()

  const response = jsonOk({
    order: {
      id: orderId,
      customer: {
        name: shippingInput.fullName,
        phone: normalizedPhone,
      },
      shippingAddress: {
        name: shippingInput.fullName,
        text: nextShippingText || 'Address not available',
        method: deliveryMethod,
        fullName: shippingInput.fullName,
        phone: normalizedPhone,
        line1: shippingInput.line1,
        line2: shippingInput.line2,
        city: shippingInput.city,
        state: shippingInput.state,
        postalCode: shippingInput.postalCode,
        country: shippingInput.country,
      },
    },
  })
  actor.applyCookies(response)
  return response
}
