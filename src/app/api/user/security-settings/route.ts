import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { securitySettingsSchema } from '@/lib/auth/validation'
import { EMAIL_TWO_STEP_METHOD } from '@/lib/auth/account-security'
import { createSecurityAnswerHash } from '@/lib/auth/security-answer'

const securityPayloadSchema = securitySettingsSchema.extend({
  question: z.string().trim().max(120).optional().or(z.literal('')),
  answer: z.string().trim().max(200).optional().or(z.literal('')),
})

export async function PATCH(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return jsonError('You must be signed in.', 401)
  }

  const body = await request.json().catch(() => null)
  const parsed = securityPayloadSchema.safeParse(body)

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || 'Invalid security settings.', 400)
  }

  const metadata = data.user.user_metadata || {}
  const existingProfile = metadata.profile || {}
  const existingSecurity = existingProfile.security || {}
  const existingContactInfo = existingProfile.contactInfo || {}

  const question = String(parsed.data.question || '').trim()
  const answer = String(parsed.data.answer || '').trim()
  const hasExistingAnswer = Boolean(metadata.security_answer_hash)

  if (!hasExistingAnswer && question && !answer) {
    return jsonError('Answer is required for selected security question.', 400)
  }

  if (hasExistingAnswer && question && answer) {
    return jsonError('Use reset to change your security question.', 409)
  }

  const nextProfile = {
    ...existingProfile,
    contactInfo: {
      ...existingContactInfo,
      phone: parsed.data.phoneNumber ?? existingContactInfo.phone ?? '',
    },
    security: {
      ...existingSecurity,
      recoveryEmail: parsed.data.recoveryEmail ?? existingSecurity.recoveryEmail ?? '',
      phoneNumber: parsed.data.phoneNumber ?? existingSecurity.phoneNumber ?? '',
      twoStepMethod: EMAIL_TWO_STEP_METHOD,
      question: hasExistingAnswer
        ? existingSecurity.question || ''
        : question || existingSecurity.question || '',
    },
  }

  const updates: Record<string, unknown> = {
    ...metadata,
    profile: nextProfile,
  }

  if (!hasExistingAnswer && question && answer) {
    const { hash, salt } = createSecurityAnswerHash(answer)
    updates.security_answer_hash = hash
    updates.security_answer_salt = salt
  }

  const { error: updateError } = await supabase.auth.updateUser({
    data: updates,
  })

  if (updateError) {
    console.error('Security settings update failed:', updateError.message)
    return jsonError('Unable to save security settings.', 500)
  }

  const response = jsonOk({
    profile: nextProfile,
    email: data.user.email || '',
    linkedProviders: Array.isArray(data.user.app_metadata?.providers)
      ? data.user.app_metadata.providers
      : [],
    hasSecurityAnswer: Boolean(updates.security_answer_hash || metadata.security_answer_hash),
  })
  applyCookies(response)
  return response
}
