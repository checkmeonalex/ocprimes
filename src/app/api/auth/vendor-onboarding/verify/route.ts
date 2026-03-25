import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { vendorOnboardingVerifySchema } from '@/lib/auth/validation'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { enforceRateLimit } from '@/lib/security/rate-limit'

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    key: 'vendor-onboarding-verify',
    max: 8,
    windowMs: 60_000,
    message: 'Too many verification attempts. Please wait a minute and try again.',
  })
  if (limited) return limited

  const body = await request.json().catch(() => null)
  const parsed = vendorOnboardingVerifySchema.safeParse(body)

  if (!parsed.success) {
    return jsonError('Invalid verification code.', 400)
  }

  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { email, code } = parsed.data

  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: 'magiclink',
  })

  if (error) {
    console.error('Vendor onboarding OTP verification failed:', error.message)
    return jsonError('Invalid or expired verification code.', 400)
  }

  const response = jsonOk({ verified: true })
  applyCookies(response)
  return response
}
