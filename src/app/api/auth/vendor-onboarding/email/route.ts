import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { vendorOnboardingEmailSchema } from '@/lib/auth/validation'
import {
  ensureAuthUserExistsForMagicLink,
  generateMagicLinkEmailLink,
} from '@/lib/auth/supabase-email-links'
import { sendVendorVerificationEmail } from '@/lib/email/send-auth-action-emails'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = vendorOnboardingEmailSchema.safeParse(body)

  if (!parsed.success) {
    return jsonError('Invalid email address.', 400)
  }

  const email = parsed.data.email.trim().toLowerCase()

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
