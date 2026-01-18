import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { requireAdmin } from '@/lib/auth/require-admin'

const updateSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
})

export async function GET(request: NextRequest) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const { data, error } = await supabase
    .from('admin_requests')
    .select('id,user_id,email,status,requested_at,reviewed_at,reviewed_by')
    .order('requested_at', { ascending: false })

  if (error) {
    return jsonError('Unable to load requests.', 500)
  }

  const response = jsonOk({ items: data ?? [] })
  applyCookies(response)
  return response
}

export async function PATCH(request: NextRequest) {
  const { supabase, applyCookies, user, isAdmin } = await requireAdmin(request)

  if (!isAdmin || !user) {
    return jsonError('Forbidden.', 403)
  }

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return jsonError('Invalid request.', 400)
  }

  const { requestId, status } = parsed.data

  const { data: existing, error: fetchError } = await supabase
    .from('admin_requests')
    .select('user_id,status')
    .eq('id', requestId)
    .maybeSingle()

  if (fetchError || !existing) {
    return jsonError('Request not found.', 404)
  }

  if (existing.status !== 'pending') {
    return jsonError('Request already processed.', 409)
  }

  const { error: updateError } = await supabase
    .from('admin_requests')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', requestId)

  if (updateError) {
    return jsonError('Unable to update request.', 500)
  }

  if (status === 'approved') {
    const { error: roleError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', existing.user_id)

    if (roleError) {
      return jsonError('Unable to promote user.', 500)
    }

    const { error: userRoleError } = await supabase
      .from('user_roles')
      .update({ role: 'admin' })
      .eq('user_id', existing.user_id)

    if (userRoleError) {
      return jsonError('Unable to promote user role.', 500)
    }
  }

  const response = jsonOk({ success: true })
  applyCookies(response)
  return response
}
