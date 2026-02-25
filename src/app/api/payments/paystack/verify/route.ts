import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { fetchCartSnapshot, getCartForUser } from '@/lib/cart/cart-server'
import { filterItemsByCheckoutSelection, parseCheckoutSelectionParam } from '@/lib/cart/checkout-selection'

const verifyPayloadSchema = z.object({
  reference: z.string().trim().min(1, 'Payment reference is required.'),
})

const PAYMENT_WINDOW_MINUTES = 2
const PAYMENT_WINDOW_MS = PAYMENT_WINDOW_MINUTES * 60 * 1000

type CheckoutOrderRow = {
  id: string
  order_number?: string | null
  paystack_reference: string
  created_at: string
  payment_status: string
  currency: string
  subtotal: number | string
  shipping_fee: number | string
  tax_amount: number | string
  protection_fee: number | string
  total_amount: number | string
  item_count: number | string
  shipping_address?: Record<string, unknown> | null
  billing_address?: Record<string, unknown> | null
  checkout_selection?: string | null
}

type CheckoutOrderItemRow = {
  item_key: string
  product_id: string
  name: string
  image: string | null
  selected_variation_label: string | null
  quantity: number | string
  unit_price: number | string
  original_unit_price: number | string | null
  line_total: number | string
}

type CheckoutCartItem = {
  itemId?: string
  key: string
}

const toOrderNumber = (id: string) => `#${String(id || '').replace(/-/g, '').toUpperCase()}`

const normalizeAddressObject = (input: unknown) => {
  const source = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  return {
    label: String(source.label || ''),
    line1: String(source.line1 || source.address1 || ''),
    line2: String(source.line2 || source.address2 || ''),
    city: String(source.city || ''),
    state: String(source.state || ''),
    postalCode: String(source.postalCode || source.zip || ''),
    country: String(source.country || ''),
    paymentMethod: String(source.paymentMethod || source.selectedPaymentMethod || ''),
    paymentChannel: String(source.paymentChannel || source.selectedPaymentChannel || ''),
  }
}

const mapOrderItemsForClient = (items: CheckoutOrderItemRow[]) =>
  (items || []).map((item) => ({
    key: String(item.item_key || ''),
    id: String(item.product_id || ''),
    name: String(item.name || ''),
    image: item.image ? String(item.image) : null,
    selectedVariationLabel: item.selected_variation_label
      ? String(item.selected_variation_label)
      : null,
    quantity: Number(item.quantity || 0),
    unitPrice: Number(item.unit_price || 0),
    originalUnitPrice:
      item.original_unit_price !== null && item.original_unit_price !== undefined
        ? Number(item.original_unit_price)
        : null,
    lineTotal: Number(item.line_total || 0),
  }))

const buildOrderResponse = (order: CheckoutOrderRow, orderItems: CheckoutOrderItemRow[]) => ({
  id: String(order.id),
  orderNumber: String(order.order_number || '').trim() || toOrderNumber(order.id),
  reference: String(order.paystack_reference || ''),
  createdAt: String(order.created_at || ''),
  paymentStatus: String(order.payment_status || 'pending'),
  currency: String(order.currency || 'NGN'),
  subtotal: Number(order.subtotal || 0),
  shippingFee: Number(order.shipping_fee || 0),
  taxAmount: Number(order.tax_amount || 0),
  protectionFee: Number(order.protection_fee || 0),
  totalAmount: Number(order.total_amount || 0),
  itemCount: Number(order.item_count || 0),
  shippingAddress: normalizeAddressObject(order.shipping_address || {}),
  billingAddress: normalizeAddressObject(order.billing_address || {}),
  items: mapOrderItemsForClient(orderItems),
})

const getExpiryDetails = (createdAt: string) => {
  const createdMs = new Date(createdAt).getTime()
  const expiryMs = Number.isFinite(createdMs) ? createdMs + PAYMENT_WINDOW_MS : Date.now()
  const remainingMs = Math.max(0, expiryMs - Date.now())
  return {
    expiresAt: new Date(expiryMs).toISOString(),
    remainingSeconds: Math.ceil(remainingMs / 1000),
    isExpired: remainingMs <= 0,
  }
}

const paystackVerifyResponseSchema = z.object({
  status: z.boolean().optional(),
  data: z
    .object({
      id: z.union([z.string(), z.number()]).optional(),
      status: z.string().optional(),
      amount: z.union([z.string(), z.number()]).optional(),
      currency: z.string().optional(),
      reference: z.string().optional(),
    })
    .optional(),
})

const clearPurchasedItemsFromCart = async (
  supabase: any,
  userId: string,
  checkoutSelection: string,
) => {
  if (!userId || !checkoutSelection) return
  const cartQuery = await getCartForUser(supabase, userId)
  if (cartQuery.error || !cartQuery.data?.id) return

  const snapshot = await fetchCartSnapshot(supabase, cartQuery.data.id)
  if (snapshot.error) return

  const selectedKeys = parseCheckoutSelectionParam(checkoutSelection)
  const snapshotItems = (snapshot.items || []) as CheckoutCartItem[]
  const checkoutItems = filterItemsByCheckoutSelection<CheckoutCartItem>(snapshotItems, selectedKeys)
  const itemIdsToDelete = checkoutItems
    .map((item) => String(item.itemId || '').trim())
    .filter(Boolean)

  if (itemIdsToDelete.length === 0) return

  await supabase
    .from('cart_items')
    .delete()
    .eq('cart_id', cartQuery.data.id)
    .in('id', itemIdsToDelete)

  await supabase
    .from('carts')
    .update({
      cart_version: Number(cartQuery.data.cart_version || 1) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cartQuery.data.id)
}

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth?.user) {
    const response = jsonError('Sign in to continue checkout.', 401)
    applyCookies(response)
    return response
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    const response = jsonError('Invalid JSON payload.', 400)
    applyCookies(response)
    return response
  }

  const parsed = verifyPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    const response = jsonError(parsed.error.issues[0]?.message || 'Invalid payment request.', 400)
    applyCookies(response)
    return response
  }

  const reference = parsed.data.reference
  const orderQuery = await supabase
    .from('checkout_orders')
    .select('*')
    .eq('user_id', auth.user.id)
    .eq('paystack_reference', reference)
    .maybeSingle()

  if (orderQuery.error) {
    const response = jsonError('Unable to load payment order.', 500)
    applyCookies(response)
    return response
  }

  if (!orderQuery.data?.id) {
    const response = jsonError('Payment order not found.', 404)
    applyCookies(response)
    return response
  }

  let orderRow = orderQuery.data as CheckoutOrderRow
  let paymentStatus = String(orderRow.payment_status || '').trim().toLowerCase()
  let adminDb: ReturnType<typeof createAdminSupabaseClient> | null = null
  try {
    adminDb = createAdminSupabaseClient()
  } catch {
    adminDb = null
  }
  const expiry = getExpiryDetails(String(orderRow.created_at || ''))

  if (paymentStatus === 'pending' && expiry.isExpired && adminDb) {
    const cancelUpdate = await adminDb
      .from('checkout_orders')
      .update({ payment_status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', orderRow.id)
      .select('*')
      .single()

    if (!cancelUpdate.error && cancelUpdate.data?.id) {
      orderRow = cancelUpdate.data as CheckoutOrderRow
      paymentStatus = 'failed'
    } else {
      paymentStatus = 'failed'
    }
  }

  if (paymentStatus === 'pending') {
    const secretKey = String(process.env.PAYSTACK_SECRET_KEY || '').trim()
    if (secretKey) {
      try {
        const verifyResponse = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
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
        const parsedVerify = paystackVerifyResponseSchema.safeParse(verifyPayload)
        const verifyStatus = String(parsedVerify.data?.data?.status || '').toLowerCase()
        const paidAmountKobo = Number(parsedVerify.data?.data?.amount || 0)
        const paidCurrency = String(parsedVerify.data?.data?.currency || '').toUpperCase()
        const expectedAmountKobo = Math.round(Number(orderRow.total_amount || 0) * 100)
        const expectedCurrency = String(orderRow.currency || 'NGN').toUpperCase()
        const isValidSuccess =
          verifyResponse.ok &&
          parsedVerify.success &&
          verifyStatus === 'success' &&
          paidAmountKobo === expectedAmountKobo &&
          paidCurrency === expectedCurrency

        if (isValidSuccess) {
          if (!adminDb) {
            throw new Error('Admin database client unavailable')
          }
          const updatedOrder = await adminDb
            .from('checkout_orders')
            .update({
              payment_status: 'paid',
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderRow.id)
            .select('*')
            .single()

          if (!updatedOrder.error && updatedOrder.data?.id) {
            orderRow = updatedOrder.data as CheckoutOrderRow
            paymentStatus = 'paid'
            await clearPurchasedItemsFromCart(
              supabase,
              String(auth.user.id || ''),
              String(orderRow.checkout_selection || ''),
            )
          }
        }
      } catch {
        // keep awaiting state when gateway verification is temporarily unavailable
      }
    }
  }

  const itemsQuery = await supabase
    .from('checkout_order_items')
    .select('*')
    .eq('order_id', orderRow.id)
    .order('created_at', { ascending: true })

  if (itemsQuery.error) {
    const response = jsonError('Unable to load payment order items.', 500)
    applyCookies(response)
    return response
  }

  const order = buildOrderResponse(orderRow, (itemsQuery.data || []) as CheckoutOrderItemRow[])

  if (paymentStatus === 'paid') {
    const response = jsonOk({
      order,
      alreadyProcessed: true,
    })
    applyCookies(response)
    return response
  }

  if (paymentStatus === 'failed' || paymentStatus === 'cancelled' || paymentStatus === 'refunded') {
    const response = jsonError(
      paymentStatus === 'failed'
        ? 'Payment window expired. This order payment failed.'
        : 'Payment was not successful.',
      402,
    )
    applyCookies(response)
    return response
  }

  const response = jsonOk(
    {
      awaitingConfirmation: true,
      paymentStatus,
      expiresAt: expiry.expiresAt,
      remainingSeconds: expiry.remainingSeconds,
      order,
    },
    202,
  )
  applyCookies(response)
  return response
}
