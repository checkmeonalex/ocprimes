import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { unstable_noStore as noStore } from 'next/cache'

const MISSING_COLUMN_CODE = '42703'

const isMissingColumnError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  String((error as { code?: string }).code || '') === MISSING_COLUMN_CODE

const normalizeBrand = (value: any) => ({
  ...(value || {}),
  banner_slider_urls: Array.isArray(value?.banner_slider_urls) ? value.banner_slider_urls : [],
  banner_slider_mobile_urls: Array.isArray(value?.banner_slider_mobile_urls)
    ? value.banner_slider_mobile_urls
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
  use_custom_profile_metrics: Boolean(value?.use_custom_profile_metrics),
  custom_profile_followers: Math.max(0, Number(value?.custom_profile_followers) || 0),
  custom_profile_sold: Math.max(0, Number(value?.custom_profile_sold) || 0),
  is_trusted_vendor: Boolean(value?.is_trusted_vendor),
  trusted_badge_url: String(value?.trusted_badge_url || '').trim(),
  banner_grid: value?.banner_grid && typeof value.banner_grid === 'object' ? value.banner_grid : null,
  storefront_section_order: Array.isArray(value?.storefront_section_order)
    ? value.storefront_section_order
    : ['banner_grid', 'storefront_filter'],
  storefront_blocks: Array.isArray(value?.storefront_blocks) ? value.storefront_blocks : [],
  template: String(value?.template || 'default').trim() || 'default',
})

const enrichBrandFilters = async (supabase: any, brand: any) => {
  const normalized = normalizeBrand(brand)
  const cleanCategoryIds = Array.from(
    new Set(
      (Array.isArray(normalized.storefront_filter_category_ids)
        ? normalized.storefront_filter_category_ids
        : []
      )
        .map((id) => String(id || '').trim())
        .filter(Boolean),
    ),
  )
  const cleanTagIds = Array.from(
    new Set(
      (Array.isArray(normalized.storefront_filter_tag_ids)
        ? normalized.storefront_filter_tag_ids
        : []
      )
        .map((id) => String(id || '').trim())
        .filter(Boolean),
    ),
  )

  if (!cleanCategoryIds.length && !cleanTagIds.length) {
    return { ...normalized, storefront_filter_items: [] }
  }

  const [categoriesResult, tagsResult] = await Promise.all([
    cleanCategoryIds.length
      ? supabase.from('admin_categories').select('id, name, slug').in('id', cleanCategoryIds)
      : Promise.resolve({ data: [], error: null }),
    cleanTagIds.length
      ? supabase.from('admin_tags').select('id, name, slug').in('id', cleanTagIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (categoriesResult.error) {
    console.error('brand storefront category filter items load failed:', categoriesResult.error.message)
  }
  if (tagsResult.error) {
    console.error('brand storefront tag filter items load failed:', tagsResult.error.message)
  }

  const categoriesById = new Map(
    (Array.isArray(categoriesResult.data) ? categoriesResult.data : [])
      .filter((item: any) => item?.id && item?.name)
      .map((item: any) => [String(item.id), item]),
  )
  const tagsById = new Map(
    (Array.isArray(tagsResult.data) ? tagsResult.data : [])
      .filter((item: any) => item?.id && item?.name)
      .map((item: any) => [String(item.id), item]),
  )

  const orderedCategories = cleanCategoryIds
    .map((id) => categoriesById.get(id))
    .filter(Boolean)
    .map((item: any) => ({
      id: String(item.id),
      name: String(item.name || '').trim(),
      slug: String(item.slug || '').trim(),
      type: 'category',
    }))
    .filter((item) => item.name)

  const orderedTags = cleanTagIds
    .map((id) => tagsById.get(id))
    .filter(Boolean)
    .map((item: any) => ({
      id: String(item.id),
      name: String(item.name || '').trim(),
      slug: String(item.slug || '').trim(),
      type: 'tag',
    }))
    .filter((item) => item.name)

  const ordered = [...orderedCategories, ...orderedTags]

  return {
    ...normalized,
    storefront_filter_items: ordered,
  }
}

export const fetchBrandBySlugOrId = async (value: string) => {
  const trimmed = String(value || '').trim()
  if (!trimmed) return null
  const normalizedSlug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  const readableName = trimmed
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  noStore()
  let supabase
  try {
    supabase = createAdminSupabaseClient()
  } catch (_error) {
    supabase = await createServerSupabaseClient()
  }

  const baseQuery = () =>
    supabase
      .from('admin_brands')
      .select(
        'id, name, slug, description, logo_url, created_by, created_at, banner_slider_urls, banner_slider_mobile_urls, banner_slider_links, storefront_filter_mode, storefront_filter_category_ids, storefront_filter_tag_ids, storefront_filter_title, storefront_filter_product_limit, use_custom_profile_metrics, custom_profile_followers, custom_profile_sold, is_trusted_vendor, trusted_badge_url, collections_menu_mode, banner_grid, storefront_section_order, storefront_blocks, template, use_custom_rating, custom_profile_rating, custom_profile_reviews, use_custom_orders, custom_profile_sold_display, use_custom_followers_growth, followers_growth_pct',
      )
      .limit(1)
  const baseQueryLegacy = () =>
    supabase
      .from('admin_brands')
      .select('id, name, slug, description, logo_url, created_by')
      .limit(1)

  const maybeSingleWithFallback = async (
    builderFactory: () => any,
    legacyBuilderFactory: () => any,
  ) => {
    const { data, error } = await builderFactory().maybeSingle()
    if (!isMissingColumnError(error)) return { data, error }
    const { data: legacyData, error: legacyError } = await legacyBuilderFactory().maybeSingle()
    return { data: legacyData, error: legacyError }
  }

  const bySlugResult = await maybeSingleWithFallback(
    () => baseQuery().eq('slug', trimmed),
    () => baseQueryLegacy().eq('slug', trimmed),
  )
  if (bySlugResult.data?.id) return enrichBrandFilters(supabase, bySlugResult.data)

  if (normalizedSlug && normalizedSlug !== trimmed) {
    const byNormalizedSlugResult = await maybeSingleWithFallback(
      () => baseQuery().eq('slug', normalizedSlug),
      () => baseQueryLegacy().eq('slug', normalizedSlug),
    )
    if (byNormalizedSlugResult.data?.id) return enrichBrandFilters(supabase, byNormalizedSlugResult.data)
  }

  const byIdResult = await maybeSingleWithFallback(
    () => baseQuery().eq('id', trimmed),
    () => baseQueryLegacy().eq('id', trimmed),
  )
  if (byIdResult.data?.id) return enrichBrandFilters(supabase, byIdResult.data)

  if (readableName) {
    const byNameResult = await maybeSingleWithFallback(
      () => baseQuery().ilike('name', readableName),
      () => baseQueryLegacy().ilike('name', readableName),
    )
    if (byNameResult.data?.id) return enrichBrandFilters(supabase, byNameResult.data)
  }

  return null
}

const VENDOR_SELECT_FULL =
  'id, name, slug, logo_url, is_trusted_vendor, custom_profile_followers, custom_profile_sold, use_custom_profile_metrics, use_custom_rating, custom_profile_rating, custom_profile_reviews, use_custom_orders, custom_profile_sold_display, use_custom_followers_growth, followers_growth_pct, created_at'
const VENDOR_SELECT_BASE =
  'id, name, slug, logo_url, is_trusted_vendor, custom_profile_followers, custom_profile_sold, created_at'

function mapVendorRow(v: any) {
  const createdAt = v.created_at ? new Date(v.created_at) : null
  const daysOnPlatform = createdAt
    ? Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)))
    : 0
  const yearsOnPlatform = Math.floor(daysOnPlatform / 365)
  const monthsOnPlatform = Math.floor(daysOnPlatform / 30)

  const useCustomRating = Boolean(v.use_custom_rating)
  const useCustomOrders = Boolean(v.use_custom_orders)
  const useCustomFollowersGrowth = Boolean(v.use_custom_followers_growth)
  const useCustomMetrics = Boolean(v.use_custom_profile_metrics)

  return {
    id: String(v.id || ''),
    name: String(v.name || ''),
    slug: String(v.slug || ''),
    logo_url: String(v.logo_url || ''),
    is_trusted_vendor: Boolean(v.is_trusted_vendor),
    custom_profile_followers: useCustomMetrics ? (Number(v.custom_profile_followers) || 0) : 0,
    custom_profile_sold: useCustomMetrics ? (Number(v.custom_profile_sold) || 0) : 0,
    custom_profile_rating: useCustomRating ? (Number(v.custom_profile_rating) || 0) : 0,
    custom_profile_reviews: useCustomRating ? (Number(v.custom_profile_reviews) || 0) : 0,
    custom_profile_orders: useCustomOrders ? (Number(v.custom_profile_sold_display) || 0) : 0,
    followers_growth_pct: useCustomFollowersGrowth ? (Number(v.followers_growth_pct) || 0) : 0,
    years_on_platform: yearsOnPlatform,
    months_on_platform: monthsOnPlatform,
  }
}

export const fetchAllVendors = async () => {
  try {
    let supabase
    try {
      supabase = createAdminSupabaseClient()
    } catch {
      supabase = await createServerSupabaseClient()
    }

    let { data, error } = await supabase
      .from('admin_brands')
      .select(VENDOR_SELECT_FULL)
      .order('name', { ascending: true })

    if (isMissingColumnError(error)) {
      const fallback = await supabase
        .from('admin_brands')
        .select(VENDOR_SELECT_BASE)
        .order('name', { ascending: true })
      data = fallback.data
      error = fallback.error
    }

    if (error) {
      console.error('fetchAllVendors error:', error.message)
      return []
    }

    return (data ?? []).map(mapVendorRow)
  } catch (err) {
    console.error('fetchAllVendors error:', err instanceof Error ? err.message : err)
    return []
  }
}
