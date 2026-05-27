import type { SearchSuggestion } from '@/lib/search-suggestions/types'

export function formatSuggestionLabel(suggestion: Pick<SearchSuggestion, 'kind' | 'label'>) {
  if (suggestion.kind === 'category') {
    return `All in ${suggestion.label}`
  }

  return suggestion.label
}
