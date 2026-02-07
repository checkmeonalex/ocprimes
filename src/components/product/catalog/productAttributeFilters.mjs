const CUSTOM_ATTRIBUTE_EXCLUDE = new Set([
  'id',
  'name',
  'slug',
  'sku',
  'status',
  'created_at',
  'updated_at',
  'description',
  'short_description',
  'image',
  'image_url',
  'images',
  'gallery',
  'variations',
  'categories',
  'tags',
  'brands',
  'price',
  'discount_price',
  'stock',
  'stock_quantity',
  'vendor',
  'brand',
  'category',
  'colors',
  'sizes',
])

const SECTION_EXCLUDE = new Set([
  'color',
  'colors',
  'size',
  'sizes',
  'category',
  'brand',
  'vendor',
  'price',
])

const FIXED_LABELS = {
  condition_check: 'Condition Check',
  packaging_style: 'Packaging Style',
  return_policy: 'Return Policy',
  product_type: 'Product Type',
}

const normalizeKey = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const toTitle = (value = '') =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase())

const normalizeValue = (value) => {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

const ID_VALUE_PATTERN =
  /^(seed-\d+-image-\d+|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i

const humanizeValue = (value = '') => {
  const text = String(value || '').trim()
  if (!text) return ''
  if (ID_VALUE_PATTERN.test(text)) return ''
  if (/[_-]/.test(text)) {
    return toTitle(text)
  }
  return text
}

const tryAddValue = (rows, key, label, value) => {
  const normalizedKey = normalizeKey(key)
  if (!normalizedKey || SECTION_EXCLUDE.has(normalizedKey)) return
  if (normalizedKey.endsWith('_id') || normalizedKey.endsWith('_key')) return
  const normalizedValue = normalizeValue(value)
  const displayValue = humanizeValue(normalizedValue)
  if (!displayValue) return
  rows.push({
    key: normalizedKey,
    label: label || FIXED_LABELS[normalizedKey] || toTitle(normalizedKey),
    value: displayValue,
  })
}

const appendCustomAttributes = (rows, customAttributes) => {
  if (!customAttributes || typeof customAttributes !== 'object') return
  Object.entries(customAttributes).forEach(([rawKey, rawValue]) => {
    const key = normalizeKey(rawKey)
    if (!key || CUSTOM_ATTRIBUTE_EXCLUDE.has(key) || SECTION_EXCLUDE.has(key)) return
    const label = FIXED_LABELS[key] || toTitle(rawKey)
    if (Array.isArray(rawValue)) {
      rawValue.forEach((item) => tryAddValue(rows, key, label, item))
      return
    }
    tryAddValue(rows, key, label, rawValue)
  })
}

const appendVariationAttributes = (rows, variations) => {
  if (!Array.isArray(variations)) return
  variations.forEach((variation) => {
    const attrs = variation?.attributes
    if (!attrs || typeof attrs !== 'object') return
    Object.entries(attrs).forEach(([rawKey, rawValue]) => {
      tryAddValue(rows, rawKey, toTitle(rawKey), rawValue)
    })
  })
}

export const extractDynamicAttributeRows = (product) => {
  const rows = []

  tryAddValue(rows, 'condition_check', 'Condition Check', product?.conditionCheck)
  tryAddValue(rows, 'packaging_style', 'Packaging Style', product?.packagingStyle)
  tryAddValue(rows, 'return_policy', 'Return Policy', product?.returnPolicy)
  tryAddValue(rows, 'product_type', 'Product Type', product?.productType)

  appendCustomAttributes(rows, product?.customAttributes)
  appendVariationAttributes(rows, product?.variations)

  return rows
}

export const buildDynamicAttributeSections = (products = []) => {
  const sectionMap = new Map()

  products.forEach((product) => {
    extractDynamicAttributeRows(product).forEach((row) => {
      const existing = sectionMap.get(row.key) || {
        key: row.key,
        label: row.label,
        values: new Map(),
      }
      const lookup = row.value.toLowerCase()
      if (!existing.values.has(lookup)) {
        existing.values.set(lookup, row.value)
      }
      sectionMap.set(row.key, existing)
    })
  })

  return Array.from(sectionMap.values())
    .map((entry) => ({
      key: entry.key,
      label: entry.label,
      items: Array.from(entry.values.values()),
    }))
    .filter((entry) => entry.items.length > 0)
    .sort((a, b) => {
      if (a.key === 'condition_check') return -1
      if (b.key === 'condition_check') return 1
      return a.label.localeCompare(b.label)
    })
}
