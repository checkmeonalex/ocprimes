import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { fromRow } from '@/lib/cart/utils'

const selectFields =
  'id,cart_id,product_id,name,slug,price,original_price,image,selected_variation_id,selected_variation_label,selected_color,selected_size,quantity'

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data: auth, error: authError } = await supabase.auth.getUser()

  if (authError || !auth.user) {
    return jsonError('Unauthorized.', 401)
  }

  const { data: cart, error: cartError } = await supabase
    .from('carts')
    .select('id, cart_version')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (cartError) {
    return jsonError('Unable to load cart.', 500)
  }

  if (!cart?.id) {
    const response = jsonOk({ items: [], cartVersion: null })
    applyCookies(response)
    return response
  }

  const { data: items, error: itemsError } = await supabase
    .from('cart_items')
    .select(selectFields)
    .eq('cart_id', cart.id)

  if (itemsError) {
    return jsonError('Unable to load cart items.', 500)
  }

  const response = jsonOk({
    items: (items || []).map(fromRow),
    cartVersion: cart.cart_version,
  })
  applyCookies(response)
  return response
}
