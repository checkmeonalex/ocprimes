import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return jsonError('You must be signed in.', 401)
  }

  let payload: {
    wishlistId?: string
    product?: { id?: string; name?: string; slug?: string; price?: number; image?: string }
  }
  try {
    payload = await request.json()
  } catch {
    return jsonError('Invalid JSON payload.', 400)
  }

  const wishlistId = payload.wishlistId
  const product = payload.product || {}
  if (!wishlistId || !product.id || !product.name || !product.slug) {
    return jsonError('Missing wishlist or product data.', 400)
  }

  const { data: item, error: insertError } = await supabase
    .from('wishlist_items')
    .insert({
      wishlist_id: wishlistId,
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      product_price: product.price || 0,
      product_image: product.image || null,
    })
    .select('id,wishlist_id,product_id,product_name,product_slug,product_price,product_image,created_at')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return jsonError('Item already saved.', 409)
    }
    console.error('Wishlist item insert failed:', insertError.message)
    return jsonError('Unable to save item.', 500)
  }

  const response = jsonOk({ item })
  applyCookies(response)
  return response
}
