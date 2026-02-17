import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'

const schema = z
  .object({
    current_password: z.string().min(8).max(128),
    new_password: z.string().min(8).max(128),
    confirm_password: z.string().min(8).max(128),
  })
  .refine((value) => value.new_password === value.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  })
  .refine((value) => value.current_password !== value.new_password, {
    message: 'New password must be different from current password.',
    path: ['new_password'],
  })

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data: userRes, error: userError } = await supabase.auth.getUser()

  if (userError || !userRes.user) {
    return jsonError('You must be signed in.', 401)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return jsonError('Invalid JSON payload.', 400)
  }

  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || 'Invalid password payload.', 400)
  }

  const email = String(userRes.user.email || '').trim()
  if (!email) return jsonError('User email is missing.', 400)

  const verify = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.current_password,
  })
  if (verify.error) {
    return jsonError('Current password is incorrect.', 401)
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
  })
  if (updateError) {
    console.error('password update failed:', updateError.message)
    return jsonError('Unable to update password.', 500)
  }

  const response = jsonOk({ success: true })
  applyCookies(response)
  return response
}
