import { fromRow, normalizeValue } from '@/lib/cart/utils'

export const CART_ITEM_FIELDS =
  'id,cart_id,product_id,name,slug,price,original_price,image,selected_variation_id,selected_variation_label,selected_color,selected_size,quantity'

export const getCartForUser = async (supabase, userId) =>
  supabase.from('carts').select('id, cart_version').eq('user_id', userId).maybeSingle()

export const ensureCartForUser = async (supabase, userId) => {
  const existing = await getCartForUser(supabase, userId)
  if (existing.data?.id) {
    return existing
  }
  if (existing.error) {
    return existing
  }
  const created = await supabase
    .from('carts')
    .insert({ user_id: userId })
    .select('id, cart_version')
    .single()
  return created
}

export const fetchCartSnapshot = async (supabase, cartId) => {
  const { data, error } = await supabase
    .from('cart_items')
    .select(CART_ITEM_FIELDS)
    .eq('cart_id', cartId)
  if (error) return { items: [], error }
  return { items: (data || []).map(fromRow), error: null }
}

export const bumpCartVersion = async (supabase, cartId, currentVersion) => {
  const { data } = await supabase
    .from('carts')
    .update({ cart_version: currentVersion + 1, updated_at: new Date().toISOString() })
    .eq('id', cartId)
    .select('cart_version')
    .single()
  return data?.cart_version ?? currentVersion + 1
}

export const normalizeSelectionKey = (item) => ({
  product_id: String(item.id),
  selected_variation_id: normalizeValue(item.selectedVariationId),
  selected_color: normalizeValue(item.selectedColor),
  selected_size: normalizeValue(item.selectedSize),
})
