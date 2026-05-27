import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { loginSchema } from '@/lib/auth/validation'
import { jsonError } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'
import { enforceRateLimit } from '@/lib/security/rate-limit'

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    key: 'auth-login',
    max: 10,
    windowMs: 60_000,
    message: 'Too many login attempts. Please wait a minute and try again.',
  })
  if (limited) return limited

  const body = await request.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)

  if (!parsed.success) {
    return jsonError('Email or password is incorrect.', 400)
  }

  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return jsonError('Email or password is incorrect.', 401)
  }

  const userId = data.user?.id
  let role = 'customer'

  if (userId) {
    const roleInfo = await getUserRoleInfoSafe(supabase, userId, data.user?.email || '')
    role = roleInfo.role
  }

  const response = NextResponse.json({ role })
  applyCookies(response)
  return response
}
