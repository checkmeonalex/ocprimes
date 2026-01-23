export const normalizeValue = (value) => {
  if (typeof value === 'string') {
    return value.trim() ? value.trim() : 'default'
  }
  if (typeof value === 'number') {
    return String(value)
  }
  return 'default'
}

export const buildKey = ({
  id,
  selectedVariationId,
  selectedColor,
  selectedSize,
}) => {
  const variation = normalizeValue(selectedVariationId)
  const color = normalizeValue(selectedColor)
  const size = normalizeValue(selectedSize)
  return `${id}-${variation}-${color}-${size}`
}

export const normalizeItem = (item) => ({
  key: buildKey(item),
  id: String(item.id),
  name: item.name,
  slug: item.slug || null,
  price: Number(item.price),
  originalPrice:
    item.originalPrice !== null && item.originalPrice !== undefined
      ? Number(item.originalPrice)
      : null,
  image: item.image || null,
  selectedVariationId: normalizeValue(item.selectedVariationId),
  selectedVariationLabel: item.selectedVariationLabel || null,
  selectedColor: normalizeValue(item.selectedColor),
  selectedSize: normalizeValue(item.selectedSize),
  quantity: Number(item.quantity || 1),
})

export const fromRow = (row) => ({
  key: buildKey({
    id: row.product_id,
    selectedVariationId: row.selected_variation_id,
    selectedColor: row.selected_color,
    selectedSize: row.selected_size,
  }),
  id: row.product_id,
  name: row.name,
  slug: row.slug,
  price: Number(row.price),
  originalPrice: row.original_price !== null ? Number(row.original_price) : null,
  image: row.image,
  selectedVariationId: normalizeValue(row.selected_variation_id),
  selectedVariationLabel: row.selected_variation_label,
  selectedColor: normalizeValue(row.selected_color),
  selectedSize: normalizeValue(row.selected_size),
  quantity: row.quantity,
})
