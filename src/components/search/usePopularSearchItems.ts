'use client'

import { useEffect, useState } from 'react'
import type { PopularSearchItem } from '@/lib/search-popular/schema'

const POPULAR_SEARCH_CACHE_TTL_MS = 5 * 60 * 1000
const POPULAR_SEARCH_MIN_REFRESH_MS = 15 * 1000
const POPULAR_SEARCH_STORAGE_KEY_PREFIX = 'ocp-popular-search-items:'

const popularSearchCache = new Map<
  number,
  {
    items: PopularSearchItem[]
    updatedAt: number
  }
>()

const readPopularSearchCache = (limit: number) => {
  const memoryEntry = popularSearchCache.get(limit)
  if (memoryEntry && Date.now() - memoryEntry.updatedAt <= POPULAR_SEARCH_CACHE_TTL_MS) {
    return memoryEntry
  }

  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(`${POPULAR_SEARCH_STORAGE_KEY_PREFIX}${limit}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed?.items) || typeof parsed?.updatedAt !== 'number') {
      window.sessionStorage.removeItem(`${POPULAR_SEARCH_STORAGE_KEY_PREFIX}${limit}`)
      return null
    }
    if (Date.now() - parsed.updatedAt > POPULAR_SEARCH_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(`${POPULAR_SEARCH_STORAGE_KEY_PREFIX}${limit}`)
      return null
    }

    const cached = {
      items: parsed.items as PopularSearchItem[],
      updatedAt: parsed.updatedAt,
    }
    popularSearchCache.set(limit, cached)
    return cached
  } catch {
    return null
  }
}

const writePopularSearchCache = (limit: number, items: PopularSearchItem[]) => {
  const entry = {
    items,
    updatedAt: Date.now(),
  }

  popularSearchCache.set(limit, entry)

  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(
        `${POPULAR_SEARCH_STORAGE_KEY_PREFIX}${limit}`,
        JSON.stringify(entry),
      )
    } catch {
      // Ignore sessionStorage failures.
    }
  }

  return entry
}

type UsePopularSearchItemsOptions = {
  enabled?: boolean
  limit?: number
}

export function usePopularSearchItems({
  enabled = true,
  limit = 10,
}: UsePopularSearchItemsOptions = {}) {
  const [items, setItems] = useState<PopularSearchItem[]>(() => {
    return readPopularSearchCache(limit)?.items || []
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const cached = readPopularSearchCache(limit)
    if (cached) {
      setItems(cached.items)
      return
    }

    popularSearchCache.delete(limit)
    setItems([])
  }, [limit])

  useEffect(() => {
    if (!enabled) return

    const controller = new AbortController()
    const cached = readPopularSearchCache(limit)
    if (cached?.items?.length) {
      setItems(cached.items)
    }

    const cacheAgeMs = cached ? Date.now() - cached.updatedAt : Number.POSITIVE_INFINITY
    const shouldSkipRefresh = cached && cacheAgeMs < POPULAR_SEARCH_MIN_REFRESH_MS
    if (shouldSkipRefresh) {
      setIsLoading(false)
      return
    }

    setIsLoading(!cached?.items?.length)

    const load = async () => {
      try {
        const params = new URLSearchParams({ limit: String(limit) })
        const response = await fetch(`/api/search-popular-items?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          return
        }
        const nextItems = Array.isArray(payload?.items) ? payload.items : []
        writePopularSearchCache(limit, nextItems)
        setItems(nextItems)
      } catch (error: any) {
        if (error?.name !== 'AbortError' && !cached?.items?.length) {
          setItems([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      controller.abort()
    }
  }, [enabled, limit])

  return {
    items,
    isLoading,
  }
}
