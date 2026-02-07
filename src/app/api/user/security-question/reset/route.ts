import type { NextRequest } from 'next/server'
import { createHash, randomUUID } from 'crypto'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return jsonError('You must be signed in.', 401)
  }

  let payload: { password?: string; question?: string; answer?: string }
  try {
    payload = await request.json()
  } catch {
    return jsonError('Invalid JSON payload.', 400)
  }

  const password = (payload.password || '').trim()
  const question = (payload.question || '').trim()
  const answer = (payload.answer || '').trim()

  if (!password) {
    return jsonError('Password is required.', 400)
  }
  if (!question || !answer) {
    return jsonError('Security question and answer are required.', 400)
  }

  const email = data.user.email || ''
  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    return jsonError('Password verification failed.', 401)
  }

  const metadata = data.user.user_metadata || {}
  const salt = randomUUID()
  const hash = createHash('sha256').update(`${answer}:${salt}`).digest('hex')

  const nextProfile = {
    ...(metadata.profile || {}),
    security: {
      ...(metadata.profile?.security || {}),
      question,
    },
  }

  const { error: updateError } = await supabase.auth.updateUser({
    data: {
      ...metadata,
      profile: nextProfile,
      security_answer_hash: hash,
      security_answer_salt: salt,
    },
  })

  if (updateError) {
    console.error('Security question reset failed:', updateError.message)
    return jsonError('Unable to reset security question.', 500)
  }

  const response = jsonOk({ question })
  applyCookies(response)
  return response
}
