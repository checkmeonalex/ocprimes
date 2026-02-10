import type { NextRequest } from 'next/server'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { jsonError, jsonOk } from '@/lib/http/response'
import { publicProductListSchema, publicProductSlugSchema } from '@/lib/catalog/products'
import {
  filterSeedProducts,
  findSeedProduct,
  mergeSeedAndDbProducts,
} from '@/lib/catalog/seed-products'
import { getUserRole } from '@/lib/auth/roles'
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

const toCategorySlug = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

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
      .select('product_id, admin_brands(id, name, slug)')
      .in('product_id', ids),
    supabase
      .from(IMAGE_TABLE)
      .select('id, product_id, url, alt_text, sort_order')
      .in('product_id', ids)
      .order('sort_order', { ascending: true }),
  ])

  const categoryRows = categoryRes.data || []
  const tagRows = tagRes.data || []
  const brandRows = brandRes.data || []
  const imageRows = imageRes.data || []

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
      brands: brandsByProduct.get(item.id) || [],
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

  const { page, per_page, search, category, tag, vendor } = parseResult.data

  const signalParse = personalizationSignalsSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!signalParse.success) {
    return jsonError('Invalid personalization signals.', 400)
  }
  const personalizationSignals = toPersonalizationSignals(signalParse.data)
  const from = (page - 1) * per_page
  const to = from + per_page - 1

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
      const { data: brandBySlug } = await supabase
        .from(BRAND_TABLE)
        .select('id')
        .eq('slug', vendor)
        .maybeSingle()

      const brandId = brandBySlug?.id || vendor
      const { data: linkData } = await supabase
        .from(BRAND_LINKS)
        .select('product_id')
        .eq('brand_id', brandId)
      vendorProductIds = Array.isArray(linkData) ? linkData.map((row) => row.product_id) : []
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

  let query = supabase
    .from(PRODUCT_TABLE)
    .select('id, name, slug, short_description, description, price, discount_price, sku, stock_quantity, status, product_type, condition_check, packaging_style, return_policy, main_image_id, created_at, updated_at')
    .eq('status', 'publish')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search) {
    const term = `%${search}%`
    query = query.or(`name.ilike.${term},slug.ilike.${term},sku.ilike.${term}`)
  }
  if (productIds) {
    query = query.in('id', productIds)
  }

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

  let totalCount = 0
  try {
    if (!skipDb) {
      let countQuery = supabase
        .from(PRODUCT_TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'publish')
      if (search) {
        const term = `%${search}%`
        countQuery = countQuery.or(`name.ilike.${term},slug.ilike.${term},sku.ilike.${term}`)
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

  const dbItems = await attachRelations(supabase, data ?? [])
  const seedItems = tag ? [] : filterSeedProducts({ search, category, vendor })
  const mergedItems = mergeSeedAndDbProducts(seedItems, dbItems, { dbFirst: true })
  const rankedItems = rankProductsWithSignals(mergedItems, personalizationSignals)
  const combinedCount = (totalCount || 0) + seedItems.length

  const response = jsonOk({
    items: rankedItems,
    pages: 1,
    page: 1,
    total_count: combinedCount || null,
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

  if (previewRequested) {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user?.id) {
      return jsonError('Product not found.', 404)
    }
    const role = await getUserRole(supabase, userData.user.id)
    if (role !== 'admin') {
      return jsonError('Product not found.', 404)
    }
  }

  let query = supabase
    .from(PRODUCT_TABLE)
    .select('id, name, slug, short_description, description, price, discount_price, sku, stock_quantity, status, product_type, condition_check, packaging_style, return_policy, main_image_id, created_at, updated_at')
    .eq('slug', parsed.data.slug)

  if (!previewRequested) {
    query = query.eq('status', 'publish')
  }

  const { data, error } = await query.single()

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

  const [item] = await attachRelations(supabase, [data])
  const itemWithCategoryPath = await attachPrimaryCategoryPath(supabase, item)
  const response = jsonOk({ item: itemWithCategoryPath })
  applyCookies(response)
  return response
}
