import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return jsonError('You must be signed in.', 401)
  }

  const currentEmail = String(data.user.email || '').trim().toLowerCase()
  const pendingEmailChange = String(
    data.user.user_metadata?.profile?.security?.pendingEmailChange || '',
  )
    .trim()
    .toLowerCase()

  if (!currentEmail || !pendingEmailChange) {
    return jsonError('No email change is pending.', 409)
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
    const updateMessage = String(updateError.message || '').toLowerCase()
    if (updateMessage.includes('rate limit')) {
      const response = jsonOk({
        changed: true,
        message: 'Email change is already in progress. Check your new email to finish updating it.',
      })
      applyCookies(response)
      return response
    }
    return jsonError(updateError.message || 'Unable to update email.', 400)
  }

  const response = jsonOk({
    changed: true,
    message: 'Email change started. Confirm the new email from your inbox to finish updating it.',
  })
  applyCookies(response)
  return response
}
