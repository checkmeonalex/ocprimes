import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import {
  normalizePopularSearchItemInput,
  popularSearchItemRecordSchema,
  toPopularSearchItem,
  type PopularSearchItem,
  type PopularSearchItemInput,
} from '@/lib/search-popular/schema'

export const SEARCH_POPULAR_ITEMS_TABLE = 'search_popular_items'

const SEARCH_POPULAR_ITEMS_SELECT =
  'id, text, image_url, target_url, sort_order, is_active, created_at, updated_at'

const MISSING_TABLE_CODES = new Set(['42P01', 'PGRST205'])

type SupabaseLikeError = {
  code?: string
  message?: string
}

const normalizeRows = (rows: unknown): PopularSearchItem[] => {
  if (!Array.isArray(rows)) return []

  return rows
    .map((row) => popularSearchItemRecordSchema.safeParse(row))
    .filter((result) => result.success)
    .map((result) => toPopularSearchItem(result.data))
}

export const isMissingSearchPopularItemsTableError = (error: unknown) =>
  MISSING_TABLE_CODES.has(String((error as SupabaseLikeError | null)?.code || ''))

export async function listPublicPopularSearchItems(limit: number) {
  const db = createAdminSupabaseClient()
  const { data, error } = await db
    .from(SEARCH_POPULAR_ITEMS_TABLE)
    .select(SEARCH_POPULAR_ITEMS_SELECT)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return normalizeRows(data)
}

export async function listAdminPopularSearchItems() {
  const db = createAdminSupabaseClient()
  const { data, error } = await db
    .from(SEARCH_POPULAR_ITEMS_TABLE)
    .select(SEARCH_POPULAR_ITEMS_SELECT)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return normalizeRows(data)
}

export async function createPopularSearchItem(input: PopularSearchItemInput) {
  const db = createAdminSupabaseClient()
  const normalized = normalizePopularSearchItemInput(input)
  const { data, error } = await db
    .from(SEARCH_POPULAR_ITEMS_TABLE)
    .insert({
      text: normalized.text,
      image_url: normalized.imageUrl,
      target_url: normalized.targetUrl,
      sort_order: normalized.sortOrder,
      is_active: normalized.isActive,
      updated_at: new Date().toISOString(),
    })
    .select(SEARCH_POPULAR_ITEMS_SELECT)
    .single()

  if (error) {
    throw error
  }

  return toPopularSearchItem(popularSearchItemRecordSchema.parse(data))
}

export async function updatePopularSearchItem(id: string, input: PopularSearchItemInput) {
  const db = createAdminSupabaseClient()
  const normalized = normalizePopularSearchItemInput(input)
  const { data, error } = await db
    .from(SEARCH_POPULAR_ITEMS_TABLE)
    .update({
      text: normalized.text,
      image_url: normalized.imageUrl,
      target_url: normalized.targetUrl,
      sort_order: normalized.sortOrder,
      is_active: normalized.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(SEARCH_POPULAR_ITEMS_SELECT)
    .single()

  if (error) {
    throw error
  }

  return toPopularSearchItem(popularSearchItemRecordSchema.parse(data))
}

export async function deletePopularSearchItem(id: string) {
  const db = createAdminSupabaseClient()
  const { error } = await db.from(SEARCH_POPULAR_ITEMS_TABLE).delete().eq('id', id)

  if (error) {
    throw error
  }
}
