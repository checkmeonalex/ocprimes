import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { sendEmailOtpCode } from '@/lib/auth/email-otp'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user?.email) {
    return jsonError('You must be signed in.', 401)
  }

  try {
    const redirectUrl = new URL('/verify-login', request.url)
    if (typeof body?.role === 'string' && body.role) {
      redirectUrl.searchParams.set('role', body.role)
    }
    if (typeof body?.next === 'string' && body.next) {
      redirectUrl.searchParams.set('next', body.next)
    }
    await sendEmailOtpCode(supabase, data.user.email, {
      redirectTo: redirectUrl.toString(),
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
