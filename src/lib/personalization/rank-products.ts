import type {
  PersonalizationSignals,
  PersonalizationProduct,
  WeightedSignal,
} from '@/lib/personalization/signal-types'
import { extractProductFeatures } from '@/lib/personalization/product-features'
import { PERSONALIZATION_WEIGHTS } from '@/lib/personalization/signal-weights'
import { hasActiveSignals, normalizeAttributePair } from '@/lib/personalization/signal-utils'

type RankedProduct<T> = {
  item: T
  score: number
  index: number
}

const scoreMatches = (matches: Set<string>, signals: WeightedSignal[]) => {
  if (!matches.size || !signals.length) return 0
  let total = 0
  signals.forEach((signal) => {
    if (!matches.has(signal.id)) return
    total += signal.weight
  })
  return total
}

const scoreAttributeSignals = (
  attributePairs: Set<string>,
  attributeValues: Set<string>,
  signals: WeightedSignal[],
) => {
  if (!signals.length) return 0
  let total = 0
  signals.forEach((signal) => {
    if (!signal?.id) return
    const normalized = normalizeAttributePair(signal.id)
    if (!normalized) return
    if (normalized.includes('=')) {
      if (attributePairs.has(normalized)) total += signal.weight
      return
    }
    if (attributeValues.has(normalized)) total += signal.weight
  })
  return total
}

export const rankProductsWithSignals = <T extends PersonalizationProduct>(
  products: T[],
  signals: PersonalizationSignals,
) => {
  if (!Array.isArray(products) || !products.length) return []
  const hasSignals =
    hasActiveSignals(signals.categories) ||
    hasActiveSignals(signals.tags) ||
    hasActiveSignals(signals.brands) ||
    hasActiveSignals(signals.attributes)
  if (!hasSignals) return products

  const ranked: Array<RankedProduct<T>> = products.map((item, index) => {
    const features = extractProductFeatures(item)
    const categoryScore =
      scoreMatches(features.categories, signals.categories) *
      PERSONALIZATION_WEIGHTS.category
    const tagScore =
      scoreMatches(features.tags, signals.tags) * PERSONALIZATION_WEIGHTS.tag
    const brandScore =
      scoreMatches(features.brands, signals.brands) * PERSONALIZATION_WEIGHTS.brand
    const attributeScore =
      scoreAttributeSignals(
        features.attributePairs,
        features.attributeValues,
        signals.attributes,
      ) * PERSONALIZATION_WEIGHTS.attribute

    return {
      item,
      score: categoryScore + tagScore + brandScore + attributeScore,
      index,
    }
  })

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.index - b.index
  })

  return ranked.map((entry) => entry.item)
}

export const toPersonalizationSignals = (signals: {
  visited_categories?: WeightedSignal[]
  visited_tags?: WeightedSignal[]
  visited_brands?: WeightedSignal[]
  visited_attributes?: WeightedSignal[]
}): PersonalizationSignals => ({
  categories: signals.visited_categories ?? [],
  tags: signals.visited_tags ?? [],
  brands: signals.visited_brands ?? [],
  attributes: signals.visited_attributes ?? [],
})
