import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { getAlgoliaSearchSuggestions } from '@/lib/search-suggestions/algolia'
import { mergeAndRankSearchSuggestions } from '@/lib/search-suggestions/merge'
import {
  normalizeSearchSuggestionsInput,
  searchSuggestionsQuerySchema,
  searchSuggestionsRecordSchema,
} from '@/lib/search-suggestions/schema'
import {
  getSupabaseSearchSuggestions,
  recordSharedSearchQuery,
} from '@/lib/search-suggestions/supabase'
import { hasSearchSuggestionQuery } from '@/lib/search-suggestions/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)

  const parseResult = searchSuggestionsQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parseResult.success) {
    return jsonError('Invalid search query.', 400)
  }

  const query = normalizeSearchSuggestionsInput(parseResult.data.q)
  const { limit } = parseResult.data

  if (!hasSearchSuggestionQuery(query)) {
    const response = jsonOk({ query, suggestions: [] })
    response.headers.set('Cache-Control', 'no-store, max-age=0')
    applyCookies(response)
    return response
  }

  try {
    const [supabaseSuggestions, algoliaSuggestions] = await Promise.all([
      getSupabaseSearchSuggestions(supabase, query, limit),
      getAlgoliaSearchSuggestions(query, limit),
    ])

    const suggestions = mergeAndRankSearchSuggestions(query, [
      ...supabaseSuggestions,
      ...algoliaSuggestions,
    ], limit)

    const response = jsonOk({ query, suggestions })
    response.headers.set('Cache-Control', 'no-store, max-age=0')
    applyCookies(response)
    return response
  } catch (error: any) {
    console.error('search suggestions failed:', error?.message || String(error))
    const response = jsonOk({ query, suggestions: [] })
    response.headers.set('Cache-Control', 'no-store, max-age=0')
    applyCookies(response)
    return response
  }
}

export async function POST(request: NextRequest) {
  let payload: unknown = null
  try {
    payload = await request.json()
  } catch {
    return jsonError('Invalid search query.', 400)
  }

  const parseResult = searchSuggestionsRecordSchema.safeParse(payload)
  if (!parseResult.success) {
    return jsonError('Invalid search query.', 400)
  }

  await recordSharedSearchQuery(parseResult.data.query)
  return jsonOk({ ok: true })
}
