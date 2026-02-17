import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'

const metadataSchema = z
  .object({})
  .catchall(z.union([z.string(), z.number(), z.boolean(), z.null()]))

const initializeSchema = z.object({
  email: z.string().trim().email('A valid email is required.'),
  amount: z.number().positive('Amount must be greater than zero.'),
  currency: z.string().trim().length(3).optional().default('NGN'),
  metadata: metadataSchema.optional(),
})

const toMinorUnits = (amount: number) => Math.round(Number(amount || 0) * 100)

export async function POST(request: NextRequest) {
  const secretKey = String(process.env.PAYSTACK_SECRET_KEY || '').trim()
  if (!secretKey) {
    return jsonError('Payment gateway not configured.', 500)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return jsonError('Invalid JSON payload.', 400)
  }

  const parsed = initializeSchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || 'Invalid payment payload.', 400)
  }

  const amountInKobo = toMinorUnits(parsed.data.amount)
  if (!Number.isFinite(amountInKobo) || amountInKobo < 100) {
    return jsonError('Amount must be at least 1.00.', 400)
  }

  const callbackUrl = new URL('/checkout/review', request.url).toString()

  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: parsed.data.email,
        amount: amountInKobo,
        currency: parsed.data.currency.toUpperCase(),
        callback_url: callbackUrl,
        metadata: parsed.data.metadata || {},
      }),
    })

    const result = await response.json().catch(() => null)
    const statusOk = response.ok && result?.status === true
    if (!statusOk) {
      const message = String(result?.message || 'Unable to initialize payment.').trim()
      return jsonError(message || 'Unable to initialize payment.', 502)
    }

    return jsonOk(
      {
        authorization_url: result?.data?.authorization_url || '',
        reference: result?.data?.reference || '',
        access_code: result?.data?.access_code || '',
      },
      200,
    )
  } catch {
    return jsonError('Unable to initialize payment.', 502)
  }
}
