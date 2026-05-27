import type { SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_PAYMENT_WINDOW_MINUTES = 10

type ReconcileInput = {
  id: string
  userId?: string | null
  reference: string
  paymentStatus: string
  createdAt: string
  totalAmount: number | string
  currency: string
}

const toString = (value: unknown) => String(value || '').trim()

const isPendingExpired = (createdAt: string, paymentWindowMinutes: number) => {
  const createdAtMs = new Date(String(createdAt || '')).getTime()
  if (!Number.isFinite(createdAtMs)) return false
  const paymentWindowMs = Math.max(1, Number(paymentWindowMinutes || DEFAULT_PAYMENT_WINDOW_MINUTES)) * 60 * 1000
  return Date.now() - createdAtMs >= paymentWindowMs
}

const markOrderPaymentStatus = async (
  adminDb: SupabaseClient,
  orderId: string,
  userId: string,
  nextStatus: 'paid' | 'failed',
) => {
  let query = adminDb
    .from('checkout_orders')
    .update({
      payment_status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (userId) {
    query = query.eq('user_id', userId)
  }

  await query
}

export const reconcilePendingCheckoutOrderPayment = async ({
  adminDb,
  input,
  paymentWindowMinutes = DEFAULT_PAYMENT_WINDOW_MINUTES,
}: {
  adminDb: SupabaseClient
  input: ReconcileInput
  paymentWindowMinutes?: number
}) => {
  const currentPaymentStatus = toString(input.paymentStatus).toLowerCase()
  if (currentPaymentStatus !== 'pending') return currentPaymentStatus || 'pending'

  const orderId = toString(input.id)
  const userId = toString(input.userId)
  const reference = toString(input.reference)
  if (!orderId || !reference) return 'pending'

  if (isPendingExpired(input.createdAt, paymentWindowMinutes)) {
    await markOrderPaymentStatus(adminDb, orderId, userId, 'failed')
    return 'failed'
  }

  const secretKey = toString(process.env.PAYSTACK_SECRET_KEY)
  if (!secretKey) return 'pending'

  try {
    const response = await fetch(
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
    const payload = await response.json().catch(() => null)
    const gatewayStatus = toString(payload?.data?.status).toLowerCase()
    if (!gatewayStatus) return 'pending'

    const amountKobo = Number(payload?.data?.amount || 0)
    const expectedAmountKobo = Math.round(Number(input.totalAmount || 0) * 100)
    const gatewayCurrency = toString(payload?.data?.currency).toUpperCase()
    const expectedCurrency = toString(input.currency || 'NGN').toUpperCase() || 'NGN'
    const amountMatches = Number.isFinite(amountKobo) && amountKobo === expectedAmountKobo
    const currencyMatches = gatewayCurrency && gatewayCurrency === expectedCurrency

    if (gatewayStatus === 'success') {
      const nextStatus: 'paid' | 'failed' = amountMatches && currencyMatches ? 'paid' : 'failed'
      await markOrderPaymentStatus(adminDb, orderId, userId, nextStatus)
      return nextStatus
    }

    if (gatewayStatus === 'failed') {
      await markOrderPaymentStatus(adminDb, orderId, userId, 'failed')
      return 'failed'
    }

    // Keep pending for transient/ambiguous gateway states (e.g. tab closed)
    if (
      gatewayStatus === 'abandoned' ||
      gatewayStatus === 'reversed' ||
      gatewayStatus === 'pending' ||
      gatewayStatus === 'ongoing' ||
      gatewayStatus === 'processing'
    ) {
      return 'pending'
    }
  } catch {
    return 'pending'
  }

  return 'pending'
}
