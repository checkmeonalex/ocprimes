import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { fetchCartSnapshot, getCartForUser } from '@/lib/cart/cart-server'
import { filterItemsByCheckoutSelection, parseCheckoutSelectionParam } from '@/lib/cart/checkout-selection'
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
const ORDER_NUMBER_PREFIX = 'OCP'
const ORDER_NUMBER_SUFFIX_LENGTH = 5
const ORDER_NUMBER_MAX_ATTEMPTS = 8

const metadataSchema = z.object({}).catchall(z.union([z.string(), z.number(), z.boolean(), z.null()]))

const initializeSchema = z.object({
  selected: z.string().trim().optional(),
  metadata: metadataSchema.optional(),
})

const toMinorUnits = (amount: number) => Math.round(Number(amount || 0) * 100)
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

const createPaystackReference = () => `ocp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

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

const isUniqueViolation = (error: unknown, constraintLike: string) => {
  const next = error && typeof error === 'object' ? (error as { code?: string; message?: string }) : {}
  const code = String(next.code || '').trim()
  const message = String(next.message || '').toLowerCase()
  return code === '23505' || message.includes(String(constraintLike || '').toLowerCase())
}

export async function POST(request: NextRequest) {
  const secretKey = String(process.env.PAYSTACK_SECRET_KEY || '').trim()
  if (!secretKey) {
    return jsonError('Payment gateway not configured.', 500)
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

  const parsed = initializeSchema.safeParse(payload)
  if (!parsed.success) {
    const response = jsonError(parsed.error.issues[0]?.message || 'Invalid payment payload.', 400)
    applyCookies(response)
    return response
  }

  const cartQuery = await getCartForUser(supabase, auth.user.id)
  if (cartQuery.error || !cartQuery.data?.id) {
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

  const selectedParam = String(parsed.data.selected || '').trim()
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
  const shippingConfig =
    shippingSettingsQuery.error || !shippingSettingsQuery.data
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
  const protectionConfig =
    protectionSettingsQuery.error || !protectionSettingsQuery.data
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
  const amountInKobo = toMinorUnits(expectedTotal)
  if (!Number.isFinite(amountInKobo) || amountInKobo < 100) {
    const response = jsonError('Amount must be at least 1.00.', 400)
    applyCookies(response)
    return response
  }

  const userProfile =
    auth.user?.user_metadata && typeof auth.user.user_metadata === 'object'
      ? (auth.user.user_metadata as Record<string, unknown>).profile
      : null
  const profileObject =
    userProfile && typeof userProfile === 'object'
      ? (userProfile as Record<string, unknown>)
      : {}
  const metadata = parsed.data.metadata || {}
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
    paymentMethod: String(metadata.selected_payment_method || ''),
    paymentChannel: String(metadata.selected_payment_channel || ''),
  })
  const contactPhone = String(metadata.contact_phone || '').trim()
  const payerEmail = String(auth.user.email || metadata.contact_email || '').trim()
  if (!payerEmail) {
    const response = jsonError('A valid contact email is required to continue payment.', 400)
    applyCookies(response)
    return response
  }

  const reference = createPaystackReference()
  let createdOrder: { id: string; order_number?: string | null } | null = null
  for (let attempt = 0; attempt < ORDER_NUMBER_MAX_ATTEMPTS; attempt += 1) {
    const candidateOrderNumber = buildShortOrderNumber()
    const insertResult = await supabase
      .from('checkout_orders')
      .insert({
        user_id: auth.user.id,
        order_number: candidateOrderNumber,
        paystack_reference: reference,
        payment_status: 'pending',
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
      .select('id, order_number')
      .single()

    if (!insertResult.error && insertResult.data?.id) {
      createdOrder = insertResult.data
      break
    }
    if (!isUniqueViolation(insertResult.error, 'order_number')) {
      const response = jsonError('Unable to prepare payment order.', 500)
      applyCookies(response)
      return response
    }
  }

  if (!createdOrder?.id) {
    const response = jsonError('Unable to prepare payment order.', 500)
    applyCookies(response)
    return response
  }

  const orderItemsPayload = checkoutItems.map((item) => ({
    order_id: createdOrder.id,
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
      await supabase.from('checkout_orders').delete().eq('id', createdOrder.id)
      const response = jsonError('Unable to prepare payment items.', 500)
      applyCookies(response)
      return response
    }
  }

  const callbackTarget = new URL('/checkout/paystack-return', request.url)
  if (selectedParam) {
    callbackTarget.searchParams.set('selected', selectedParam)
  }
  const callbackUrl = callbackTarget.toString()

  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: payerEmail,
        amount: amountInKobo,
        currency: 'NGN',
        reference,
        callback_url: callbackUrl,
        metadata: {
          ...(parsed.data.metadata || {}),
          order_id: createdOrder.id,
          checkout_selection: selectedParam || '',
        },
      }),
    })

    const result = await response.json().catch(() => null)
    const statusOk = response.ok && result?.status === true
    if (!statusOk) {
      await supabase.from('checkout_orders').delete().eq('id', createdOrder.id)
      const message = String(result?.message || 'Unable to initialize payment.').trim()
      const errorResponse = jsonError(message || 'Unable to initialize payment.', 502)
      applyCookies(errorResponse)
      return errorResponse
    }

    const successResponse = jsonOk(
      {
        authorization_url: result?.data?.authorization_url || '',
        reference: String(result?.data?.reference || reference),
        access_code: result?.data?.access_code || '',
      },
      200,
    )
    applyCookies(successResponse)
    return successResponse
  } catch {
    await supabase.from('checkout_orders').delete().eq('id', createdOrder.id)
    const response = jsonError('Unable to initialize payment.', 502)
    applyCookies(response)
    return response
  }
}
