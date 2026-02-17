import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { deleteFromR2 } from '@/lib/storage/r2'

const sliderLinkSchema = z
  .string()
  .max(300)
  .refine(
    (value) =>
      value === '' ||
      value.startsWith('/') ||
      value.startsWith('http://') ||
      value.startsWith('https://'),
    'Invalid slider link.',
  )

const updateSchema = z.object({
  logo_url: z
    .preprocess((value) => {
      if (value === null || value === undefined) return value
      const normalized = String(value).trim()
      return normalized.length ? normalized : null
    }, z.string().url().nullable().optional()),
  banner_slider_urls: z.array(z.string().url().max(500)).max(5).optional(),
  banner_slider_keys: z.array(z.string().max(500)).max(5).optional(),
  banner_slider_mobile_urls: z.array(z.string().url().max(500)).max(5).optional(),
  banner_slider_mobile_keys: z.array(z.string().max(500)).max(5).optional(),
  banner_slider_links: z.array(sliderLinkSchema).max(5).optional(),
  storefront_filter_mode: z.enum(['category', 'tag']).optional(),
  storefront_filter_category_ids: z.array(z.string().uuid()).max(100).optional(),
  storefront_filter_tag_ids: z.array(z.string().uuid()).max(100).optional(),
  storefront_filter_title: z
    .preprocess((value) => {
      if (value === null || value === undefined) return value
      const normalized = String(value).trim()
      return normalized.length ? normalized : null
    }, z.string().max(80).nullable().optional()),
  storefront_filter_product_limit: z.number().int().min(1).max(48).optional(),
})

type StoreFrontUpdates = {
  logo_url?: string | null
  banner_slider_urls?: string[]
  banner_slider_keys?: string[]
  banner_slider_mobile_urls?: string[]
  banner_slider_mobile_keys?: string[]
  banner_slider_links?: string[]
  storefront_filter_mode?: 'category' | 'tag'
  storefront_filter_category_ids?: string[]
  storefront_filter_tag_ids?: string[]
  storefront_filter_title?: string | null
  storefront_filter_product_limit?: number
}

const LEGACY_UPDATE_FIELDS = new Set(['logo_url'])

const selectColumns =
  'id, name, slug, description, logo_url, banner_slider_urls, banner_slider_keys, banner_slider_mobile_urls, banner_slider_mobile_keys, banner_slider_links, storefront_filter_mode, storefront_filter_category_ids, storefront_filter_tag_ids, storefront_filter_title, storefront_filter_product_limit'
const selectColumnsLegacy = 'id, name, slug, description, logo_url'
const MISSING_COLUMN_CODE = '42703'

const isMissingColumnError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  String((error as { code?: string }).code || '') === MISSING_COLUMN_CODE

const normalizeBrandPayload = (value: any) => ({
  ...(value || {}),
  banner_slider_urls: Array.isArray(value?.banner_slider_urls) ? value.banner_slider_urls : [],
  banner_slider_keys: Array.isArray(value?.banner_slider_keys) ? value.banner_slider_keys : [],
  banner_slider_mobile_urls: Array.isArray(value?.banner_slider_mobile_urls)
    ? value.banner_slider_mobile_urls
    : [],
  banner_slider_mobile_keys: Array.isArray(value?.banner_slider_mobile_keys)
    ? value.banner_slider_mobile_keys
    : [],
  banner_slider_links: Array.isArray(value?.banner_slider_links) ? value.banner_slider_links : [],
  storefront_filter_mode: value?.storefront_filter_mode === 'tag' ? 'tag' : 'category',
  storefront_filter_category_ids: Array.isArray(value?.storefront_filter_category_ids)
    ? value.storefront_filter_category_ids
    : [],
  storefront_filter_tag_ids: Array.isArray(value?.storefront_filter_tag_ids)
    ? value.storefront_filter_tag_ids
    : [],
  storefront_filter_title: String(value?.storefront_filter_title || '').trim(),
  storefront_filter_product_limit: Math.max(
    1,
    Math.min(48, Number(value?.storefront_filter_product_limit) || 8),
  ),
})

const uniqueNonEmpty = (values: unknown[] = []) =>
  Array.from(
    new Set(
      values
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean),
    ),
  )

const uniqueIds = (values: unknown[] = []) =>
  Array.from(
    new Set(
      values
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean),
    ),
  )

const fetchStoreFrontFilterOptions = async (db: any, brandId: string) => {
  if (!brandId) {
    return { categories: [], tags: [] }
  }

  const { data: brandLinks, error: brandLinksError } = await db
    .from('product_brand_links')
    .select('product_id')
    .eq('brand_id', brandId)
  if (brandLinksError) {
    console.error('store-front filter options brand links failed:', brandLinksError.message)
    return { categories: [], tags: [] }
  }

  const productIds = uniqueIds((brandLinks || []).map((item: any) => item?.product_id))
  if (!productIds.length) {
    return { categories: [], tags: [] }
  }

  const [categoryLinksResult, tagLinksResult] = await Promise.all([
    db
      .from('product_category_links')
      .select('category_id')
      .in('product_id', productIds),
    db
      .from('product_tag_links')
      .select('tag_id')
      .in('product_id', productIds),
  ])

  if (categoryLinksResult.error) {
    console.error(
      'store-front filter options category links failed:',
      categoryLinksResult.error.message,
    )
  }
  if (tagLinksResult.error) {
    console.error('store-front filter options tag links failed:', tagLinksResult.error.message)
  }

  const categoryIds = uniqueIds(
    (categoryLinksResult.data || []).map((item: any) => item?.category_id),
  )
  const tagIds = uniqueIds((tagLinksResult.data || []).map((item: any) => item?.tag_id))

  const [categoriesResult, tagsResult] = await Promise.all([
    categoryIds.length
      ? db
          .from('admin_categories')
          .select('id, name, slug')
          .in('id', categoryIds)
          .order('name', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    tagIds.length
      ? db
          .from('admin_tags')
          .select('id, name, slug')
          .in('id', tagIds)
          .order('name', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ])

  if (categoriesResult.error) {
    console.error('store-front filter options categories load failed:', categoriesResult.error.message)
  }
  if (tagsResult.error) {
    console.error('store-front filter options tags load failed:', tagsResult.error.message)
  }

  const categories = Array.isArray(categoriesResult.data)
    ? categoriesResult.data.filter((item: any) => item?.id && item?.name)
    : []
  const tags = Array.isArray(tagsResult.data)
    ? tagsResult.data.filter((item: any) => item?.id && item?.name)
    : []

  return { categories, tags }
}

const deleteMediaRowsByKeys = async (db: any, userId: string, keys: string[]) => {
  const normalizedKeys = uniqueNonEmpty(keys)
  if (!normalizedKeys.length) return

  for (const key of normalizedKeys) {
    try {
      await deleteFromR2(key)
    } catch (error) {
      console.error('store-front r2 delete failed:', key, error)
    }
  }

  const { error } = await db
    .from('product_images')
    .delete()
    .eq('created_by', userId)
    .in('r2_key', normalizedKeys)
  if (error) {
    console.error('store-front product_images delete by key failed:', error.message)
  }
}

const deleteMediaRowsByUrls = async (db: any, userId: string, urls: string[]) => {
  const normalizedUrls = uniqueNonEmpty(urls)
  if (!normalizedUrls.length) return

  const { data, error } = await db
    .from('product_images')
    .select('r2_key, url')
    .eq('created_by', userId)
    .in('url', normalizedUrls)

  if (error) {
    console.error('store-front media lookup by url failed:', error.message)
    return
  }

  const keys = uniqueNonEmpty((data || []).map((item: any) => item?.r2_key || ''))
  if (keys.length) {
    await deleteMediaRowsByKeys(db, userId, keys)
    return
  }

  const { error: deleteError } = await db
    .from('product_images')
    .delete()
    .eq('created_by', userId)
    .in('url', normalizedUrls)
  if (deleteError) {
    console.error('store-front product_images delete by url failed:', deleteError.message)
  }
}

export async function GET(request: NextRequest) {
  const { supabase, applyCookies, canManageCatalog, isAdmin, user } = await requireDashboardUser(request)

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }
  const db = isAdmin ? supabase : createAdminSupabaseClient()

  const { data, error } = await db
    .from('admin_brands')
    .select(selectColumns)
    .eq('created_by', user.id)
    .maybeSingle()

  if (error && !isMissingColumnError(error)) {
    console.error('store-front load failed:', error.message)
    return jsonError('Unable to load store front settings.', 500)
  }

  if (error && isMissingColumnError(error)) {
    const { data: legacyData, error: legacyError } = await db
      .from('admin_brands')
      .select(selectColumnsLegacy)
      .eq('created_by', user.id)
      .maybeSingle()

    if (legacyError) {
      console.error('store-front load fallback failed:', legacyError.message)
      return jsonError('Unable to load store front settings.', 500)
    }

    const normalized = normalizeBrandPayload(legacyData || null)
    const filterOptions = normalized?.id
      ? await fetchStoreFrontFilterOptions(db, String(normalized.id))
      : { categories: [], tags: [] }
    const response = jsonOk({
      item: {
        ...normalized,
        storefront_filter_options: filterOptions,
      },
    })
    applyCookies(response)
    return response
  }

  const normalized = normalizeBrandPayload(data || null)
  const filterOptions = normalized?.id
    ? await fetchStoreFrontFilterOptions(db, String(normalized.id))
    : { categories: [], tags: [] }
  const response = jsonOk({
    item: {
      ...normalized,
      storefront_filter_options: filterOptions,
    },
  })
  applyCookies(response)
  return response
}

export async function PATCH(request: NextRequest) {
  const { supabase, applyCookies, canManageCatalog, isAdmin, user } = await requireDashboardUser(request)

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }
  const db = isAdmin ? supabase : createAdminSupabaseClient()

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    console.error('store-front parse failed:', error)
    return jsonError('Invalid payload.', 400)
  }

  const parsed = updateSchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError('Invalid store front details.', 400)
  }

  const updates: StoreFrontUpdates = {}
  if (parsed.data.logo_url !== undefined) {
    updates.logo_url = parsed.data.logo_url
  }
  if (parsed.data.banner_slider_urls !== undefined) {
    updates.banner_slider_urls = parsed.data.banner_slider_urls
  }
  if (parsed.data.banner_slider_keys !== undefined) {
    updates.banner_slider_keys = parsed.data.banner_slider_keys
  }
  if (parsed.data.banner_slider_mobile_urls !== undefined) {
    updates.banner_slider_mobile_urls = parsed.data.banner_slider_mobile_urls
  }
  if (parsed.data.banner_slider_mobile_keys !== undefined) {
    updates.banner_slider_mobile_keys = parsed.data.banner_slider_mobile_keys
  }
  if (parsed.data.banner_slider_links !== undefined) {
    updates.banner_slider_links = parsed.data.banner_slider_links
  }
  if (parsed.data.storefront_filter_mode !== undefined) {
    updates.storefront_filter_mode = parsed.data.storefront_filter_mode
  }
  if (parsed.data.storefront_filter_category_ids !== undefined) {
    updates.storefront_filter_category_ids = parsed.data.storefront_filter_category_ids
  }
  if (parsed.data.storefront_filter_tag_ids !== undefined) {
    updates.storefront_filter_tag_ids = parsed.data.storefront_filter_tag_ids
  }
  if (parsed.data.storefront_filter_title !== undefined) {
    updates.storefront_filter_title = parsed.data.storefront_filter_title
  }
  if (parsed.data.storefront_filter_product_limit !== undefined) {
    updates.storefront_filter_product_limit = parsed.data.storefront_filter_product_limit
  }

  if (!Object.keys(updates).length) {
    return jsonError('No changes provided.', 400)
  }

  let existingBrand: any = null
  const requiresAssetCleanup =
    parsed.data.logo_url !== undefined ||
    parsed.data.banner_slider_urls !== undefined ||
    parsed.data.banner_slider_keys !== undefined

  if (requiresAssetCleanup) {
    const { data: currentData, error: currentError } = await db
      .from('admin_brands')
      .select(selectColumns)
      .eq('created_by', user.id)
      .maybeSingle()
    if (currentError && !isMissingColumnError(currentError)) {
      console.error('store-front current load failed:', currentError.message)
    } else {
      existingBrand = normalizeBrandPayload(currentData || null)
    }
  }

  const isSliderUpdateRequested = [
    'banner_slider_urls',
    'banner_slider_keys',
    'banner_slider_mobile_urls',
    'banner_slider_mobile_keys',
    'banner_slider_links',
  ].some((key) => key in updates)

  const { data, error } = await db
    .from('admin_brands')
    .update(updates)
    .eq('created_by', user.id)
    .select(selectColumns)
    .maybeSingle()

  if (error && !(isMissingColumnError(error) && !isSliderUpdateRequested)) {
    console.error('store-front save failed:', error.message)
    return jsonError('Unable to save store front settings.', 500)
  }

  if (error && isMissingColumnError(error) && !isSliderUpdateRequested) {
    const legacyUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => LEGACY_UPDATE_FIELDS.has(key)),
    )
    if (!Object.keys(legacyUpdates).length) {
      return jsonError('This storefront update requires the latest database migration.', 400)
    }

    const { data: legacyData, error: legacyError } = await db
      .from('admin_brands')
      .update(legacyUpdates)
      .eq('created_by', user.id)
      .select(selectColumnsLegacy)
      .maybeSingle()

    if (legacyError) {
      console.error('store-front save fallback failed:', legacyError.message)
      return jsonError('Unable to save store front settings.', 500)
    }

    if (!legacyData?.id) {
      return jsonError('No brand linked to this account.', 404)
    }

    const normalized = normalizeBrandPayload(legacyData)
    const filterOptions = normalized?.id
      ? await fetchStoreFrontFilterOptions(db, String(normalized.id))
      : { categories: [], tags: [] }
    const response = jsonOk({
      item: {
        ...normalized,
        storefront_filter_options: filterOptions,
      },
    })
    applyCookies(response)
    return response
  }

  if (!data?.id) {
    return jsonError('No brand linked to this account.', 404)
  }

  if (existingBrand) {
    const removedLogoUrl =
      parsed.data.logo_url !== undefined &&
      existingBrand.logo_url &&
      existingBrand.logo_url !== parsed.data.logo_url
        ? [existingBrand.logo_url]
        : []

    if (removedLogoUrl.length) {
      await deleteMediaRowsByUrls(db, user.id, removedLogoUrl)
    }

    const existingSliderKeys = uniqueNonEmpty(existingBrand.banner_slider_keys || [])
    const nextSliderKeys =
      parsed.data.banner_slider_keys !== undefined
        ? uniqueNonEmpty(parsed.data.banner_slider_keys)
        : existingSliderKeys

    const removedSliderKeys = existingSliderKeys.filter((key) => !nextSliderKeys.includes(key))
    if (removedSliderKeys.length) {
      await deleteMediaRowsByKeys(db, user.id, removedSliderKeys)
    }
  }

  const normalized = normalizeBrandPayload(data)
  const filterOptions = normalized?.id
    ? await fetchStoreFrontFilterOptions(db, String(normalized.id))
    : { categories: [], tags: [] }
  const response = jsonOk({
    item: {
      ...normalized,
      storefront_filter_options: filterOptions,
    },
  })
  applyCookies(response)
  return response
}
