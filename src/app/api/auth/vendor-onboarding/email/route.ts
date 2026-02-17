import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { vendorOnboardingEmailSchema } from '@/lib/auth/validation'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = vendorOnboardingEmailSchema.safeParse(body)

  if (!parsed.success) {
    return jsonError('Invalid email address.', 400)
  }

  const email = parsed.data.email.trim().toLowerCase()

  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })

  if (error) {
    console.error('Vendor onboarding email OTP failed:', error.message)
    return jsonError('Unable to send verification code.', 400)
  }

  const response = jsonOk({ sent: true })
  applyCookies(response)
  return response
}
