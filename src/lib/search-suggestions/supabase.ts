import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import type { SearchSuggestionProviderResult } from './types'
import {
  buildQuerySuggestionHref,
  buildBrandSuggestionHref,
  buildCategorySuggestionHref,
  buildProductSuggestionHref,
  normalizeSearchQuery,
  slugifySearchText,
  toSupabaseLikePattern,
} from './utils'

type SearchProductRow = {
  id?: string | null
  name?: string | null
  slug?: string | null
}

type SearchImageRow = {
  product_id?: string | null
  url?: string | null
}

type SearchCategoryRow = {
  id?: string | null
  name?: string | null
  slug?: string | null
  image_url?: string | null
}

type SearchBrandRow = {
  id?: string | null
  name?: string | null
  slug?: string | null
  logo_url?: string | null
}

const PRODUCT_TABLE = 'products'
const PRODUCT_IMAGES_TABLE = 'product_images'
const CATEGORY_TABLE = 'admin_categories'
const BRAND_TABLE = 'admin_brands'
const QUERY_TABLE = 'search_query_suggestions'

type SearchQueryRow = {
  normalized_query?: string | null
  query_text?: string | null
  search_count?: number | null
}

const getSearchDatabase = (fallback: SupabaseClient) => {
  try {
    return createAdminSupabaseClient()
  } catch {
    return fallback
  }
}

const mergeRowsById = <T extends { id?: string | null }>(groups: T[][], limit: number) => {
  const seen = new Set<string>()
  const merged: T[] = []

  for (const group of groups) {
    for (const row of group) {
      const id = String(row?.id || '').trim()
      if (!id || seen.has(id)) continue
      seen.add(id)
      merged.push(row)
      if (merged.length >= limit) return merged
    }
  }

  return merged
}

const isNonNullable = <T>(value: T): value is NonNullable<T> => value != null

const readRows = async <T>(
  label: string,
  queryPromise: PromiseLike<{ data: T[] | null; error: { message?: string } | null }>,
) => {
  try {
    const { data, error } = await queryPromise
    if (error) {
      console.error(`${label} search failed:`, error.message || 'Unknown error')
      return [] as T[]
    }
    return Array.isArray(data) ? data : []
  } catch (error: any) {
    console.error(`${label} search failed:`, error?.message || String(error))
    return [] as T[]
  }
}

const searchProducts = async (
  db: SupabaseClient,
  query: string,
  rawLimit: number,
): Promise<SearchSuggestionProviderResult[]> => {
  const pattern = toSupabaseLikePattern(query)
  if (!pattern) return []

  const [nameRows, slugRows, skuRows] = await Promise.all([
    readRows<SearchProductRow>(
      'product-name',
      db
        .from(PRODUCT_TABLE)
        .select('id, name, slug')
        .eq('status', 'publish')
        .ilike('name', pattern)
        .order('created_at', { ascending: false })
        .limit(rawLimit),
    ),
    readRows<SearchProductRow>(
      'product-slug',
      db
        .from(PRODUCT_TABLE)
        .select('id, name, slug')
        .eq('status', 'publish')
        .ilike('slug', pattern)
        .order('created_at', { ascending: false })
        .limit(rawLimit),
    ),
    readRows<SearchProductRow>(
      'product-sku',
      db
        .from(PRODUCT_TABLE)
        .select('id, name, slug')
        .eq('status', 'publish')
        .ilike('sku', pattern)
        .order('created_at', { ascending: false })
        .limit(rawLimit),
    ),
  ])

  const rows = mergeRowsById([nameRows, slugRows, skuRows], rawLimit)
  if (!rows.length) return []

  const productIds = rows
    .map((row) => String(row?.id || '').trim())
    .filter(Boolean)

  const imageRows = productIds.length
    ? await readRows<SearchImageRow>(
        'product-images',
        db
          .from(PRODUCT_IMAGES_TABLE)
          .select('product_id, url')
          .in('product_id', productIds)
          .order('sort_order', { ascending: true }),
      )
    : []

  const imageByProductId = new Map<string, string>()
  imageRows.forEach((row) => {
    const productId = String(row?.product_id || '').trim()
    const imageUrl = String(row?.url || '').trim()
    if (!productId || !imageUrl || imageByProductId.has(productId)) return
    imageByProductId.set(productId, imageUrl)
  })

  return rows
    .map((row) => {
      const id = String(row?.id || '').trim()
      const label = normalizeSearchQuery(row?.name)
      const slug = normalizeSearchQuery(row?.slug)
      if (!id || !label || !slug) return null

      return {
        id,
        kind: 'product' as const,
        label,
        slug,
        href: buildProductSuggestionHref(slug),
        subtitle: 'Product',
        imageUrl: imageByProductId.get(id) || '',
        source: 'supabase' as const,
      }
    })
    .filter(isNonNullable)
}

const searchQuerySuggestions = async (
  db: SupabaseClient,
  query: string,
  rawLimit: number,
): Promise<SearchSuggestionProviderResult[]> => {
  const pattern = toSupabaseLikePattern(query)
  if (!pattern) return []

  const [queryTextRows, normalizedRows] = await Promise.all([
    readRows<SearchQueryRow>(
      'shared-query-text',
      db
        .from(QUERY_TABLE)
        .select('normalized_query, query_text, search_count')
        .ilike('query_text', pattern)
        .order('search_count', { ascending: false })
        .order('last_searched_at', { ascending: false })
        .limit(rawLimit),
    ),
    readRows<SearchQueryRow>(
      'shared-query-normalized',
      db
        .from(QUERY_TABLE)
        .select('normalized_query, query_text, search_count')
        .ilike('normalized_query', pattern)
        .order('search_count', { ascending: false })
        .order('last_searched_at', { ascending: false })
        .limit(rawLimit),
    ),
  ])

  const seen = new Set<string>()
  const rows = [...queryTextRows, ...normalizedRows].filter((row) => {
    const normalizedQuery = normalizeSearchQuery(row?.normalized_query)
    if (!normalizedQuery || seen.has(normalizedQuery)) return false
    seen.add(normalizedQuery)
    return true
  })

  return rows
    .map((row) => {
      const normalizedQuery = normalizeSearchQuery(row?.normalized_query)
      const label = normalizeSearchQuery(row?.query_text)
      if (!normalizedQuery || !label) return null

      return {
        id: normalizedQuery,
        kind: 'query' as const,
        label,
        slug: label,
        href: buildQuerySuggestionHref(label),
        subtitle: 'Recent search',
        imageUrl: '',
        popularity: Math.max(1, Number(row?.search_count) || 1),
        source: 'supabase' as const,
      }
    })
    .filter(isNonNullable)
}

const searchCategories = async (
  db: SupabaseClient,
  query: string,
  rawLimit: number,
): Promise<SearchSuggestionProviderResult[]> => {
  const pattern = toSupabaseLikePattern(query)
  if (!pattern) return []

  const [nameRows, slugRows] = await Promise.all([
    readRows<SearchCategoryRow>(
      'category-name',
      db
        .from(CATEGORY_TABLE)
        .select('id, name, slug, image_url')
        .eq('is_active', true)
        .ilike('name', pattern)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
        .limit(rawLimit),
    ),
    readRows<SearchCategoryRow>(
      'category-slug',
      db
        .from(CATEGORY_TABLE)
        .select('id, name, slug, image_url')
        .eq('is_active', true)
        .ilike('slug', pattern)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
        .limit(rawLimit),
    ),
  ])

  return mergeRowsById([nameRows, slugRows], rawLimit)
    .map((row) => {
      const id = String(row?.id || '').trim()
      const label = normalizeSearchQuery(row?.name)
      const slug = normalizeSearchQuery(row?.slug) || slugifySearchText(row?.name)
      if (!id || !label || !slug) return null

      return {
        id,
        kind: 'category' as const,
        label,
        slug,
        href: buildCategorySuggestionHref(slug),
        subtitle: 'Category',
        imageUrl: normalizeSearchQuery(row?.image_url),
        source: 'supabase' as const,
      }
    })
    .filter(isNonNullable)
}

const searchBrands = async (
  db: SupabaseClient,
  query: string,
  rawLimit: number,
): Promise<SearchSuggestionProviderResult[]> => {
  const pattern = toSupabaseLikePattern(query)
  if (!pattern) return []

  const [nameRows, slugRows] = await Promise.all([
    readRows<SearchBrandRow>(
      'brand-name',
      db
        .from(BRAND_TABLE)
        .select('id, name, slug, logo_url')
        .ilike('name', pattern)
        .order('name', { ascending: true })
        .limit(rawLimit),
    ),
    readRows<SearchBrandRow>(
      'brand-slug',
      db
        .from(BRAND_TABLE)
        .select('id, name, slug, logo_url')
        .ilike('slug', pattern)
        .order('name', { ascending: true })
        .limit(rawLimit),
    ),
  ])

  return mergeRowsById([nameRows, slugRows], rawLimit)
    .map((row) => {
      const id = String(row?.id || '').trim()
      const label = normalizeSearchQuery(row?.name)
      const slug = normalizeSearchQuery(row?.slug) || slugifySearchText(row?.name)
      if (!id || !label || !slug) return null

      return {
        id,
        kind: 'brand' as const,
        label,
        slug,
        href: buildBrandSuggestionHref(slug),
        subtitle: 'Brand',
        imageUrl: normalizeSearchQuery(row?.logo_url),
        source: 'supabase' as const,
      }
    })
    .filter(isNonNullable)
}

export async function getSupabaseSearchSuggestions(
  supabase: SupabaseClient,
  query: string,
  limit: number,
) {
  const db = getSearchDatabase(supabase)
  const rawLimit = Math.max(limit, Math.min(12, limit * 2))

  const [sharedQueries, products, categories, brands] = await Promise.all([
    searchQuerySuggestions(db, query, rawLimit),
    searchProducts(db, query, rawLimit),
    searchCategories(db, query, rawLimit),
    searchBrands(db, query, rawLimit),
  ])

  return [...sharedQueries, ...products, ...categories, ...brands]
}

export async function recordSharedSearchQuery(query: string) {
  const normalizedQuery = normalizeSearchQuery(query)
  if (!normalizedQuery || normalizedQuery.length < 2) return false

  try {
    const db = createAdminSupabaseClient()
    const { error } = await db.rpc('record_search_query', {
      p_query_text: normalizedQuery,
    })

    if (error) {
      console.error('record search query failed:', error.message)
      return false
    }

    return true
  } catch (error: any) {
    console.error('record search query failed:', error?.message || String(error))
    return false
  }
}
