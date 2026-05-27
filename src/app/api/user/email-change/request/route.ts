import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { emailChangeRequestSchema } from '@/lib/auth/validation'
import { findAuthUserByEmail } from '@/lib/auth/find-user-by-email'
import { generateMagicLinkEmailLink } from '@/lib/auth/supabase-email-links'
import { sendEmailChangeVerificationEmail } from '@/lib/email/send-auth-action-emails'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = emailChangeRequestSchema.safeParse(body)

  if (!parsed.success) {
    return jsonError('Enter a valid new email address.', 400)
  }

  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user?.email) {
    return jsonError('You must be signed in.', 401)
  }

  const currentEmail = String(data.user.email || '').trim().toLowerCase()
  const newEmail = parsed.data.newEmail.trim().toLowerCase()

  if (newEmail === currentEmail) {
    return jsonError('Enter a different email address.', 400)
  }

  const existingUser = await findAuthUserByEmail(newEmail).catch(() => null)
  if (existingUser?.id && existingUser.id !== data.user.id) {
    return jsonError('This email is already in use.', 409)
  }

  try {
    const redirectUrl = new URL('/UserBackend/account-security', request.url)
    redirectUrl.searchParams.set('email_change', '1')
    const metadata = (data.user.user_metadata || {}) as Record<string, unknown>
    const generated = await generateMagicLinkEmailLink({
      email: currentEmail,
      redirectTo: redirectUrl.toString(),
    })
    await sendEmailChangeVerificationEmail({
      to: currentEmail,
      customerName: String(
        metadata.full_name || metadata.name || metadata.first_name || '',
      ).trim(),
      currentEmail,
      newEmail,
      verificationUrl: generated.actionLink,
    })
  } catch (sendError: any) {
    return jsonError(sendError?.message || 'Unable to send verification link.', 400)
  }

  const metadata = data.user.user_metadata || {}
  const nextProfile = {
    ...(metadata.profile || {}),
    security: {
      ...(metadata.profile?.security || {}),
      pendingEmailChange: newEmail,
    },
  }

  const { error: updateError } = await supabase.auth.updateUser({
    data: {
      ...metadata,
      profile: nextProfile,
    },
  })

  if (updateError) {
    return jsonError('Unable to start email change.', 500)
  }

  const response = jsonOk({
    sent: true,
    message: 'We sent a verification link to your current email.',
  })
  applyCookies(response)
  return response
}
