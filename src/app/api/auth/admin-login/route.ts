import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { loginSchema } from '@/lib/auth/validation'
import { jsonError } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'

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
  if (!userId) {
    return jsonError('Unable to sign in.', 401)
  }

  const roleInfo = await getUserRoleInfoSafe(supabase, userId, data.user?.email || '')
  console.error('Admin login role check:', { userId, role: roleInfo.role, roles: roleInfo.roles })
  if (!roleInfo.isAdmin) {
    await supabase.auth.signOut()
    return jsonError('Admin access not approved.', 403)
  }

  const response = NextResponse.json({ role: 'admin' })
  applyCookies(response)
  return response
}
