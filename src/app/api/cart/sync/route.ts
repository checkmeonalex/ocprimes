import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { cartItemsSchema } from '@/lib/cart/schema'
import { fromRow, normalizeItem, normalizeValue } from '@/lib/cart/utils'

const selectFields =
  'id,cart_id,product_id,name,slug,price,original_price,image,selected_variation_id,selected_variation_label,selected_color,selected_size,is_protected,quantity'

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data: auth, error: authError } = await supabase.auth.getUser()

  if (authError || !auth.user) {
    return jsonError('Unauthorized.', 401)
  }

  const body = await request.json().catch(() => null)
  const parsed = cartItemsSchema.safeParse(body?.items)
  if (!parsed.success) {
    return jsonError('Invalid cart payload.', 400)
  }

  const { data: existingCart, error: cartError } = await supabase
    .from('carts')
    .select('id, cart_version')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (cartError) {
    return jsonError('Unable to load cart.', 500)
  }

  let cartId = existingCart?.id
  let cartVersion = existingCart?.cart_version ?? 1
  if (!cartId) {
    const { data: created, error: createError } = await supabase
      .from('carts')
      .insert({ user_id: auth.user.id })
      .select('id')
      .single()

    if (createError || !created?.id) {
      return jsonError('Unable to create cart.', 500)
    }
    cartId = created.id
    cartVersion = 1
  }

  const { error: colorFixError } = await supabase
    .from('cart_items')
    .update({ selected_color: 'default' })
    .eq('cart_id', cartId)
    .is('selected_color', null)
  if (colorFixError) {
    return jsonError('Unable to normalize cart items.', 500)
  }
  const { error: sizeFixError } = await supabase
    .from('cart_items')
    .update({ selected_size: 'default' })
    .eq('cart_id', cartId)
    .is('selected_size', null)
  if (sizeFixError) {
    return jsonError('Unable to normalize cart items.', 500)
  }

  const { data: existingItems, error: itemsError } = await supabase
    .from('cart_items')
    .select(selectFields)
    .eq('cart_id', cartId)

  if (itemsError) {
    return jsonError('Unable to load cart items.', 500)
  }

  const normalizedIncoming = parsed.data.map(normalizeItem)
  const keyMap = new Map()
  ;(existingItems || []).forEach((item) => {
    const key = `${item.product_id}-${normalizeValue(
      item.selected_variation_id
    )}-${normalizeValue(item.selected_color)}-${normalizeValue(item.selected_size)}`
    keyMap.set(key, item)
  })

  const upsertPayload = normalizedIncoming.map((incoming) => {
    const key = incoming.key
    const match = keyMap.get(key)
    const quantity = match
      ? Math.max(Number(match.quantity || 0), incoming.quantity)
      : incoming.quantity
    const isProtected = match
      ? Boolean(match.is_protected) || Boolean(incoming.isProtected)
      : Boolean(incoming.isProtected)

    return {
      cart_id: cartId,
      product_id: incoming.id,
      name: incoming.name,
      slug: incoming.slug,
      price: incoming.price,
      original_price: incoming.originalPrice,
      image: incoming.image,
      selected_variation_id: incoming.selectedVariationId,
      selected_variation_label: incoming.selectedVariationLabel,
      selected_color: incoming.selectedColor,
      selected_size: incoming.selectedSize,
      is_protected: isProtected,
      quantity,
    }
  })

  if (upsertPayload.length > 0) {
    const { error: upsertError } = await supabase
      .from('cart_items')
      .upsert(upsertPayload, {
        onConflict: 'cart_id,product_id,selected_variation_id,selected_color,selected_size',
      })

    if (upsertError) {
      return jsonError('Unable to sync cart.', 500)
    }
  }

  const { data: mergedItems, error: mergedError } = await supabase
    .from('cart_items')
    .select(selectFields)
    .eq('cart_id', cartId)

  if (mergedError) {
    return jsonError('Unable to load merged cart.', 500)
  }

  let nextVersion = cartVersion
  const { data: updatedCart } = await supabase
    .from('carts')
    .update({ cart_version: cartVersion + 1, updated_at: new Date().toISOString() })
    .eq('id', cartId)
    .select('cart_version')
    .single()
  if (updatedCart?.cart_version) {
    nextVersion = updatedCart.cart_version
  }

  const response = jsonOk({
    items: (mergedItems || []).map(fromRow),
    cartVersion: nextVersion,
  })
  applyCookies(response)
  return response
}
