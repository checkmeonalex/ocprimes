import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

const schema = z.object({
  confirmation: z.string().trim().min(1),
})

export async function DELETE(request: NextRequest) {
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
    return jsonError(parsed.error.issues[0]?.message || 'Invalid delete payload.', 400)
  }

  if (parsed.data.confirmation !== 'DELETE') {
    return jsonError('Type DELETE to confirm account deletion.', 400)
  }

  const userId = String(userRes.user.id || '').trim()
  if (!userId) return jsonError('User id is missing.', 400)

  const adminDb = createAdminSupabaseClient()

  await adminDb.from('customer_vendor_follows').delete().eq('customer_user_id', userId)

  const { data: ownedBrands } = await adminDb.from('admin_brands').select('id').eq('created_by', userId)
  const ownedBrandIds = Array.isArray(ownedBrands)
    ? ownedBrands.map((item: any) => String(item?.id || '')).filter(Boolean)
    : []
  if (ownedBrandIds.length) {
    await adminDb.from('customer_vendor_follows').delete().in('brand_id', ownedBrandIds)
  }

  await adminDb.from('user_roles').delete().eq('user_id', userId)
  await adminDb.from('profiles').delete().eq('id', userId)

  const { error: deleteError } = await adminDb.auth.admin.deleteUser(userId)
  if (deleteError) {
    console.error('self account delete failed:', deleteError.message)
    return jsonError('Unable to delete account.', 500)
  }

  await supabase.auth.signOut()

  const response = jsonOk({ deleted: true })
  applyCookies(response)
  return response
}
