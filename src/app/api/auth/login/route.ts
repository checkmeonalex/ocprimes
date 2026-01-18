import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { loginSchema } from '@/lib/auth/validation'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { getUserRole } from '@/lib/auth/roles'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)

  if (!parsed.success) {
    return jsonError('Invalid email or password.', 400)
  }

  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return jsonError('Invalid email or password.', 401)
  }

  const userId = data.user?.id
  let role = 'customer'

  if (userId) {
    role = await getUserRole(supabase, userId)
  }

  const response = NextResponse.json({ role })
  applyCookies(response)
  return response
}
