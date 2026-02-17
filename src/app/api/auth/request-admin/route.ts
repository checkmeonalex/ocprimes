import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return jsonError('You must be signed in.', 401)
  }

  const roleInfo = await getUserRoleInfoSafe(supabase, data.user.id, data.user.email || '')
  if (roleInfo.isAdmin) {
    return jsonError('You already have admin access.', 409)
  }

  const { data: existing, error: existingError } = await supabase
    .from('admin_requests')
    .select('id,status')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (existingError) {
    console.error('Admin request lookup failed:', existingError.message)
    return jsonError('Unable to check existing request.', 500)
  }

  if (existing?.status === 'pending') {
    return jsonError('Your admin request is already pending.', 409)
  }

  if (existing?.status === 'approved') {
    return jsonError('Your admin request was already approved.', 409)
  }

  const { error: insertError } = await supabase.from('admin_requests').insert({
    user_id: data.user.id,
    email: data.user.email ?? '',
    status: 'pending',
  })

  if (insertError) {
    console.error('Admin request insert failed:', insertError.message)
    if (insertError.code === '23505') {
      return jsonError('Your admin request is already on file.', 409)
    }
    return jsonError('Unable to submit admin request.', 500)
  }

  const response = jsonOk({ success: true })
  applyCookies(response)
  return response
}
