import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonOk, jsonError } from '@/lib/http/response'
import { findAuthUserByEmail } from '@/lib/auth/find-user-by-email'
import { generateRecoveryEmailLink } from '@/lib/auth/supabase-email-links'
import { sendPasswordResetEmail } from '@/lib/email/send-auth-action-emails'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { sanitizeEmailInput } from '@/lib/security/input'

const schema = z.object({
  email: z.preprocess(sanitizeEmailInput, z.string().email().max(255)),
})

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    key: 'auth-password-reset',
    max: 5,
    windowMs: 60_000,
    message: 'Too many reset attempts. Please wait a minute and try again.',
  })
  if (limited) return limited

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Enter a valid email address.', 400)
  }

  const email = parsed.data.email.trim().toLowerCase()
  const redirectTo = new URL('/reset-password', request.url).toString()

  try {
    const matchedUser = await findAuthUserByEmail(email).catch(() => null)
    if (matchedUser?.email) {
      const generated = await generateRecoveryEmailLink({
        email,
        redirectTo,
      })
      const metadata = (matchedUser.user_metadata || {}) as Record<string, unknown>
      const customerName = String(
        metadata.full_name || metadata.name || metadata.first_name || '',
      ).trim()

      await sendPasswordResetEmail({
        to: email,
        customerName,
        resetUrl: generated.actionLink,
      })
    }
  } catch (error: any) {
    console.error('Password reset route error:', error?.message || error)
    return jsonError('Unable to send reset link right now. Please try again.', 503)
  }

  return jsonOk({
    sent: true,
    message: 'If an account exists for this email, a reset link has been sent.',
  })
}
