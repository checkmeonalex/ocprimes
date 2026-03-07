'use client'

import { useEffect, useState } from 'react'
import type { SearchSuggestion } from '@/lib/search-suggestions/types'
import {
  hasSearchSuggestionQuery,
  normalizeSearchQuery,
} from '@/lib/search-suggestions/utils'

type UseSearchSuggestionsOptions = {
  query?: string
  limit?: number
  enabled?: boolean
}

const SEARCH_SUGGESTIONS_DEBOUNCE_MS = 180

export function useSearchSuggestions({
  query = '',
  limit = 6,
  enabled = true,
}: UseSearchSuggestionsOptions = {}) {
  const normalizedQuery = normalizeSearchQuery(query)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!enabled || !hasSearchSuggestionQuery(normalizedQuery)) {
      setSuggestions([])
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    const timeoutId = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: normalizedQuery,
          limit: String(limit),
        })
        const response = await fetch(`/api/search-suggestions?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          setSuggestions([])
          return
        }
        setSuggestions(Array.isArray(payload?.suggestions) ? payload.suggestions : [])
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          setSuggestions([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }, SEARCH_SUGGESTIONS_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [enabled, limit, normalizedQuery])

  return {
    suggestions,
    isLoading,
    hasQuery: hasSearchSuggestionQuery(normalizedQuery),
  }
}
