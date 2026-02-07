import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return jsonError('You must be signed in.', 401)
  }

  let payload: { wishlistId?: string; email?: string }
  try {
    payload = await request.json()
  } catch {
    return jsonError('Invalid JSON payload.', 400)
  }

  const wishlistId = payload.wishlistId
  const email = (payload.email || '').trim().toLowerCase()
  if (!wishlistId || !email) {
    return jsonError('Wishlist and email are required.', 400)
  }

  const { data: invite, error: insertError } = await supabase
    .from('wishlist_invites')
    .upsert(
      {
        wishlist_id: wishlistId,
        invited_email: email,
        status: 'pending',
      },
      { onConflict: 'wishlist_id,invited_email' },
    )
    .select('id,wishlist_id,invited_email,status,created_at')
    .single()

  if (insertError) {
    console.error('Wishlist invite failed:', insertError.message)
    return jsonError('Unable to send invite.', 500)
  }

  const response = jsonOk({ item: invite })
  applyCookies(response)
  return response
}
