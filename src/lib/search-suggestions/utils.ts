import type {
  SearchSuggestion,
  SearchSuggestionKind,
  SearchSuggestionProviderResult,
} from './types'

export const MIN_SEARCH_SUGGESTION_QUERY_LENGTH = 2
export const MAX_SEARCH_SUGGESTION_LIMIT = 6

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'for',
  'from',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
])

export const normalizeSearchQuery = (value: unknown) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')

export const normalizeSearchText = (value: unknown) =>
  normalizeSearchQuery(value).toLowerCase()

export const hasSearchSuggestionQuery = (value: unknown) =>
  normalizeSearchQuery(value).length >= MIN_SEARCH_SUGGESTION_QUERY_LENGTH

export const tokenizeSearchText = (value: unknown) =>
  normalizeSearchText(value)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token))

export const slugifySearchText = (value: unknown) =>
  normalizeSearchText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const toSupabaseLikePattern = (value: unknown) => {
  const normalized = normalizeSearchQuery(value).replace(/[%_]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  return `%${normalized}%`
}

export const buildProductSuggestionHref = (slug: string) =>
  `/product/${encodeURIComponent(slug)}`

export const buildCategorySuggestionHref = (slug: string) =>
  `/products/${encodeURIComponent(slug)}`

export const buildBrandSuggestionHref = (slug: string) =>
  `/vendors/${encodeURIComponent(slug)}`

export const buildQuerySuggestionHref = (query: string) =>
  `/products?search=${encodeURIComponent(normalizeSearchQuery(query))}`

export const buildSuggestionHref = (kind: SearchSuggestionKind, slug: string) => {
  if (!slug) return ''
  if (kind === 'query') return buildQuerySuggestionHref(slug)
  if (kind === 'product') return buildProductSuggestionHref(slug)
  if (kind === 'category') return buildCategorySuggestionHref(slug)
  return buildBrandSuggestionHref(slug)
}

export const buildSuggestionKey = (
  suggestion: Pick<SearchSuggestionProviderResult | SearchSuggestion, 'kind' | 'slug' | 'href' | 'label'>,
) => {
  const slug = normalizeSearchText(suggestion.slug)
  if (slug) return `${suggestion.kind}:${slug}`

  const href = normalizeSearchText(suggestion.href)
  if (href) return `${suggestion.kind}:${href}`

  return `${suggestion.kind}:${normalizeSearchText(suggestion.label)}`
}
