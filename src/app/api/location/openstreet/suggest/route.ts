import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const querySchema = z.object({
  field: z.enum(['state', 'city']),
  q: z.string().trim().min(2).max(120),
  country: z.string().trim().max(120).optional().default(''),
  state: z.string().trim().max(120).optional().default(''),
  limit: z.coerce.number().int().min(1).max(5).default(5),
})

const CACHE_TABLE = 'location_suggestion_cache'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7

const normalize = (value: string) => String(value || '').trim().toLowerCase()

const isWorldwideCountry = (value: string) => {
  const normalized = normalize(value)
  return normalized === 'international' || normalized === 'worldwide'
}

const safeLabel = (value: unknown) => String(value || '').trim()

const selectStateLabel = (item: Record<string, unknown>) => {
  const address = (item.address || {}) as Record<string, unknown>
  return (
    safeLabel(address.state) ||
    safeLabel(address.region) ||
    safeLabel(address.county) ||
    safeLabel(item.name) ||
    safeLabel(item.display_name).split(',')[0].trim()
  )
}

const selectCityLabel = (item: Record<string, unknown>) => {
  const address = (item.address || {}) as Record<string, unknown>
  return (
    safeLabel(address.city) ||
    safeLabel(address.town) ||
    safeLabel(address.village) ||
    safeLabel(address.municipality) ||
    safeLabel(address.county) ||
    safeLabel(item.name) ||
    safeLabel(item.display_name).split(',')[0].trim()
  )
}

const dedupeAndTrim = (values: string[], limit: number) => {
  const seen = new Set<string>()
  const output: string[] = []
  for (const value of values) {
    const next = String(value || '').trim()
    if (!next) continue
    const key = next.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    output.push(next)
    if (output.length >= limit) break
  }
  return output
}

const buildCacheKey = ({
  field,
  q,
  country,
  state,
}: {
  field: 'state' | 'city'
  q: string
  country: string
  state: string
}) =>
  [field, normalize(country), normalize(state), normalize(q)]
    .map((part) => part || '-')
    .join('::')

const readSuggestionCache = async (cacheKey: string, limit: number) => {
  try {
    const db = createAdminSupabaseClient()
    const { data, error } = await db
      .from(CACHE_TABLE)
      .select('suggestions, expires_at')
      .eq('cache_key', cacheKey)
      .maybeSingle()

    if (error || !data) return null
    const expiresAt = Date.parse(String(data.expires_at || ''))
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null

    const suggestions = Array.isArray(data.suggestions)
      ? data.suggestions.map((entry) => String(entry || '').trim()).filter(Boolean)
      : []
    return dedupeAndTrim(suggestions, limit)
  } catch {
    return null
  }
}

const writeSuggestionCache = async (params: {
  cacheKey: string
  field: 'state' | 'city'
  query: string
  country: string
  state: string
  suggestions: string[]
}) => {
  const { cacheKey, field, query, country, state, suggestions } = params
  if (!Array.isArray(suggestions)) return

  try {
    const db = createAdminSupabaseClient()
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString()
    await db.from(CACHE_TABLE).upsert(
      {
        cache_key: cacheKey,
        field,
        query_text: query,
        country: country || null,
        state: state || null,
        suggestions,
        source: 'nominatim',
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'cache_key' },
    )
  } catch {
    // ignore cache write errors to keep API resilient
  }
}

const buildQuery = ({
  field,
  q,
  country,
  state,
}: {
  field: 'state' | 'city'
  q: string
  country: string
  state: string
}) => {
  const parts: string[] = [q]
  if (field === 'city' && state) parts.push(state)
  if (country && !isWorldwideCountry(country)) parts.push(country)
  return parts.filter(Boolean).join(', ')
}

export async function GET(request: NextRequest) {
  const parseResult = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parseResult.success) {
    return jsonError('Invalid location query.', 400)
  }

  const { field, q, country, state, limit } = parseResult.data
  const safeLimit = Math.min(5, Math.max(1, limit))
  const cacheKey = buildCacheKey({ field, q, country, state })

  const cachedSuggestions = await readSuggestionCache(cacheKey, safeLimit)
  if (cachedSuggestions !== null) {
    return jsonOk({ suggestions: cachedSuggestions })
  }

  const query = buildQuery({ field, q, country, state })
  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(Math.min(25, Math.max(10, safeLimit * 3))),
    q: query,
  })

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'OCPRIMES/1.0 (address-autocomplete)',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return jsonOk({ suggestions: [] })
    }

    const payload = (await response.json().catch(() => [])) as Array<Record<string, unknown>>
    const mapped = payload.map((entry) =>
      field === 'state' ? selectStateLabel(entry) : selectCityLabel(entry),
    )
    const suggestions = dedupeAndTrim(mapped, safeLimit)
    void writeSuggestionCache({
      cacheKey,
      field,
      query: q,
      country,
      state,
      suggestions,
    })

    return jsonOk({ suggestions })
  } catch {
    return jsonOk({ suggestions: [] })
  }
}
