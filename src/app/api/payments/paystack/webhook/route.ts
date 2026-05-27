import { createHmac, timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { fetchCartSnapshot, getCartForUser } from '@/lib/cart/cart-server'
import { filterItemsByCheckoutSelection, parseCheckoutSelectionParam } from '@/lib/cart/checkout-selection'
import { notifyAllAdmins } from '@/lib/admin/notifications'
import { sendAdminTeamAlertToAll } from '@/lib/email/send-admin-team-alert-to-all'
import { mergeOrderLifecycleStatus } from '@/lib/orders/lifecycle-status'
import { deductConfirmedOrderInventory } from '@/lib/payments/order-inventory'

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
    .select('id, user_id, order_number, payment_status, total_amount, currency, checkout_selection, shipping_address')
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
  const isChargeFailure = eventName === 'charge.failed' || transactionStatus === 'failed'

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
          shipping_address: mergeOrderLifecycleStatus(orderQuery.data.shipping_address, 'pending'),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderQuery.data.id)

      const orderNumber =
        toString(orderQuery.data.order_number) ||
        `#${toString(orderQuery.data.id).replace(/-/g, '').toUpperCase()}`
      await deductConfirmedOrderInventory(adminDb, toString(orderQuery.data.id), {
        orderNumber,
        userId: toString(orderQuery.data.user_id),
      })
      await clearPurchasedItemsFromCart(
        adminDb,
        toString(orderQuery.data.user_id),
        toString(orderQuery.data.checkout_selection),
      )

      try {
        await notifyAllAdmins(adminDb, {
          title: `New order received ${orderNumber}`,
          message: 'A customer payment was confirmed and the order is ready for admin review.',
          type: 'order_received',
          severity: 'info',
          entityType: 'order',
          entityId: toString(orderQuery.data.id),
          metadata: {
            order_id: toString(orderQuery.data.id),
            order_number: orderNumber,
            action_url: `/backend/admin/orders/${toString(orderQuery.data.id)}`,
            payment_status: 'paid',
            lifecycle_status: 'pending',
          },
          createdBy: toString(orderQuery.data.user_id),
        })
        await sendAdminTeamAlertToAll({
          adminDb,
          heading: `New order received ${orderNumber}`,
          subheading: 'A customer has completed payment and the order is ready for admin review.',
          previewText: `New order received ${orderNumber}`,
          accentLabel: 'Order details',
          summaryRows: [
            { label: 'Order number', value: orderNumber },
            { label: 'Status', value: 'Pending' },
          ],
          bodyTitle: 'What happened',
          bodyText: 'Payment has been confirmed. Review the order and move it through fulfillment manually.',
          actionLabel: 'Open order',
          actionPath: `/backend/admin/orders/${toString(orderQuery.data.id)}`,
        })
      } catch (notificationError) {
        console.error('admin paid order alert failed:', notificationError)
      }
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
