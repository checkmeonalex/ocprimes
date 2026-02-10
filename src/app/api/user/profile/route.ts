import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { userProfileSchema } from '@/lib/user/profile-schema'
import { createHash, randomUUID } from 'crypto'

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return jsonError('You must be signed in.', 401)
  }

  const metadata = data.user.user_metadata || {}
  const profile = metadata.profile || {}

  const response = jsonOk({
    profile,
    avatar_url: metadata.avatar_url || '',
    email: data.user.email || '',
    linkedProviders: Array.isArray(data.user.app_metadata?.providers)
      ? data.user.app_metadata.providers
      : [],
    hasSecurityAnswer: Boolean(metadata.security_answer_hash),
  })
  applyCookies(response)
  return response
}

export async function PATCH(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return jsonError('You must be signed in.', 401)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return jsonError('Invalid JSON payload.', 400)
  }

  const parsed = userProfileSchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || 'Invalid profile.', 400)
  }

  const metadata = data.user.user_metadata || {}
  const existingProfile = metadata.profile || {}
  const nextProfile = {
    ...parsed.data,
    contactInfo: parsed.data.contactInfo || existingProfile.contactInfo || {},
    deliveryAddress:
      parsed.data.deliveryAddress || existingProfile.deliveryAddress || {},
    addresses: parsed.data.addresses || existingProfile.addresses || [],
    security: {
      ...(existingProfile.security || {}),
      recoveryEmail:
        parsed.data.security?.recoveryEmail ??
        existingProfile.security?.recoveryEmail ??
        '',
      question:
        parsed.data.security?.question ??
        existingProfile.security?.question ??
        '',
      phoneNumber:
        parsed.data.security?.phoneNumber ??
        existingProfile.security?.phoneNumber ??
        '',
      twoStepMethod:
        parsed.data.security?.twoStepMethod ||
        existingProfile.security?.twoStepMethod ||
        'none',
      recoveryCodesGeneratedAt:
        parsed.data.security?.recoveryCodesGeneratedAt ??
        existingProfile.security?.recoveryCodesGeneratedAt ??
        '',
    },
  }

  const updates: Record<string, unknown> = {
    ...metadata,
    profile: nextProfile,
  }

  const question = parsed.data.security?.question?.trim()
  const answer = parsed.data.security?.answer?.trim()
  const hasExistingAnswer = Boolean(metadata.security_answer_hash)
  if (hasExistingAnswer && question && answer) {
    return jsonError('Use reset to change your security question.', 409)
  }
  if (question && answer) {
    const salt = randomUUID()
    const hash = createHash('sha256')
      .update(`${answer}:${salt}`)
      .digest('hex')
    updates.security_answer_hash = hash
    updates.security_answer_salt = salt
  }

  const { error: updateError } = await supabase.auth.updateUser({ data: updates })
  if (updateError) {
    console.error('Profile update failed:', updateError.message)
    return jsonError('Unable to save profile.', 500)
  }

  const response = jsonOk({ profile: nextProfile })
  applyCookies(response)
  return response
}
