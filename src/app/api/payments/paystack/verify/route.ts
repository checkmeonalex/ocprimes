import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import {
  fetchCartSnapshot,
  getCartForUser,
} from '@/lib/cart/cart-server'
import { parseCheckoutSelectionParam, filterItemsByCheckoutSelection } from '@/lib/cart/checkout-selection'
import {
  calculateOrderProtectionFee,
  isDigitalProductLike,
  ORDER_PROTECTION_DEFAULTS,
} from '@/lib/order-protection/config'
import {
  CART_SHIPPING_PROGRESS_DEFAULTS,
  normalizeCartShippingProgressConfig,
} from '@/lib/cart/shipping-progress-config'

const SHIPPING_FEE = 5
const TAX_RATE = 0.05

const verifyPayloadSchema = z.object({
  reference: z.string().trim().min(1, 'Payment reference is required.'),
  selected: z.string().trim().optional(),
})

const paystackVerifyResponseSchema = z.object({
  status: z.boolean(),
  message: z.string().optional(),
  data: z
    .object({
      id: z.union([z.number(), z.string()]).optional(),
      status: z.string().optional(),
      reference: z.string().optional(),
      amount: z.union([z.number(), z.string()]).optional(),
      currency: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
})

const toOrderNumber = (id: string) => `#${String(id || '').replace(/-/g, '').toUpperCase()}`
const ORDER_NUMBER_PREFIX = 'OCP'
const ORDER_NUMBER_SUFFIX_LENGTH = 5
const ORDER_NUMBER_MAX_ATTEMPTS = 8

const buildShortOrderNumber = () => {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let index = 0; index < ORDER_NUMBER_SUFFIX_LENGTH; index += 1) {
    const pointer = Math.floor(Math.random() * alphabet.length)
    suffix += alphabet[pointer]
  }
  return `${ORDER_NUMBER_PREFIX}-${yy}${mm}${dd}-${suffix}`
}

const isUniqueViolation = (error: unknown, constraintLike: string) => {
  const next = error && typeof error === 'object' ? (error as { code?: string; message?: string }) : {}
  const code = String(next.code || '').trim()
  const message = String(next.message || '').toLowerCase()
  return code === '23505' || message.includes(String(constraintLike || '').toLowerCase())
}

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
  id: string
  name: string
  price: number
  originalPrice: number | null
  image: string | null
  selectedVariationLabel: string | null
  isProtected: boolean
  isDigital?: boolean
  productType?: string | null
  quantity: number
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

const buildOrderResponse = (order: CheckoutOrderRow, orderItems: CheckoutOrderItemRow[]) => ({
  id: String(order.id),
  orderNumber: String(order.order_number || '').trim() || toOrderNumber(order.id),
  reference: String(order.paystack_reference || ''),
  createdAt: String(order.created_at || ''),
  paymentStatus: String(order.payment_status || 'paid'),
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

export async function POST(request: NextRequest) {
  const secretKey = String(process.env.PAYSTACK_SECRET_KEY || '').trim()
  if (!secretKey) {
    return jsonError('Payment gateway is not configured.', 500)
  }

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

  const reference = parsed.data.reference.trim()
  const selectedParam = String(parsed.data.selected || '').trim()

  const existingOrderQuery = await supabase
    .from('checkout_orders')
    .select('*')
    .eq('user_id', auth.user.id)
    .eq('paystack_reference', reference)
    .maybeSingle()

  if (existingOrderQuery.data?.id) {
    const existingItemsQuery = await supabase
      .from('checkout_order_items')
      .select('*')
      .eq('order_id', existingOrderQuery.data.id)
      .order('created_at', { ascending: true })
    const response = jsonOk({
      order: buildOrderResponse(existingOrderQuery.data, existingItemsQuery.data || []),
      alreadyProcessed: true,
    })
    applyCookies(response)
    return response
  }

  const cartQuery = await getCartForUser(supabase, auth.user.id)
  if (cartQuery.error) {
    const response = jsonError('Unable to load your cart for verification.', 500)
    applyCookies(response)
    return response
  }
  if (!cartQuery.data?.id) {
    const response = jsonError('Your checkout cart is empty.', 400)
    applyCookies(response)
    return response
  }

  const snapshot = await fetchCartSnapshot(supabase, cartQuery.data.id)
  if (snapshot.error) {
    const response = jsonError('Unable to load your cart items.', 500)
    applyCookies(response)
    return response
  }

  const selectedKeys = parseCheckoutSelectionParam(selectedParam || null)
  const snapshotItems = (snapshot.items || []) as CheckoutCartItem[]
  const checkoutItems = filterItemsByCheckoutSelection<CheckoutCartItem>(snapshotItems, selectedKeys).filter(
    (item) => Number(item.quantity || 0) > 0,
  )
  if (checkoutItems.length === 0) {
    const response = jsonError('Your checkout selection is empty.', 400)
    applyCookies(response)
    return response
  }

  const shippingSettingsQuery = await supabase
    .from('cart_shipping_progress_settings')
    .select('enabled, standard_free_shipping_threshold, express_free_shipping_threshold')
    .eq('id', 1)
    .maybeSingle()
  const shippingConfig = shippingSettingsQuery.error || !shippingSettingsQuery.data
    ? normalizeCartShippingProgressConfig(CART_SHIPPING_PROGRESS_DEFAULTS)
    : normalizeCartShippingProgressConfig({
        enabled: shippingSettingsQuery.data.enabled,
        standardFreeShippingThreshold: shippingSettingsQuery.data.standard_free_shipping_threshold,
        expressFreeShippingThreshold: shippingSettingsQuery.data.express_free_shipping_threshold,
      })

  const protectionSettingsQuery = await supabase
    .from('order_protection_settings')
    .select('protection_percentage, minimum_fee, maximum_fee, claim_window_hours')
    .eq('id', 1)
    .maybeSingle()
  const protectionConfig = protectionSettingsQuery.error || !protectionSettingsQuery.data
    ? ORDER_PROTECTION_DEFAULTS
    : {
        percentage: Number(protectionSettingsQuery.data.protection_percentage),
        minimumFee: Number(protectionSettingsQuery.data.minimum_fee),
        maximumFee: Number(protectionSettingsQuery.data.maximum_fee),
        claimWindowHours: Number(protectionSettingsQuery.data.claim_window_hours),
      }

  const subtotal = checkoutItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  )
  const protectedSubtotal = checkoutItems.reduce((sum, item) => {
    if (!item.isProtected || isDigitalProductLike(item)) return sum
    return sum + Number(item.price || 0) * Number(item.quantity || 0)
  }, 0)
  const protectionFee = calculateOrderProtectionFee(protectedSubtotal, protectionConfig)
  const shippingFee =
    subtotal >= Number(shippingConfig.standardFreeShippingThreshold || 50) ? 0 : SHIPPING_FEE
  const taxAmount = Math.round(subtotal * TAX_RATE * 100) / 100
  const expectedTotal = subtotal + shippingFee + taxAmount + protectionFee
  const expectedAmountKobo = Math.round(expectedTotal * 100)

  let paystackVerified: z.infer<typeof paystackVerifyResponseSchema> | null = null
  try {
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      },
    )
    const result = await verifyResponse.json().catch(() => null)
    const parsedVerify = paystackVerifyResponseSchema.safeParse(result)
    if (!verifyResponse.ok || !parsedVerify.success) {
      const response = jsonError('Unable to verify payment with gateway.', 502)
      applyCookies(response)
      return response
    }
    paystackVerified = parsedVerify.data
  } catch {
    const response = jsonError('Unable to verify payment with gateway.', 502)
    applyCookies(response)
    return response
  }

  if (!paystackVerified?.status || String(paystackVerified?.data?.status || '').toLowerCase() !== 'success') {
    const response = jsonError('Payment is not marked as successful by Paystack.', 402)
    applyCookies(response)
    return response
  }

  const paidAmountKobo = Number(paystackVerified?.data?.amount || 0)
  if (!Number.isFinite(paidAmountKobo) || paidAmountKobo !== expectedAmountKobo) {
    const response = jsonError('Payment amount does not match checkout total.', 409)
    applyCookies(response)
    return response
  }

  const paidCurrency = String(paystackVerified?.data?.currency || '').toUpperCase()
  if (paidCurrency !== 'NGN') {
    const response = jsonError('Unsupported payment currency.', 409)
    applyCookies(response)
    return response
  }

  const metadata = paystackVerified?.data?.metadata || {}
  const userProfile =
    auth.user?.user_metadata && typeof auth.user.user_metadata === 'object'
      ? (auth.user.user_metadata as Record<string, unknown>).profile
      : null
  const profileObject =
    userProfile && typeof userProfile === 'object'
      ? (userProfile as Record<string, unknown>)
      : {}
  const profileShippingAddress = normalizeAddressObject(
    profileObject.deliveryAddress ||
      (Array.isArray(profileObject.addresses) ? profileObject.addresses[0] : {}) ||
      {},
  )
  const profileBillingAddress = normalizeAddressObject(
    profileObject.billingAddress ||
      (Array.isArray(profileObject.billingAddresses) ? profileObject.billingAddresses[0] : {}) ||
      {},
  )
  const billingAddress = normalizeAddressObject({
    ...profileBillingAddress,
    label: String(metadata.billing_address_label || profileBillingAddress.label || ''),
    line1: String(metadata.billing_address_line1 || profileBillingAddress.line1 || ''),
    country: String(metadata.billing_address_country || profileBillingAddress.country || ''),
  })
  const selectedPaymentMethod = String(metadata.selected_payment_method || '').trim()
  const selectedPaymentChannel = String(metadata.selected_payment_channel || '').trim()
  const shippingAddress = normalizeAddressObject({
    ...profileShippingAddress,
    label: String(metadata.shipping_address_label || profileShippingAddress.label || ''),
    line1: String(metadata.shipping_address_line1 || profileShippingAddress.line1 || ''),
    line2: String(metadata.shipping_address_line2 || profileShippingAddress.line2 || ''),
    city: String(metadata.shipping_address_city || profileShippingAddress.city || ''),
    state: String(metadata.shipping_address_state || profileShippingAddress.state || ''),
    postalCode: String(
      metadata.shipping_address_postal_code || profileShippingAddress.postalCode || '',
    ),
    country: String(metadata.shipping_address_country || profileShippingAddress.country || ''),
    paymentMethod: selectedPaymentMethod,
    paymentChannel: selectedPaymentChannel,
  })
  const contactPhone = String(metadata.contact_phone || '').trim()

  let orderInsert:
    | {
        data: CheckoutOrderRow | null
        error: unknown
      }
    | {
        data: CheckoutOrderRow
        error: null
      } = { data: null, error: null }

  for (let attempt = 0; attempt < ORDER_NUMBER_MAX_ATTEMPTS; attempt += 1) {
    const candidateOrderNumber = buildShortOrderNumber()
    const insertResult = await supabase
      .from('checkout_orders')
      .insert({
        user_id: auth.user.id,
        order_number: candidateOrderNumber,
        paystack_reference: reference,
        paystack_transaction_id:
          paystackVerified?.data?.id !== undefined && paystackVerified?.data?.id !== null
            ? String(paystackVerified.data.id)
            : null,
        payment_status: 'paid',
        currency: 'NGN',
        subtotal,
        shipping_fee: shippingFee,
        tax_amount: taxAmount,
        protection_fee: protectionFee,
        total_amount: expectedTotal,
        item_count: checkoutItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        contact_phone: contactPhone || null,
        checkout_selection: selectedParam || null,
      })
      .select('*')
      .single()

    if (!insertResult.error && insertResult.data?.id) {
      orderInsert = {
        data: insertResult.data as CheckoutOrderRow,
        error: null,
      }
      break
    }

    if (!isUniqueViolation(insertResult.error, 'order_number')) {
      orderInsert = {
        data: null,
        error: insertResult.error,
      }
      break
    }
  }

  if (orderInsert.error || !orderInsert.data?.id) {
    const duplicateOrder = await supabase
      .from('checkout_orders')
      .select('*')
      .eq('user_id', auth.user.id)
      .eq('paystack_reference', reference)
      .maybeSingle()
    if (!duplicateOrder.data?.id) {
      const response = jsonError('Unable to create checkout order.', 500)
      applyCookies(response)
      return response
    }
    const duplicateItems = await supabase
      .from('checkout_order_items')
      .select('*')
      .eq('order_id', duplicateOrder.data.id)
      .order('created_at', { ascending: true })
    const response = jsonOk({
      order: buildOrderResponse(duplicateOrder.data, duplicateItems.data || []),
      alreadyProcessed: true,
    })
    applyCookies(response)
    return response
  }

  const orderId = orderInsert.data.id
  const orderItemsPayload = checkoutItems.map((item) => ({
    order_id: orderId,
    item_key: String(item.key || ''),
    product_id: String(item.id || ''),
    name: String(item.name || ''),
    image: item.image ? String(item.image) : null,
    selected_variation_label: item.selectedVariationLabel ? String(item.selectedVariationLabel) : null,
    quantity: Number(item.quantity || 0),
    unit_price: Number(item.price || 0),
    original_unit_price:
      item.originalPrice !== null && item.originalPrice !== undefined
        ? Number(item.originalPrice)
        : null,
    line_total: Number(item.price || 0) * Number(item.quantity || 0),
  }))

  if (orderItemsPayload.length > 0) {
    const orderItemsInsert = await supabase.from('checkout_order_items').insert(orderItemsPayload)
    if (orderItemsInsert.error) {
      const response = jsonError('Unable to save order items.', 500)
      applyCookies(response)
      return response
    }
  }

  const itemIdsToDelete = checkoutItems
    .map((item) => String(item.itemId || '').trim())
    .filter(Boolean)
  if (itemIdsToDelete.length > 0) {
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

  const savedItemsQuery = await supabase
    .from('checkout_order_items')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  const response = jsonOk({
    order: buildOrderResponse(orderInsert.data, savedItemsQuery.data || []),
    alreadyProcessed: false,
  })
  applyCookies(response)
  return response
}
