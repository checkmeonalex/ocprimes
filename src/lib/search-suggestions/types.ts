export const SEARCH_SUGGESTION_KINDS = ['query', 'product', 'category', 'brand'] as const
export const SEARCH_SUGGESTION_PROVIDERS = ['supabase', 'algolia'] as const

export type SearchSuggestionKind = (typeof SEARCH_SUGGESTION_KINDS)[number]
export type SearchSuggestionProvider = (typeof SEARCH_SUGGESTION_PROVIDERS)[number]

export type SearchSuggestionProviderResult = {
  id: string
  kind: SearchSuggestionKind
  label: string
  slug: string
  href: string
  subtitle: string
  imageUrl: string
  popularity?: number
  source: SearchSuggestionProvider
}

export type SearchSuggestion = {
  id: string
  kind: SearchSuggestionKind
  label: string
  slug: string
  href: string
  subtitle: string
  imageUrl: string
  popularity: number
  sources: SearchSuggestionProvider[]
  score: number
}
