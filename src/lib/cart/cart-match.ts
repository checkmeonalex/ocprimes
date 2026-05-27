type CartLike = {
  id?: string | number
  selectedVariationId?: string | number | null
  selectedColor?: string | null
  selectedSize?: string | null
}

const normalize = (value: unknown, fallback = 'default') => {
  if (value === undefined || value === null || value === '') return fallback
  return String(value)
}

export const findCartEntry = (
  items: Array<any> | null | undefined,
  product: CartLike | null | undefined,
) => {
  if (!Array.isArray(items) || !product) return null
  const id = normalize(product.id, '')
  if (!id) return null
  const variation = normalize(product.selectedVariationId)
  const color = normalize(product.selectedColor)
  const size = normalize(product.selectedSize)

  const strictMatch =
    items.find((item) => {
      if (!item) return false
      return (
        normalize(item.id, '') === id &&
        normalize(item.selectedVariationId) === variation &&
        normalize(item.selectedColor) === color &&
        normalize(item.selectedSize) === size
      )
    }) || null

  if (strictMatch) return strictMatch

  // Fallback for server-normalized carts where color/size may differ but variation is stable.
  if (variation !== 'default') {
    return (
      items.find((item) => {
        if (!item) return false
        return (
          normalize(item.id, '') === id &&
          normalize(item.selectedVariationId) === variation
        )
      }) || null
    )
  }

  return null
}

export const getCartQuantity = (
  items: Array<any> | null | undefined,
  product: CartLike | null | undefined,
) => {
  const entry = findCartEntry(items, product)
  return entry?.quantity || 0
}
