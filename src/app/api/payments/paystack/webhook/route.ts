import { createHmac, timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { fetchCartSnapshot, getCartForUser } from '@/lib/cart/cart-server'
import { filterItemsByCheckoutSelection, parseCheckoutSelectionParam } from '@/lib/cart/checkout-selection'

type PaystackWebhookPayload = {
  event?: string
  data?: {
    id?: number | string
    status?: string
    reference?: string
    amount?: number | string
    currency?: string
  }
}

type CheckoutCartItem = {
  itemId?: string
  key: string
}

const toString = (value: unknown) => String(value || '').trim()

const verifyPaystackSignature = (rawBody: string, signature: string, secretKey: string) => {
  if (!rawBody || !signature || !secretKey) return false
  const expectedHex = createHmac('sha512', secretKey).update(rawBody).digest('hex')
  const expected = Buffer.from(expectedHex, 'hex')
  const received = Buffer.from(signature, 'hex')
  if (expected.length !== received.length) return false
  return timingSafeEqual(expected, received)
}

const clearPurchasedItemsFromCart = async (
  adminDb: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  checkoutSelection: string,
) => {
  if (!userId || !checkoutSelection) return
  const cartQuery = await getCartForUser(adminDb as any, userId)
  if (cartQuery.error || !cartQuery.data?.id) return

  const snapshot = await fetchCartSnapshot(adminDb as any, cartQuery.data.id)
  if (snapshot.error) return

  const selectedKeys = parseCheckoutSelectionParam(checkoutSelection)
  const snapshotItems = (snapshot.items || []) as CheckoutCartItem[]
  const checkoutItems = filterItemsByCheckoutSelection<CheckoutCartItem>(snapshotItems, selectedKeys)
  const itemIdsToDelete = checkoutItems
    .map((item) => String(item.itemId || '').trim())
    .filter(Boolean)

  if (itemIdsToDelete.length === 0) return

  await adminDb
    .from('cart_items')
    .delete()
    .eq('cart_id', cartQuery.data.id)
    .in('id', itemIdsToDelete)

  await adminDb
    .from('carts')
    .update({
      cart_version: Number(cartQuery.data.cart_version || 1) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cartQuery.data.id)
}

export async function POST(request: NextRequest) {
  const secretKey = toString(process.env.PAYSTACK_SECRET_KEY)
  if (!secretKey) {
    return jsonError('Payment gateway is not configured.', 500)
  }

  const signature = toString(request.headers.get('x-paystack-signature'))
  const rawBody = await request.text()

  if (!verifyPaystackSignature(rawBody, signature, secretKey)) {
    return jsonError('Invalid webhook signature.', 401)
  }

  let payload: PaystackWebhookPayload
  try {
    payload = JSON.parse(rawBody) as PaystackWebhookPayload
  } catch {
    return jsonError('Invalid webhook payload.', 400)
  }

  const reference = toString(payload?.data?.reference)
  if (!reference) {
    return jsonOk({ received: true })
  }

  let adminDb: ReturnType<typeof createAdminSupabaseClient>
  try {
    adminDb = createAdminSupabaseClient()
  } catch {
    return jsonError('Payment service unavailable.', 500)
  }

  const orderQuery = await adminDb
    .from('checkout_orders')
    .select('id, user_id, payment_status, total_amount, currency, checkout_selection')
    .eq('paystack_reference', reference)
    .maybeSingle()

  if (orderQuery.error || !orderQuery.data?.id) {
    return jsonOk({ received: true })
  }

  const eventName = toString(payload?.event).toLowerCase()
  const transactionStatus = toString(payload?.data?.status).toLowerCase()
  const transactionId = toString(payload?.data?.id)
  const amountKobo = Number(payload?.data?.amount || 0)
  const currency = toString(payload?.data?.currency).toUpperCase()
  const expectedAmountKobo = Math.round(Number(orderQuery.data.total_amount || 0) * 100)
  const expectedCurrency = toString(orderQuery.data.currency || 'NGN').toUpperCase() || 'NGN'

  const isChargeSuccess = eventName === 'charge.success' || transactionStatus === 'success'
  const isChargeFailure =
    eventName === 'charge.failed' ||
    transactionStatus === 'failed' ||
    transactionStatus === 'abandoned' ||
    transactionStatus === 'reversed'

  if (isChargeSuccess) {
    const amountMatches = Number.isFinite(amountKobo) && amountKobo === expectedAmountKobo
    const currencyMatches = currency && currency === expectedCurrency
    if (!amountMatches || !currencyMatches) {
      await adminDb
        .from('checkout_orders')
        .update({
          payment_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderQuery.data.id)
      return jsonOk({ received: true })
    }

    const currentStatus = toString(orderQuery.data.payment_status).toLowerCase()
    if (currentStatus !== 'paid') {
      await adminDb
        .from('checkout_orders')
        .update({
          payment_status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderQuery.data.id)

      await clearPurchasedItemsFromCart(
        adminDb,
        toString(orderQuery.data.user_id),
        toString(orderQuery.data.checkout_selection),
      )
    }

    return jsonOk({ received: true })
  }

  if (isChargeFailure) {
    const currentStatus = toString(orderQuery.data.payment_status).toLowerCase()
    if (currentStatus !== 'paid') {
      await adminDb
        .from('checkout_orders')
        .update({
          payment_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderQuery.data.id)
    }
  }

  return jsonOk({ received: true })
}
