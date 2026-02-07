import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return jsonError('You must be signed in.', 401)
  }

  let payload: { password?: string }
  try {
    payload = await request.json()
  } catch {
    return jsonError('Invalid JSON payload.', 400)
  }

  const password = (payload.password || '').trim()
  if (!password) {
    return jsonError('Password is required.', 400)
  }

  const email = data.user.email || ''
  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    return jsonError('Password verification failed.', 401)
  }

  const response = jsonOk({ verified: true })
  applyCookies(response)
  return response
}
