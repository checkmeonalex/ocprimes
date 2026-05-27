import type { SearchSuggestion, SearchSuggestionProviderResult } from './types'
import { buildSuggestionKey, normalizeSearchText, tokenizeSearchText } from './utils'

const TYPE_WEIGHT = {
  query: 54,
  product: 28,
  category: 20,
  brand: 18,
} as const

const scoreSuggestion = (query: string, suggestion: SearchSuggestion) => {
  const normalizedQuery = normalizeSearchText(query)
  const tokens = tokenizeSearchText(query)
  const label = normalizeSearchText(suggestion.label)
  const slug = normalizeSearchText(suggestion.slug)
  const subtitle = normalizeSearchText(suggestion.subtitle)
  const popularity = Math.max(0, Number(suggestion.popularity) || 0)

  let score = TYPE_WEIGHT[suggestion.kind] || 0
  let matchedTokens = 0

  if (label === normalizedQuery || slug === normalizedQuery) score += 160
  if (label.startsWith(normalizedQuery) || slug.startsWith(normalizedQuery)) score += 90
  if (label.includes(normalizedQuery) || slug.includes(normalizedQuery)) score += 64
  if (subtitle.includes(normalizedQuery)) score += 18

  for (const token of tokens) {
    let tokenMatched = false
    if (label.startsWith(token) || slug.startsWith(token)) {
      score += 34
      tokenMatched = true
    } else if (label.includes(token) || slug.includes(token)) {
      score += 24
      tokenMatched = true
    } else if (subtitle.includes(token)) {
      score += 10
      tokenMatched = true
    }
    if (tokenMatched) matchedTokens += 1
  }

  if (tokens.length) {
    score += Math.round((matchedTokens / tokens.length) * 36)
  }

  if (popularity > 0) {
    score += Math.min(60, Math.round(Math.log2(popularity + 1) * 12))
  }

  score += Math.max(0, suggestion.sources.length - 1) * 28

  if (!matchedTokens && !label.includes(normalizedQuery) && !slug.includes(normalizedQuery)) {
    score -= 120
  }

  return score
}

const mergeSuggestion = (
  current: SearchSuggestion | undefined,
  next: SearchSuggestionProviderResult,
): SearchSuggestion => {
  if (!current) {
    return {
      ...next,
      popularity: Math.max(0, Number(next.popularity) || 0),
      sources: [next.source],
      score: 0,
    }
  }

  const preferNext = next.source === 'supabase'

  return {
    id: preferNext ? next.id || current.id : current.id || next.id,
    kind: current.kind,
    label: preferNext ? next.label || current.label : current.label || next.label,
    slug: preferNext ? next.slug || current.slug : current.slug || next.slug,
    href: preferNext ? next.href || current.href : current.href || next.href,
    subtitle: preferNext ? next.subtitle || current.subtitle : current.subtitle || next.subtitle,
    imageUrl: preferNext ? next.imageUrl || current.imageUrl : current.imageUrl || next.imageUrl,
    popularity: Math.max(
      Number(current.popularity) || 0,
      Number(next.popularity) || 0,
    ),
    sources: current.sources.includes(next.source)
      ? current.sources
      : [...current.sources, next.source],
    score: 0,
  }
}

export function mergeAndRankSearchSuggestions(
  query: string,
  suggestions: SearchSuggestionProviderResult[],
  limit: number,
) {
  const merged = new Map<string, SearchSuggestion>()

  suggestions.forEach((suggestion) => {
    const key = buildSuggestionKey(suggestion)
    if (!key) return
    merged.set(key, mergeSuggestion(merged.get(key), suggestion))
  })

  return Array.from(merged.values())
    .map((suggestion) => ({
      ...suggestion,
      score: scoreSuggestion(query, suggestion),
    }))
    .filter((suggestion) => suggestion.score >= 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (a.kind !== b.kind) return TYPE_WEIGHT[b.kind] - TYPE_WEIGHT[a.kind]
      return a.label.localeCompare(b.label)
    })
    .slice(0, limit)
}
