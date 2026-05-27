import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return jsonError('You must be signed in.', 401)
  }

  const { data: lists, error: listError } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', data.user.id)

  if (listError) {
    console.error('Wishlist status list fetch failed:', listError.message)
    return jsonError('Unable to load wishlist status.', 500)
  }

  const listIds = Array.isArray(lists) ? lists.map((item) => item.id).filter(Boolean) : []
  if (!listIds.length) {
    const response = jsonOk({ productIds: [] })
    applyCookies(response)
    return response
  }

  const { data: items, error: itemsError } = await supabase
    .from('wishlist_items')
    .select('product_id')
    .in('wishlist_id', listIds)

  if (itemsError) {
    console.error('Wishlist status items fetch failed:', itemsError.message)
    return jsonError('Unable to load wishlist status.', 500)
  }

  const seen = new Set<string>()
  const productIds = (Array.isArray(items) ? items : [])
    .map((item) => String(item?.product_id || '').trim())
    .filter((id) => {
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })

  const response = jsonOk({ productIds })
  applyCookies(response)
  return response
}
