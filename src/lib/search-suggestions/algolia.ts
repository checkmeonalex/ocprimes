import type { SearchSuggestionKind, SearchSuggestionProviderResult } from './types'
import {
  buildSuggestionHref,
  normalizeSearchQuery,
  normalizeSearchText,
  slugifySearchText,
} from './utils'

type AlgoliaHit = Record<string, unknown>

const getAlgoliaConfig = () => {
  const appId = String(process.env.ALGOLIA_APP_ID || '').trim()
  const apiKey = String(process.env.ALGOLIA_SEARCH_API_KEY || '').trim()
  const indexName = String(
    process.env.ALGOLIA_SUGGESTIONS_INDEX_NAME || process.env.ALGOLIA_INDEX_NAME || '',
  ).trim()

  if (!appId || !apiKey || !indexName) return null
  return { appId, apiKey, indexName }
}

const pickFirstString = (...values: unknown[]) => {
  for (const value of values) {
    const text = String(value || '').trim()
    if (text) return text
  }
  return ''
}

const inferKindFromHref = (href: string): SearchSuggestionKind | null => {
  const normalized = normalizeSearchText(href)
  if (!normalized) return null
  if (normalized.startsWith('/product/')) return 'product'
  if (normalized.startsWith('/products/')) return 'category'
  if (normalized.startsWith('/vendors/')) return 'brand'
  return null
}

const inferKind = (hit: AlgoliaHit, href: string): SearchSuggestionKind | null => {
  const rawKind = normalizeSearchText(
    pickFirstString(hit.kind, hit.type, hit.entityType, hit.entity_type, hit.record_type),
  )
  if (rawKind === 'product') return 'product'
  if (rawKind === 'category') return 'category'
  if (rawKind === 'brand' || rawKind === 'vendor' || rawKind === 'store') return 'brand'
  return inferKindFromHref(href)
}

const mapAlgoliaHit = (hit: AlgoliaHit): SearchSuggestionProviderResult | null => {
  const explicitHref = pickFirstString(hit.href, hit.url, hit.path)
  const label = normalizeSearchQuery(pickFirstString(hit.label, hit.name, hit.title, hit.query))
  const slug =
    normalizeSearchQuery(pickFirstString(hit.slug, hit.handle, hit.path_slug)) ||
    slugifySearchText(label)
  const hrefFromKind = explicitHref ? '' : buildSuggestionHref(inferKind(hit, explicitHref || '') || 'product', slug)
  const href = explicitHref || hrefFromKind
  const kind = inferKind(hit, href)

  if (!kind || !label || !href) return null

  return {
    id: pickFirstString(hit.objectID, hit.id, `${kind}:${slug || label}`),
    kind,
    label,
    slug,
    href,
    subtitle: normalizeSearchQuery(
      pickFirstString(hit.subtitle, hit.description, hit.brand_name, hit.category_name, kind),
    ),
    imageUrl: normalizeSearchQuery(
      pickFirstString(hit.imageUrl, hit.image_url, hit.image, hit.thumbnail_url, hit.logo_url),
    ),
    source: 'algolia',
  }
}

export async function getAlgoliaSearchSuggestions(query: string, limit: number) {
  const config = getAlgoliaConfig()
  if (!config) return [] as SearchSuggestionProviderResult[]

  const rawLimit = Math.max(limit, Math.min(12, limit * 2))

  try {
    const response = await fetch(
      `https://${config.appId}-dsn.algolia.net/1/indexes/${encodeURIComponent(config.indexName)}/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Algolia-API-Key': config.apiKey,
          'X-Algolia-Application-Id': config.appId,
        },
        body: JSON.stringify({
          query,
          hitsPerPage: rawLimit,
          analytics: false,
          clickAnalytics: false,
        }),
        cache: 'no-store',
      },
    )

    if (!response.ok) {
      console.error('algolia search failed:', response.status, response.statusText)
      return [] as SearchSuggestionProviderResult[]
    }

    const payload = (await response.json().catch(() => null)) as { hits?: AlgoliaHit[] } | null
    const hits = Array.isArray(payload?.hits) ? payload.hits : []

    return hits
      .map(mapAlgoliaHit)
      .filter((item): item is SearchSuggestionProviderResult => Boolean(item))
      .slice(0, rawLimit)
  } catch (error: any) {
    console.error('algolia search failed:', error?.message || String(error))
    return [] as SearchSuggestionProviderResult[]
  }
}
