const normalizeAttributeKey = (value) => String(value || '').toLowerCase().replace(/^pa_/, '')

export const extractVariationValue = (attributes, keys) => {
  if (!attributes || typeof attributes !== 'object') return ''
  const candidates = keys.map(normalizeAttributeKey)
  for (const [key, value] of Object.entries(attributes)) {
    if (!key) continue
    const normalizedKey = normalizeAttributeKey(key)
    if (!candidates.includes(normalizedKey)) continue
    if (value === undefined || value === null) return ''
    return String(value)
  }
  return ''
}

export const deriveOptionsFromVariations = (variations, keys) => {
  const seen = new Set()
  const list = []
  if (!Array.isArray(variations)) return list
  variations.forEach((variation) => {
    const value = extractVariationValue(variation?.attributes, keys)
    if (!value || seen.has(value)) return
    seen.add(value)
    list.push(value)
  })
  return list
}

// Builds { [colorName]: '#rrggbb' } from variation.attributes.color_hex, so a
// custom color (not in colorUtils.mjs's ~15-name lookup) still renders as an
// exact swatch instead of falling back to a generic gray dot.
export const buildColorHexMap = (variations, keys) => {
  const map = {}
  if (!Array.isArray(variations)) return map
  variations.forEach((variation) => {
    const attributes = variation?.attributes
    if (!attributes || typeof attributes !== 'object') return
    const name = extractVariationValue(attributes, keys)
    if (!name || map[name]) return
    const hex = attributes.color_hex
    if (typeof hex === 'string' && hex.trim()) {
      map[name] = hex.trim()
    }
  })
  return map
}

export const buildSwatchImages = (variations, images, keys) => {
  const imageLookup = new Map()
  if (Array.isArray(images)) {
    images.forEach((image) => {
      if (!image || typeof image === 'string') return
      if (!image.id || !image.url) return
      imageLookup.set(String(image.id), image.url)
    })
  }

  const swatches = {}
  if (!Array.isArray(variations)) return swatches
  variations.forEach((variation) => {
    const color = extractVariationValue(variation?.attributes, keys)
    if (!color || swatches[color]) return
    const imageUrl = variation?.image || imageLookup.get(String(variation?.image_id)) || ''
    if (!imageUrl) return
    swatches[color] = imageUrl
  })
  return swatches
}
