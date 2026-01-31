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
const CATEGORY_LINKS = 'product_category_links'
const TAG_LINKS = 'product_tag_links'
const BRAND_LINKS = 'product_brand_links'
const IMAGE_TABLE = 'product_images'
const VARIATIONS_TABLE = 'product_variations'

const attachRelations = async (supabase, items) => {
  if (!items.length) return items
  const ids = items.map((item) => item.id)
  const [categoryRes, tagRes, brandRes, imageRes] = await Promise.all([
    supabase
      .from(CATEGORY_LINKS)
      .select('product_id, admin_categories(id, name, slug)')
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

  const { page, per_page, search, category } = parseResult.data

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
  if (category) {
    const { data: categoryData } = await supabase
      .from(CATEGORY_TABLE)
      .select('id')
      .eq('slug', category)
      .maybeSingle()
    if (!categoryData?.id) {
      skipDb = true
    } else {
      const { data: linkData } = await supabase
        .from(CATEGORY_LINKS)
        .select('product_id')
        .eq('category_id', categoryData.id)
      productIds = Array.isArray(linkData) ? linkData.map((row) => row.product_id) : []
      if (!productIds.length) {
        skipDb = true
      }
    }
  }

  let query = supabase
    .from(PRODUCT_TABLE)
    .select('id, name, slug, short_description, description, price, discount_price, sku, stock_quantity, status, product_type, main_image_id, created_at, updated_at')
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
  const seedItems = filterSeedProducts({ search, category })
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
    .select('id, name, slug, short_description, description, price, discount_price, sku, stock_quantity, status, product_type, main_image_id, created_at, updated_at')
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
  const response = jsonOk({ item })
  applyCookies(response)
  return response
}
