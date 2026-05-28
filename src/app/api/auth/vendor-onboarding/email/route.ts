import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { vendorOnboardingEmailSchema } from '@/lib/auth/validation'
import {
  ensureAuthUserExistsForMagicLink,
  generateMagicLinkEmailLink,
} from '@/lib/auth/supabase-email-links'
import { findAuthUserByEmail } from '@/lib/auth/find-user-by-email'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { sendVendorVerificationEmail } from '@/lib/email/send-auth-action-emails'
import { enforceRateLimit } from '@/lib/security/rate-limit'

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    key: 'vendor-onboarding-email',
    max: 5,
    windowMs: 60_000,
    message: 'Too many verification requests. Please wait a minute and try again.',
  })
  if (limited) return limited

  const body = await request.json().catch(() => null)
  const parsed = vendorOnboardingEmailSchema.safeParse(body)

  if (!parsed.success) {
    return jsonError('Invalid email address.', 400)
  }

  const email = parsed.data.email.trim().toLowerCase()

  // Check if this email already belongs to an active seller — stop before sending OTP
  try {
    const existingUser = await findAuthUserByEmail(email)
    if (existingUser?.id) {
      const adminClient = createAdminSupabaseClient()
      const roleInfo = await getUserRoleInfoSafe(adminClient, existingUser.id, email)
      if (roleInfo.isVendor || roleInfo.isAdmin) {
        return jsonOk({ sent: false, alreadySeller: true })
      }
    }
  } catch {
    // non-fatal — continue with normal flow
  }

  try {
    await ensureAuthUserExistsForMagicLink(email)
    const generated = await generateMagicLinkEmailLink({
      email,
      redirectTo: new URL('/sellersignup', request.url).toString(),
    })
    await sendVendorVerificationEmail({
      to: email,
      verificationCode: generated.emailOtp,
    })
  } catch (error: any) {
    console.error('Vendor onboarding email OTP failed:', error?.message || error)
    return jsonError('Unable to send verification code.', 400)
  }

  return jsonOk({ sent: true })
}
