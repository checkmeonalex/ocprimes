import type { NextRequest } from 'next/server'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { publicProductListSchema, publicProductSlugSchema } from '@/lib/catalog/products'
import {
  findSeedProduct,
} from '@/lib/catalog/seed-products'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'
import { countBrandFollowers } from '@/lib/catalog/brand-following'
import { personalizationSignalsSchema } from '@/lib/personalization/signal-schema'
import {
  rankProductsWithSignals,
  toPersonalizationSignals,
} from '@/lib/personalization/rank-products'

const PRODUCT_TABLE = 'products'
const CATEGORY_TABLE = 'admin_categories'
const TAG_TABLE = 'admin_tags'
const BRAND_TABLE = 'admin_brands'
const CATEGORY_LINKS = 'product_category_links'
const TAG_LINKS = 'product_tag_links'
const BRAND_LINKS = 'product_brand_links'
const IMAGE_TABLE = 'product_images'
const VARIATIONS_TABLE = 'product_variations'
const MAX_CATEGORY_BREADCRUMB_DEPTH = 8
const MISSING_COLUMN_CODE = '42703'
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PRODUCT_LIST_FULL_SELECT =
  'id, name, slug, short_description, description, price, discount_price, sku, stock_quantity, status, product_type, condition_check, packaging_style, return_policy, main_image_id, product_video_key, product_video_url, created_at, updated_at, created_by'
const PRODUCT_LIST_CARD_SELECT =
  'id, name, slug, price, discount_price, sku, stock_quantity, status, product_type, main_image_id, product_video_url, created_at, created_by'

const encodeListCursor = (item: any) => {
  const id = String(item?.id || '').trim()
  const createdAt = String(item?.created_at || '').trim()
  if (!id || !createdAt) return ''

  return Buffer.from(
    JSON.stringify({
      id,
      created_at: createdAt,
    }),
    'utf8',
  ).toString('base64')
}

const decodeListCursor = (cursor: string) => {
  const raw = String(cursor || '').trim()
  if (!raw) return null
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8')
    const parsed = JSON.parse(decoded)
    const id = String(parsed?.id || '').trim()
    const createdAt = String(parsed?.created_at || '').trim()
    if (!id || !createdAt) return null
    return { id, createdAt }
  } catch {
    return null
  }
}

const buildSearchDisjunction = (term: string) =>
  `or(name.ilike.${term},slug.ilike.${term},sku.ilike.${term})`

const buildCursorDisjunction = (cursor: { id: string; createdAt: string }) =>
  `or(created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id}))`

const buildCombinedOrFilter = ({
  searchTerm,
  cursor,
}: {
  searchTerm?: string
  cursor?: { id: string; createdAt: string } | null
}) => {
  const parts: string[] = []
  if (searchTerm) parts.push(buildSearchDisjunction(searchTerm))
  if (cursor) parts.push(buildCursorDisjunction(cursor))
  if (!parts.length) return ''
  if (parts.length === 1) {
    const single = parts[0]
    return single.startsWith('or(') && single.endsWith(')')
      ? single.slice(3, -1)
      : single
  }
  return `and(${parts.join(',')})`
}

const withOptionalBrandColumns = async (supabase: any, brandId: string) => {
  const preferredSelect =
    'id, name, slug, logo_url, use_custom_profile_metrics, custom_profile_followers, custom_profile_sold, is_trusted_vendor'
  const fallbackSelect = 'id, name, slug, logo_url'

  const preferred = await supabase
    .from(BRAND_TABLE)
    .select(preferredSelect)
    .eq('id', brandId)
    .maybeSingle()

  if (!preferred.error || String(preferred.error?.code || '') !== MISSING_COLUMN_CODE) {
    return preferred
  }

  return supabase
    .from(BRAND_TABLE)
    .select(fallbackSelect)
    .eq('id', brandId)
    .maybeSingle()
}

const attachVendorProfile = async (supabase: any, item: any) => {
  const primaryBrand = Array.isArray(item?.brands) ? item.brands[0] : null
  let brandId = String(primaryBrand?.id || '').trim()
  let fallbackBrand: any = null
  if (!brandId) {
    const creatorId = String(item?.created_by || '').trim()
    if (creatorId) {
      let creatorLookupDb = supabase
      try {
        creatorLookupDb = createAdminSupabaseClient()
      } catch (_error) {
        creatorLookupDb = supabase
      }
      const { data: brandByCreator, error: brandByCreatorError } = await creatorLookupDb
        .from(BRAND_TABLE)
        .select('id, name, slug, logo_url')
        .eq('created_by', creatorId)
        .limit(1)
        .maybeSingle()
      if (brandByCreatorError && brandByCreatorError.code !== 'PGRST116') {
        console.error('brand by creator lookup failed:', brandByCreatorError.message)
      }
      fallbackBrand = brandByCreator || null
      brandId = String(brandByCreator?.id || '').trim()
    }
  }
  if (!brandId) {
    return {
      ...item,
      vendor_profile: null,
    }
  }

  const [brandResult, brandProductsCountResult, followersCount] = await Promise.all([
    withOptionalBrandColumns(supabase, brandId),
    supabase
      .from(BRAND_LINKS)
      .select('product_id', { head: true, count: 'exact' })
      .eq('brand_id', brandId),
    countBrandFollowers(brandId),
  ])

  if (brandResult.error && brandResult.error.code !== 'PGRST116') {
    console.error('brand profile lookup failed:', brandResult.error.message)
  }
  if (brandProductsCountResult.error) {
    console.error('brand product count failed:', brandProductsCountResult.error.message)
  }

  const brandData = brandResult.data || primaryBrand || fallbackBrand || {}
  const productCount = Math.max(0, Number(brandProductsCountResult.count) || 0)
  const useCustomMetrics = Boolean(brandData?.use_custom_profile_metrics)
  const customFollowers = Math.max(0, Number(brandData?.custom_profile_followers) || 0)
  const customSold = Math.max(0, Number(brandData?.custom_profile_sold) || 0)
  const realFollowersCount = Math.max(0, Number(followersCount) || 0)
  const realSoldCount = Math.max(productCount * 15, Math.round(realFollowersCount * 0.42))
  const followers = useCustomMetrics ? customFollowers : realFollowersCount
  const sold = useCustomMetrics ? customSold : realSoldCount

  return {
    ...item,
    vendor_profile: {
      followers,
      sold,
      items: productCount,
      rating: Math.max(0, Number(item?.rating) || 0),
      name: String(brandData?.name || '').trim(),
      slug: String(brandData?.slug || '').trim(),
      logo_url: String(brandData?.logo_url || '').trim(),
      badge: Boolean(brandData?.is_trusted_vendor) ? 'Trusted seller' : '',
    },
  }
}

const toCategorySlug = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const toVendorSlug = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const toVendorReadableName = (value = '') =>
  String(value || '')
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')

const isUuid = (value = '') => UUID_PATTERN.test(String(value || '').trim())

const resolveVendorBrandIds = async (supabase, vendorValue) => {
  const rawVendor = String(vendorValue || '').trim()
  if (!rawVendor) return []

  let lookupDb = supabase
  try {
    lookupDb = createAdminSupabaseClient()
  } catch (_error) {
    lookupDb = supabase
  }

  const normalizedSlug = toVendorSlug(rawVendor)
  const readableName = toVendorReadableName(rawVendor)
  const ids = new Set()

  const appendBrandIds = (rows = []) => {
    rows.forEach((row) => {
      if (row?.id) ids.add(row.id)
    })
  }

  const { data: byExactSlug } = await lookupDb
    .from(BRAND_TABLE)
    .select('id')
    .eq('slug', rawVendor)
  appendBrandIds(byExactSlug || [])

  if (normalizedSlug && normalizedSlug !== rawVendor) {
    const { data: byNormalizedSlug } = await lookupDb
      .from(BRAND_TABLE)
      .select('id')
      .eq('slug', normalizedSlug)
    appendBrandIds(byNormalizedSlug || [])
  }

  const { data: byId } = await lookupDb
    .from(BRAND_TABLE)
    .select('id')
    .eq('id', rawVendor)
  appendBrandIds(byId || [])

  if (readableName) {
    const { data: byName } = await lookupDb
      .from(BRAND_TABLE)
      .select('id')
      .ilike('name', readableName)
    appendBrandIds(byName || [])
  }

  return Array.from(ids)
}

const buildCategoryHref = (category) => {
  const rawSlug = toCategorySlug(category?.slug || category?.name || '')
  if (!rawSlug) return '/products'
  return `/products/${encodeURIComponent(rawSlug)}`
}

const attachPrimaryCategoryPath = async (supabase, item) => {
  if (!item) return item
  const categories = Array.isArray(item.categories) ? item.categories : []
  const primaryCategory = categories[0]

  if (!primaryCategory?.id) {
    return {
      ...item,
      primary_category_path: [],
    }
  }

  const categoryMap = new Map()
  categories.forEach((category) => {
    if (!category?.id) return
    categoryMap.set(category.id, {
      id: category.id,
      name: category.name,
      slug: category.slug,
      parent_id: category.parent_id || null,
    })
  })

  let frontier = categories
    .map((category) => category?.parent_id)
    .filter(Boolean)

  for (let depth = 0; depth < MAX_CATEGORY_BREADCRUMB_DEPTH && frontier.length; depth += 1) {
    const missingIds = Array.from(
      new Set(frontier.filter((id) => id && !categoryMap.has(id))),
    )
    if (!missingIds.length) break

    const { data, error } = await supabase
      .from(CATEGORY_TABLE)
      .select('id, name, slug, parent_id')
      .in('id', missingIds)

    if (error) {
      console.error('category ancestry lookup failed:', error.message)
      break
    }

    ;(data || []).forEach((category) => {
      if (!category?.id) return
      categoryMap.set(category.id, category)
    })

    frontier = (data || []).map((category) => category?.parent_id).filter(Boolean)
  }

  const path = []
  const visited = new Set()
  let cursor = categoryMap.get(primaryCategory.id)

  while (cursor && !visited.has(cursor.id) && path.length < MAX_CATEGORY_BREADCRUMB_DEPTH + 1) {
    visited.add(cursor.id)
    path.unshift({
      id: cursor.id,
      label: cursor.name || '',
      slug: cursor.slug || '',
      href: buildCategoryHref(cursor),
    })
    cursor = cursor.parent_id ? categoryMap.get(cursor.parent_id) : null
  }

  return {
    ...item,
    primary_category_path: path.filter((segment) => segment.label),
  }
}

const attachRelations = async (supabase, items) => {
  if (!items.length) return items
  const ids = items.map((item) => item.id)
  const [categoryRes, tagRes, brandRes, imageRes] = await Promise.all([
    supabase
      .from(CATEGORY_LINKS)
      .select('product_id, admin_categories(id, name, slug, parent_id)')
      .in('product_id', ids),
    supabase
      .from(TAG_LINKS)
      .select('product_id, admin_tags(id, name, slug)')
      .in('product_id', ids),
    supabase
      .from(BRAND_LINKS)
      .select('product_id, admin_brands(id, name, slug, created_by)')
      .in('product_id', ids),
    supabase
      .from(IMAGE_TABLE)
      .select('id, product_id, url, alt_text, sort_order')
      .in('product_id', ids)
      .order('sort_order', { ascending: true }),
  ])

  const categoryRows = categoryRes.data || []
  let tagRows = tagRes.data || []
  const brandRows = brandRes.data || []
  const imageRows = imageRes.data || []
  const hasReadableTagRows = (rows: any[] = []) =>
    rows.some((row) => {
      const embedded = row?.admin_tags
      if (!embedded) return false
      if (Array.isArray(embedded)) {
        return embedded.some((entry) => String(entry?.name || '').trim())
      }
      return Boolean(String(embedded?.name || '').trim())
    })

  if (!tagRows.length || !hasReadableTagRows(tagRows)) {
    try {
      const adminDb = createAdminSupabaseClient()
      const fallbackTagResult = await adminDb
        .from(TAG_LINKS)
        .select('product_id, admin_tags(id, name, slug)')
        .in('product_id', ids)
      if (!fallbackTagResult.error && Array.isArray(fallbackTagResult.data)) {
        tagRows = fallbackTagResult.data
      } else if (fallbackTagResult.error) {
        console.error('public tag fallback lookup failed:', fallbackTagResult.error.message)
      }
    } catch (error: any) {
      console.error('public tag fallback init failed:', error?.message || String(error))
    }
  }

  const grouped = (rows, key) => {
    const map = new Map()
    rows.forEach((row) => {
      const list = map.get(row.product_id) || []
      list.push(row[key])
      map.set(row.product_id, list)
    })
    return map
  }

  const categoriesByProduct = grouped(categoryRows, 'admin_categories')
  const tagsByProduct = grouped(tagRows, 'admin_tags')
  const brandsByProduct = grouped(brandRows, 'admin_brands')
  const creatorBrandByUserId = new Map()
  const missingBrandItems = items.filter(
    (item) =>
      (!Array.isArray(brandsByProduct.get(item.id)) || brandsByProduct.get(item.id).length === 0) &&
      String(item?.created_by || '').trim(),
  )

  if (missingBrandItems.length) {
    const creatorIds = Array.from(
      new Set(
        missingBrandItems
          .map((item) => String(item?.created_by || '').trim())
          .filter(Boolean),
      ),
    )
    if (creatorIds.length) {
      let creatorLookupDb = supabase
      try {
        creatorLookupDb = createAdminSupabaseClient()
      } catch (_error) {
        creatorLookupDb = supabase
      }
      const { data: creatorBrands, error: creatorBrandsError } = await creatorLookupDb
        .from(BRAND_TABLE)
        .select('id, name, slug, logo_url, created_by')
        .in('created_by', creatorIds)
      if (creatorBrandsError) {
        console.error('fallback creator brands lookup failed:', creatorBrandsError.message)
      } else {
        ;(creatorBrands || []).forEach((brand) => {
          const creatorId = String(brand?.created_by || '').trim()
          if (!creatorId || creatorBrandByUserId.has(creatorId)) return
          creatorBrandByUserId.set(creatorId, brand)
        })
      }
    }
  }

  const imagesByProduct = new Map()
  imageRows.forEach((row) => {
    const list = imagesByProduct.get(row.product_id) || []
    list.push(row)
    imagesByProduct.set(row.product_id, list)
  })

  const { data: variationRows } = await supabase
    .from(VARIATIONS_TABLE)
    .select('id, product_id, attributes, regular_price, sale_price, sku, stock_quantity, image_id, sort_order')
    .in('product_id', ids)
    .order('sort_order', { ascending: true })

  const variationsByProduct = new Map()
  ;(variationRows || []).forEach((row) => {
    const list = variationsByProduct.get(row.product_id) || []
    list.push(row)
    variationsByProduct.set(row.product_id, list)
  })

  return items.map((item) => {
    const images = imagesByProduct.get(item.id) || []
    return {
      ...item,
      images,
      image_url: images[0]?.url || '',
      categories: categoriesByProduct.get(item.id) || [],
      tags: tagsByProduct.get(item.id) || [],
      brands:
        brandsByProduct.get(item.id) ||
        (() => {
          const creatorId = String(item?.created_by || '').trim()
          const fallbackBrand = creatorId ? creatorBrandByUserId.get(creatorId) : null
          return fallbackBrand ? [fallbackBrand] : []
        })(),
      variations: variationsByProduct.get(item.id) || [],
    }
  })
}

export async function listPublicProducts(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)

  const parseResult = publicProductListSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parseResult.success) {
    return jsonError('Invalid query.', 400)
  }

  const { page, per_page, cursor, fields, search, category, tag, vendor } = parseResult.data
  const cursorToken = cursor ? decodeListCursor(cursor) : null
  if (cursor && !cursorToken) {
    return jsonError('Invalid cursor.', 400)
  }
  const isCursorPagination = Boolean(cursorToken)
  const pageSize = Math.max(1, Number(per_page) || 12)

  const signalParse = personalizationSignalsSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!signalParse.success) {
    return jsonError('Invalid personalization signals.', 400)
  }
  const personalizationSignals = toPersonalizationSignals(signalParse.data)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const queryLimit = isCursorPagination ? pageSize + 1 : pageSize

  let productIds = null
  let skipDb = false
  if (category || tag || vendor) {
    let categoryProductIds: string[] | null = null
    let tagProductIds: string[] | null = null
    let vendorProductIds: string[] | null = null

    if (category) {
      const { data: categoryBySlug } = await supabase
        .from(CATEGORY_TABLE)
        .select('id')
        .eq('slug', category)
        .maybeSingle()

      const categoryId = categoryBySlug?.id || category
      const { data: linkData } = await supabase
        .from(CATEGORY_LINKS)
        .select('product_id')
        .eq('category_id', categoryId)
      categoryProductIds = Array.isArray(linkData) ? linkData.map((row) => row.product_id) : []
    }

    if (tag) {
      const { data: tagBySlug } = await supabase
        .from(TAG_TABLE)
        .select('id')
        .eq('slug', tag)
        .maybeSingle()

      const tagId = tagBySlug?.id || tag
      const { data: linkData } = await supabase
        .from(TAG_LINKS)
        .select('product_id')
        .eq('tag_id', tagId)
      tagProductIds = Array.isArray(linkData) ? linkData.map((row) => row.product_id) : []
    }

    if (vendor) {
      const brandIds = await resolveVendorBrandIds(supabase, vendor)
      if (!brandIds.length) {
        vendorProductIds = []
      } else {
        const { data: linkData } = await supabase
          .from(BRAND_LINKS)
          .select('product_id')
          .in('brand_id', brandIds)
        vendorProductIds = Array.isArray(linkData) ? linkData.map((row) => row.product_id) : []
      }
    }

    const activeIdLists = [categoryProductIds, tagProductIds, vendorProductIds].filter(
      (list): list is string[] => Array.isArray(list),
    )

    if (activeIdLists.length === 1) {
      productIds = activeIdLists[0]
    } else if (activeIdLists.length > 1) {
      let intersection = activeIdLists[0]
      for (let i = 1; i < activeIdLists.length; i += 1) {
        const set = new Set(activeIdLists[i])
        intersection = intersection.filter((id) => set.has(id))
      }
      productIds = intersection
    }

    if (!Array.isArray(productIds) || !productIds.length) {
      skipDb = true
    }
  }

  let query: any = (supabase as any)
    .from(PRODUCT_TABLE)
    .select(fields === 'card' ? PRODUCT_LIST_CARD_SELECT : PRODUCT_LIST_FULL_SELECT)
    .eq('status', 'publish')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })

  if (productIds) {
    query = query.in('id', productIds)
  }

  const searchTerm = search ? `%${search}%` : ''
  const combinedOrFilter = buildCombinedOrFilter({
    searchTerm,
    cursor: isCursorPagination ? cursorToken : null,
  })
  if (combinedOrFilter) {
    query = query.or(combinedOrFilter)
  }
  query = isCursorPagination ? query.range(0, queryLimit - 1) : query.range(from, to)

  let data = []
  let error = null
  if (!skipDb) {
    const response = await query
    data = response.data || []
    error = response.error
    if (error) {
      console.error('public product list failed:', error.message)
      return jsonError('Unable to load products.', 500)
    }
  }

  const pagedData =
    isCursorPagination && Array.isArray(data)
      ? data.slice(0, pageSize)
      : Array.isArray(data)
        ? data
        : []
  const hasMoreByQueryWindow =
    isCursorPagination && Array.isArray(data)
      ? data.length > pageSize
      : Array.isArray(data)
        ? data.length >= pageSize
        : false
  let hasMore = hasMoreByQueryWindow

  let totalCount = 0
  try {
    if (!skipDb && !isCursorPagination) {
      let countQuery = supabase
        .from(PRODUCT_TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'publish')
      if (search) {
        const term = `%${search}%`
        const disjunction = buildSearchDisjunction(term)
        const countFilter =
          disjunction.startsWith('or(') && disjunction.endsWith(')')
            ? disjunction.slice(3, -1)
            : disjunction
        countQuery = countQuery.or(countFilter)
      }
      if (productIds) {
        countQuery = countQuery.in('id', productIds)
      }
      const { count, error: countError } = await countQuery
      if (!countError) {
        totalCount = count ?? 0
      }
    }
  } catch (countErr) {
    console.error('public product count failed:', countErr)
  }

  if (!isCursorPagination) {
    hasMore = totalCount > 0 ? page * pageSize < totalCount : false
  }

  const nextCursor = hasMore && pagedData.length ? encodeListCursor(pagedData[pagedData.length - 1]) : ''

  const dbItems = await attachRelations(supabase, pagedData ?? [])
  const rankedItems = rankProductsWithSignals(dbItems, personalizationSignals)
  const totalPages = totalCount > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1

  const response = jsonOk({
    items: rankedItems,
    pages: totalPages,
    page: Math.max(1, Number(page) || 1),
    total_count: isCursorPagination ? null : totalCount || null,
    next_cursor: nextCursor || null,
    has_more: Boolean(hasMore && nextCursor),
  })
  applyCookies(response)
  return response
}

export async function getPublicProduct(request: NextRequest, slug: string) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)

  const parsed = publicProductSlugSchema.safeParse({ slug })
  if (!parsed.success) {
    return jsonError('Invalid product slug.', 400)
  }

  const previewRequested =
    request.nextUrl.searchParams.get('preview') === '1' ||
    request.nextUrl.searchParams.get('preview') === 'true'

  let previewViewerUserId = ''
  let previewViewerIsAdmin = false
  let previewViewerIsVendor = false

  if (previewRequested) {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user?.id) {
      return jsonError('Product not found.', 404)
    }
    previewViewerUserId = String(userData.user.id || '').trim()
    const roleInfo = await getUserRoleInfoSafe(
      supabase,
      previewViewerUserId,
      String(userData.user.email || ''),
    )
    previewViewerIsAdmin = Boolean(roleInfo.isAdmin)
    previewViewerIsVendor = Boolean(roleInfo.isVendor)
    if (!previewViewerIsAdmin && !previewViewerIsVendor) {
      return jsonError('Product not found.', 404)
    }
  }

  let readDb: any = supabase
  if (previewRequested) {
    try {
      readDb = createAdminSupabaseClient()
    } catch {
      return jsonError('Unable to load product.', 500)
    }
  }

  let query = readDb
    .from(PRODUCT_TABLE)
    .select('id, name, slug, short_description, description, price, discount_price, sku, stock_quantity, status, product_type, condition_check, packaging_style, return_policy, main_image_id, product_video_key, product_video_url, created_at, updated_at, created_by')
    .eq('slug', parsed.data.slug)

  if (!previewRequested) {
    query = query.eq('status', 'publish')
  } else if (previewViewerIsVendor && !previewViewerIsAdmin && previewViewerUserId) {
    query = query.eq('created_by', previewViewerUserId)
  }

  let { data, error } = await query.maybeSingle()

  if (!data && (!error || error.code === 'PGRST116') && isUuid(parsed.data.slug)) {
    let byIdQuery = readDb
      .from(PRODUCT_TABLE)
      .select('id, name, slug, short_description, description, price, discount_price, sku, stock_quantity, status, product_type, condition_check, packaging_style, return_policy, main_image_id, product_video_key, product_video_url, created_at, updated_at, created_by')
      .eq('id', parsed.data.slug)

    if (!previewRequested) {
      byIdQuery = byIdQuery.eq('status', 'publish')
    } else if (previewViewerIsVendor && !previewViewerIsAdmin && previewViewerUserId) {
      byIdQuery = byIdQuery.eq('created_by', previewViewerUserId)
    }

    const byIdResult = await byIdQuery.maybeSingle()
    data = byIdResult.data
    error = byIdResult.error
  }

  if (error && error.code !== 'PGRST116') {
    console.error('public product fetch failed:', error.message)
    return jsonError('Unable to load product.', 500)
  }

  if (!data) {
    const seedItem = findSeedProduct(parsed.data.slug)
    if (!seedItem) {
      return jsonError('Product not found.', 404)
    }
    const response = jsonOk({ item: seedItem })
    applyCookies(response)
    return response
  }

  const [item] = await attachRelations(readDb, [data])
  const itemWithCategoryPath = await attachPrimaryCategoryPath(readDb, item)
  const itemWithVendorProfile = await attachVendorProfile(readDb, itemWithCategoryPath)
  const response = jsonOk({ item: itemWithVendorProfile })
  applyCookies(response)
  return response
}
