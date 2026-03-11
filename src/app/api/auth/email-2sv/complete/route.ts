import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { setEmailTwoStepVerifiedCookie } from '@/lib/auth/two-step-cookies'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return jsonError('You must be signed in.', 401)
  }

  const roleInfo = await getUserRoleInfoSafe(supabase, data.user.id, data.user.email || '')
  const response = jsonOk({ verified: true, role: roleInfo.role })
  setEmailTwoStepVerifiedCookie(response, data.user.id)
  applyCookies(response)
  return response
}
