'use client'

import { normalizeSearchQuery } from '@/lib/search-suggestions/utils'

export async function reportSearchQuery(query: string) {
  const normalizedQuery = normalizeSearchQuery(query)
  if (!normalizedQuery || normalizedQuery.length < 2) return

  try {
    await fetch('/api/search-suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: normalizedQuery }),
      keepalive: true,
    })
  } catch {
    // Ignore telemetry-style write errors so search submit stays responsive.
  }
}
