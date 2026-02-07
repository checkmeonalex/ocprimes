import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return jsonError('You must be signed in.', 401)
  }

  let payload: { wishlistId?: string }
  try {
    payload = await request.json()
  } catch {
    return jsonError('Invalid JSON payload.', 400)
  }

  const wishlistId = payload.wishlistId
  if (!wishlistId) {
    return jsonError('Wishlist is required.', 400)
  }

  const email = (data.user.email || '').toLowerCase()
  if (!email) {
    return jsonError('Unable to verify user email.', 400)
  }

  const { data: updated, error: updateError } = await supabase
    .from('wishlist_invites')
    .update({ invited_user_id: data.user.id, status: 'accepted' })
    .eq('wishlist_id', wishlistId)
    .eq('invited_email', email)
    .select('id,wishlist_id,invited_email,status')
    .single()

  if (updateError) {
    console.error('Wishlist invite accept failed:', updateError.message)
    return jsonError('Unable to accept invite.', 500)
  }

  const response = jsonOk({ item: updated })
  applyCookies(response)
  return response
}
