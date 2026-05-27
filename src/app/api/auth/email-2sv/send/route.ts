import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { sendEmailOtpCode } from '@/lib/auth/email-otp'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { sanitizePlainText } from '@/lib/security/input'

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    key: 'auth-email-2sv-send',
    max: 6,
    windowMs: 60_000,
    message: 'Too many verification link requests. Please wait a minute and try again.',
  })
  if (limited) return limited

  const body = await request.json().catch(() => null)
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user?.email) {
    return jsonError('You must be signed in.', 401)
  }

  try {
    const redirectUrl = new URL('/verify-login', request.url)
    if (typeof body?.role === 'string' && body.role) {
      redirectUrl.searchParams.set('role', sanitizePlainText(body.role))
    }
    if (typeof body?.next === 'string' && body.next) {
      redirectUrl.searchParams.set('next', sanitizePlainText(body.next))
    }
    const metadata = (data.user.user_metadata || {}) as Record<string, unknown>
    await sendEmailOtpCode(data.user.email, {
      redirectTo: redirectUrl.toString(),
      customerName: String(metadata.full_name || metadata.name || metadata.first_name || '').trim(),
    })
  } catch (sendError: any) {
    return jsonError(sendError?.message || 'Unable to send verification link.', 400)
  }

  const response = jsonOk({
    sent: true,
    message: 'A verification link has been sent to your email.',
  })
  applyCookies(response)
  return response
}
