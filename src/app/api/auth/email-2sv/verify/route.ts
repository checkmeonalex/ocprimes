import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { emailCodeSchema } from '@/lib/auth/validation'
import { setEmailTwoStepVerifiedCookie } from '@/lib/auth/two-step-cookies'
import { enforceRateLimit } from '@/lib/security/rate-limit'

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    key: 'auth-email-2sv-verify',
    max: 8,
    windowMs: 60_000,
    message: 'Too many verification attempts. Please wait a minute and try again.',
  })
  if (limited) return limited

  const body = await request.json().catch(() => null)
  const parsed = emailCodeSchema.safeParse(body)

  if (!parsed.success) {
    return jsonError('Invalid verification code.', 400)
  }

  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user?.email) {
    return jsonError('You must be signed in.', 401)
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    email: data.user.email,
    token: parsed.data.code,
    type: 'email',
  })

  if (verifyError) {
    return jsonError('Invalid or expired verification code.', 400)
  }

  const response = jsonOk({ verified: true })
  setEmailTwoStepVerifiedCookie(response, data.user.id)
  applyCookies(response)
  return response
}
