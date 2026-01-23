import type { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import {
  buildSlug,
  createProductSchema,
  listProductsQuerySchema,
  productIdSchema,
  updateProductSchema,
} from '@/lib/admin/products'

const PRODUCT_TABLE = 'products'
const CATEGORY_LINKS = 'product_category_links'
const TAG_LINKS = 'product_tag_links'
const BRAND_LINKS = 'product_brand_links'
const IMAGE_TABLE = 'product_images'
const VARIATIONS_TABLE = 'product_variations'

const buildMissingTableMessage = () =>
  'products table not found. Run migration 012_admin_products.sql.'

const ensureUniqueSku = async (supabase, baseSku) => {
  if (!baseSku) return null
  const sanitize = baseSku.trim().toUpperCase().replace(/\s+/g, '-')
  let candidate = sanitize
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from(PRODUCT_TABLE)
      .select('id')
      .eq('sku', candidate)
      .limit(1)
    if (error) {
      console.error('sku lookup failed:', error.message)
      break
    }
    if (!data || data.length === 0) {
      return candidate
    }
    candidate = `${sanitize}-${Math.floor(Math.random() * 900 + 100)}`
  }
  return `${sanitize}-${Date.now().toString().slice(-4)}`
}

const mapRelations = (items, relations, key) => {
  const grouped = new Map()
  relations.forEach((row) => {
    const list = grouped.get(row.product_id) || []
    list.push(row[key])
    grouped.set(row.product_id, list)
  })
  return items.map((item) => ({
    ...item,
    [key]: grouped.get(item.id) || [],
  }))
}

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

  let result = mapRelations(items, categoryRows, 'admin_categories')
  result = mapRelations(result, tagRows, 'admin_tags')
  result = mapRelations(result, brandRows, 'admin_brands')

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

  return result.map((item) => {
    const images = imagesByProduct.get(item.id) || []
    return {
      ...item,
      images,
      image_url: images[0]?.url || '',
      categories: item.admin_categories || [],
      tags: item.admin_tags || [],
      brands: item.admin_brands || [],
      variations: variationsByProduct.get(item.id) || [],
    }
  })
}

const updateLinks = async (supabase, table, column, productId, ids) => {
  await supabase.from(table).delete().eq('product_id', productId)
  if (!ids || !ids.length) return
  const payload = ids.map((id) => ({
    product_id: productId,
    [column]: id,
  }))
  const { error } = await supabase.from(table).insert(payload)
  if (error) {
    throw new Error(error.message)
  }
}

const updateImages = async (supabase, productId, imageIds) => {
  if (!imageIds || !imageIds.length) return
  for (let index = 0; index < imageIds.length; index += 1) {
    const { error } = await supabase
      .from(IMAGE_TABLE)
      .update({ product_id: productId, sort_order: index })
      .eq('id', imageIds[index])
    if (error) {
      console.error('product image attach failed:', error.message)
      throw new Error('Unable to attach images.')
    }
  }
}

const updateVariations = async (supabase, productId, variations) => {
  await supabase.from(VARIATIONS_TABLE).delete().eq('product_id', productId)
  if (!variations || !variations.length) return
  const payload = variations.map((variation, index) => ({
    product_id: productId,
    attributes: variation.attributes || {},
    regular_price:
      variation.regular_price !== undefined && variation.regular_price !== ''
        ? Number(variation.regular_price)
        : null,
    sale_price:
      variation.sale_price !== undefined && variation.sale_price !== ''
        ? Number(variation.sale_price)
        : null,
    sku: variation.sku || null,
    stock_quantity:
      variation.stock_quantity !== undefined && variation.stock_quantity !== ''
        ? Number(variation.stock_quantity)
        : 0,
    image_id: variation.image_id || null,
    sort_order: index,
  }))
  const { error } = await supabase.from(VARIATIONS_TABLE).insert(payload)
  if (error) {
    console.error('product variations update failed:', error.message)
    throw new Error('Unable to save product variations.')
  }
}

export async function listProducts(request: NextRequest) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const parseResult = listProductsQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parseResult.success) {
    return jsonError('Invalid query.', 400)
  }

  const { page, per_page, search, status } = parseResult.data
  const from = (page - 1) * per_page
  const to = from + per_page - 1

  let query = supabase
    .from(PRODUCT_TABLE)
    .select('id, name, slug, short_description, description, price, discount_price, sku, stock_quantity, status, product_type, main_image_id, created_at, updated_at')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) {
    query = query.eq('status', status)
  }
  if (search) {
    const term = `%${search}%`
    query = query.or(`name.ilike.${term},slug.ilike.${term},sku.ilike.${term}`)
  }

  const { data, error } = await query
  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('product list failed:', error.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to load products.', 500)
  }

  let totalCount = 0
  try {
    let countQuery = supabase
      .from(PRODUCT_TABLE)
      .select('id', { count: 'exact', head: true })
    if (status) {
      countQuery = countQuery.eq('status', status)
    }
    if (search) {
      const term = `%${search}%`
      countQuery = countQuery.or(`name.ilike.${term},slug.ilike.${term},sku.ilike.${term}`)
    }
    const { count, error: countError } = await countQuery
    if (countError) {
      console.error('product count failed:', countError.message)
    } else {
      totalCount = count ?? 0
    }
  } catch (countErr) {
    console.error('product count failed:', countErr)
  }

  const items = await attachRelations(supabase, data ?? [])

  const pages = totalCount
    ? Math.max(1, Math.ceil(totalCount / per_page))
    : data && data.length === per_page
      ? page + 1
      : page

  const response = jsonOk({ items, pages, page, total_count: totalCount || null })
  applyCookies(response)
  return response
}

export async function getProduct(request: NextRequest, id: string) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const parsed = productIdSchema.safeParse({ id })
  if (!parsed.success) {
    return jsonError('Invalid product id.', 400)
  }

  const { data, error } = await supabase
    .from(PRODUCT_TABLE)
    .select('id, name, slug, short_description, description, price, discount_price, sku, stock_quantity, status, product_type, main_image_id, created_at, updated_at')
    .eq('id', parsed.data.id)
    .single()

  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('product load failed:', error.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Product not found.', 404)
  }

  const [item] = await attachRelations(supabase, [data])
  const response = jsonOk({ item })
  applyCookies(response)
  return response
}

export async function createProduct(request: NextRequest) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    console.error('product create parse error:', error)
    return jsonError('Invalid payload.', 400)
  }

  const parsed = createProductSchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError('Invalid product details.', 400)
  }
  if (
    parsed.data.discount_price !== undefined &&
    parsed.data.discount_price !== null &&
    parsed.data.discount_price > parsed.data.price
  ) {
    return jsonError('Discount price cannot exceed base price.', 400)
  }

  const slugSource = parsed.data.slug || parsed.data.name
  const slug = buildSlug(slugSource)
  if (!slug) {
    return jsonError('Invalid slug.', 400)
  }

  const sku = await ensureUniqueSku(supabase, parsed.data.sku || `SKU-${slug}`)

  const { data, error } = await supabase
    .from(PRODUCT_TABLE)
    .insert({
      name: parsed.data.name,
      slug,
      short_description: parsed.data.short_description || null,
      description: parsed.data.description || null,
      price: parsed.data.price,
      discount_price: parsed.data.discount_price || null,
      sku: sku || null,
      stock_quantity: parsed.data.stock_quantity ?? 0,
      status: parsed.data.status || 'publish',
      product_type:
        parsed.data.product_type ||
        (Array.isArray(parsed.data.variations) && parsed.data.variations.length ? 'variable' : 'simple'),
      main_image_id: parsed.data.main_image_id || null,
    })
    .select('id, name, slug, short_description, description, price, discount_price, sku, stock_quantity, status, product_type, main_image_id, created_at, updated_at')
    .single()

  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('product create failed:', error.message)
    if (errorCode === '23505') {
      return jsonError('Slug or SKU already exists.', 409)
    }
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to create product.', 500)
  }

  try {
    await updateLinks(supabase, CATEGORY_LINKS, 'category_id', data.id, parsed.data.category_ids)
    await updateLinks(supabase, TAG_LINKS, 'tag_id', data.id, parsed.data.tag_ids || [])
    await updateLinks(supabase, BRAND_LINKS, 'brand_id', data.id, parsed.data.brand_ids || [])
    await updateImages(supabase, data.id, parsed.data.image_ids || [])
    await updateVariations(supabase, data.id, parsed.data.variations || [])
  } catch (linkError) {
    console.error('product links failed:', linkError)
    return jsonError('Unable to attach product relationships.', 500)
  }

  const [item] = await attachRelations(supabase, [data])
  const response = jsonOk({ item })
  applyCookies(response)
  return response
}

export async function updateProduct(request: NextRequest, id: string) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    console.error('product update parse error:', error)
    return jsonError('Invalid payload.', 400)
  }

  const parsed = updateProductSchema.safeParse({ id, ...(payload as object) })
  if (!parsed.success) {
    return jsonError('Invalid product details.', 400)
  }
  if (
    parsed.data.discount_price !== undefined &&
    parsed.data.price !== undefined &&
    parsed.data.discount_price !== null &&
    parsed.data.discount_price > parsed.data.price
  ) {
    return jsonError('Discount price cannot exceed base price.', 400)
  }

  const updates = parsed.data
  const slugSource = updates.slug || updates.name
  const slug = slugSource ? buildSlug(slugSource) : undefined

  const sku = updates.sku ? await ensureUniqueSku(supabase, updates.sku) : null

  const { data, error } = await supabase
    .from(PRODUCT_TABLE)
    .update({
      name: updates.name,
      slug: slug,
      short_description: updates.short_description ?? null,
      description: updates.description ?? null,
      price: updates.price,
      discount_price: updates.discount_price ?? null,
      sku: updates.sku ? sku : null,
      stock_quantity: updates.stock_quantity,
      status: updates.status,
      product_type: updates.product_type,
      main_image_id: updates.main_image_id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.id)
    .select('id, name, slug, short_description, description, price, discount_price, sku, stock_quantity, status, product_type, main_image_id, created_at, updated_at')
    .single()

  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('product update failed:', error.message)
    if (errorCode === '23505') {
      return jsonError('Slug or SKU already exists.', 409)
    }
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to update product.', 500)
  }

  try {
    if (Array.isArray(updates.category_ids)) {
      await updateLinks(supabase, CATEGORY_LINKS, 'category_id', data.id, updates.category_ids)
    }
    if (Array.isArray(updates.tag_ids)) {
      await updateLinks(supabase, TAG_LINKS, 'tag_id', data.id, updates.tag_ids)
    }
    if (Array.isArray(updates.brand_ids)) {
      await updateLinks(supabase, BRAND_LINKS, 'brand_id', data.id, updates.brand_ids)
    }
    if (Array.isArray(updates.image_ids)) {
      await updateImages(supabase, data.id, updates.image_ids)
    }
    if (Array.isArray(updates.variations)) {
      await updateVariations(supabase, data.id, updates.variations)
    }
  } catch (linkError) {
    console.error('product update links failed:', linkError)
    return jsonError('Unable to update product relationships.', 500)
  }

  const [item] = await attachRelations(supabase, [data])
  const response = jsonOk({ item })
  applyCookies(response)
  return response
}

export async function deleteProduct(request: NextRequest, id: string) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const parsed = productIdSchema.safeParse({ id })
  if (!parsed.success) {
    return jsonError('Invalid product id.', 400)
  }

  const { error } = await supabase.from(PRODUCT_TABLE).delete().eq('id', parsed.data.id)
  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('product delete failed:', error.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to delete product.', 500)
  }

  const response = jsonOk({ deleted: true })
  applyCookies(response)
  return response
}
