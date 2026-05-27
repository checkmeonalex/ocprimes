import type { PersonalizationProduct } from '@/lib/personalization/signal-types'
import {
  normalizeAttributePair,
  normalizeAttributeValue,
} from '@/lib/personalization/signal-utils'

const collectSlugs = (items?: Array<{ slug?: string; name?: string }>) => {
  const set = new Set<string>()
  if (!Array.isArray(items)) return set
  items.forEach((item) => {
    const slug = normalizeAttributeValue(item?.slug || item?.name || '')
    if (slug) set.add(slug)
  })
  return set
}

const normalizeAttributeKey = (value: string) =>
  String(value || '').toLowerCase().replace(/^pa_/, '')

export const extractProductFeatures = (product: PersonalizationProduct) => {
  const categories = collectSlugs(product.categories)
  const tags = collectSlugs(product.tags)
  const brands = collectSlugs(product.brands)

  const attributePairs = new Set<string>()
  const attributeValues = new Set<string>()

  if (Array.isArray(product.variations)) {
    product.variations.forEach((variation) => {
      const attributes = variation?.attributes
      if (!attributes || typeof attributes !== 'object') return
      Object.entries(attributes).forEach(([rawKey, rawValue]) => {
        const normalizedKey = normalizeAttributeKey(rawKey)
        const value = normalizeAttributeValue(String(rawValue ?? ''))
        const pair = normalizeAttributePair(`${normalizedKey}=${rawValue}`)
        if (value) attributeValues.add(value)
        if (pair) attributePairs.add(pair)
      })
    })
  }

  return {
    categories,
    tags,
    brands,
    attributePairs,
    attributeValues,
  }
}
