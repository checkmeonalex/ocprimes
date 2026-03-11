import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { emailCodeSchema } from '@/lib/auth/validation'

export async function POST(request: NextRequest) {
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

  const currentEmail = String(data.user.email || '').trim().toLowerCase()
  const pendingEmailChange = String(
    data.user.user_metadata?.profile?.security?.pendingEmailChange || '',
  )
    .trim()
    .toLowerCase()

  if (!pendingEmailChange) {
    return jsonError('No email change is pending.', 409)
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    email: currentEmail,
    token: parsed.data.code,
    type: 'email',
  })

  if (verifyError) {
    return jsonError('Invalid or expired verification code.', 400)
  }

  const metadata = data.user.user_metadata || {}
  const nextProfile = {
    ...(metadata.profile || {}),
    security: {
      ...(metadata.profile?.security || {}),
      pendingEmailChange: '',
    },
  }

  const { error: updateError } = await supabase.auth.updateUser({
    email: pendingEmailChange,
    data: {
      ...metadata,
      profile: nextProfile,
    },
  })

  if (updateError) {
    return jsonError(updateError.message || 'Unable to update email.', 400)
  }

  const response = jsonOk({
    changed: true,
    message: 'Email change started. Confirm the new email from your inbox to finish updating it.',
  })
  applyCookies(response)
  return response
}
