import type { NextRequest } from 'next/server'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { notifyAllAdmins } from '@/lib/admin/notifications'
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
const PENDING_CATEGORY_REQUEST_TABLE = 'vendor_category_requests'
const PRODUCT_PENDING_CATEGORY_LINKS = 'vendor_product_pending_category_requests'

const buildMissingTableMessage = () =>
  'products table not found. Run migration 012_admin_products.sql.'
const buildMissingOwnerColumnMessage = () =>
  'products.created_by column not found. Run migration 042_vendor_access.sql.'

const buildValidationErrorPayload = (error: any) => {
  const flattened = error?.flatten?.() || { fieldErrors: {}, formErrors: [] }
  const issues = Array.isArray(error?.issues)
    ? error.issues.map((issue: any) => ({
        path: Array.isArray(issue.path) ? issue.path.join('.') : '',
        message: issue.message,
        code: issue.code,
      }))
    : []
  return {
    field_errors: flattened.fieldErrors || {},
    form_errors: flattened.formErrors || [],
    issues,
  }
}

const ensureUniqueSku = async (supabase, baseSku, excludeProductId?: string) => {
  if (!baseSku) return null
  const sanitize = baseSku.trim().toUpperCase().replace(/\s+/g, '-')
  let candidate = sanitize
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let query = supabase
      .from(PRODUCT_TABLE)
      .select('id')
      .eq('sku', candidate)
      .limit(1)
    if (excludeProductId) {
      query = query.neq('id', excludeProductId)
    }
    const { data, error } = await query
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

const resolveUniqueProductSlug = async (
  supabase,
  baseSlug: string,
  excludeProductId?: string,
) => {
  const normalizedBase = buildSlug(baseSlug)
  if (!normalizedBase) return ''
  let candidate = normalizedBase
  for (let attempt = 0; attempt < 10; attempt += 1) {
    let query = supabase.from(PRODUCT_TABLE).select('id').eq('slug', candidate).limit(1)
    if (excludeProductId) {
      query = query.neq('id', excludeProductId)
    }
    const { data, error } = await query
    if (error) {
      console.error('product slug lookup failed:', error.message)
      return `${normalizedBase}-${Date.now().toString().slice(-5)}`
    }
    if (!Array.isArray(data) || data.length === 0) {
      return candidate
    }
    candidate = `${normalizedBase}-${attempt + 2}`
  }
  return `${normalizedBase}-${Date.now().toString().slice(-5)}`
}

const resolveUserBrandSlugFallback = (user: any) => {
  const metadata = user?.user_metadata && typeof user.user_metadata === 'object'
    ? user.user_metadata
    : {}
  const profile = metadata?.profile && typeof metadata.profile === 'object'
    ? metadata.profile
    : {}
  return buildSlug(
    metadata?.brand_slug ||
      metadata?.brand_name ||
      profile?.brand_slug ||
      profile?.brand_name ||
      '',
  )
}

const toLettersOnlyPrefix = (value: string, fallback = 'PR') => {
  const cleaned = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
  if (!cleaned) return fallback
  return cleaned.slice(0, 2).padEnd(2, 'X')
}

const randomDigits = (length: number) =>
  Array.from({ length }, () => Math.floor(Math.random() * 10)).join('')

const randomLetters = (length: number) =>
  Array.from({ length }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26)),
  ).join('')

const generateSkuCandidate = (prefix: string) =>
  `${prefix}${randomDigits(7)}${randomLetters(2)}`

const resolveSkuPrefixFromCategory = async (supabase, categoryIds: string[] = []) => {
  const primaryCategoryId = Array.isArray(categoryIds) ? categoryIds[0] : null
  if (!primaryCategoryId) return 'PR'
  const { data, error } = await supabase
    .from('admin_categories')
    .select('name, slug')
    .eq('id', primaryCategoryId)
    .maybeSingle()
  if (error) {
    console.error('sku category prefix lookup failed:', error.message)
    return 'PR'
  }
  return toLettersOnlyPrefix(data?.slug || data?.name || 'PR', 'PR')
}

const generateAutoSku = async (supabase, categoryIds: string[] = []) => {
  const prefix = await resolveSkuPrefixFromCategory(supabase, categoryIds)
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = generateSkuCandidate(prefix)
    const { data, error } = await supabase
      .from(PRODUCT_TABLE)
      .select('id')
      .eq('sku', candidate)
      .limit(1)
    if (error) {
      console.error('auto sku lookup failed:', error.message)
      break
    }
    if (!Array.isArray(data) || data.length === 0) {
      return candidate
    }
  }
  return `${prefix}${Date.now().toString().slice(-9)}`
}

const resolveCategoryIdsForSkuGeneration = async (
  supabase,
  productId: string,
  incomingCategoryIds?: string[],
) => {
  if (Array.isArray(incomingCategoryIds) && incomingCategoryIds.length) {
    return incomingCategoryIds
  }
  const { data, error } = await supabase
    .from(CATEGORY_LINKS)
    .select('category_id')
    .eq('product_id', productId)
    .limit(1)
  if (error) {
    console.error('category lookup for sku generation failed:', error.message)
    return []
  }
  const categoryId =
    Array.isArray(data) && data[0]?.category_id ? String(data[0].category_id) : ''
  return categoryId ? [categoryId] : []
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
  const [categoryRes, tagRes, brandRes, imageRes, pendingCategoryReqRes] = await Promise.all([
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
    supabase
      .from(PRODUCT_PENDING_CATEGORY_LINKS)
      .select('product_id, category_request_id')
      .in('product_id', ids),
  ])

  const categoryRows = categoryRes.data || []
  const tagRows = tagRes.data || []
  const brandRows = brandRes.data || []
  const imageRows = imageRes.data || []
  const pendingCategoryRows = pendingCategoryReqRes.data || []

  let result = mapRelations(items, categoryRows, 'admin_categories')
  result = mapRelations(result, tagRows, 'admin_tags')
  result = mapRelations(result, brandRows, 'admin_brands')
  result = mapRelations(result, pendingCategoryRows, 'category_request_id')

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
      pending_category_request_ids: item.category_request_id || [],
      variations: variationsByProduct.get(item.id) || [],
    }
  })
}

const updateLinks = async (supabase, table, column, productId, ids) => {
  const { error: deleteError } = await supabase.from(table).delete().eq('product_id', productId)
  if (deleteError) {
    throw new Error(deleteError.message)
  }
  if (!ids || !ids.length) return

  const seen = new Set<string>()
  const dedupedIds = ids.filter((id) => {
    if (id === null || id === undefined || id === '') return false
    const key = String(id)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  if (!dedupedIds.length) return

  const payload = dedupedIds.map((id) => ({
    product_id: productId,
    [column]: id,
  }))
  const { error } = await supabase.from(table).upsert(payload, {
    onConflict: `product_id,${column}`,
    ignoreDuplicates: true,
  })
  if (error) {
    throw new Error(error.message)
  }
}

const validatePendingCategoryRequests = async (
  supabase,
  pendingRequestIds: string[] = [],
  userId: string,
  isAdmin: boolean,
  isVendor: boolean,
) => {
  if (!Array.isArray(pendingRequestIds) || !pendingRequestIds.length) {
    return { ids: [] as string[], error: null as string | null }
  }
  const dedupedIds = Array.from(new Set(pendingRequestIds.filter(Boolean).map(String)))
  if (!dedupedIds.length) {
    return { ids: [] as string[], error: null as string | null }
  }

  let query = supabase
    .from(PENDING_CATEGORY_REQUEST_TABLE)
    .select('id, requester_user_id, status')
    .in('id', dedupedIds)

  if (isVendor && !isAdmin) {
    query = query.eq('requester_user_id', userId)
  }

  const { data, error } = await query
  if (error) {
    console.error('pending category requests validation failed:', error.message)
    return { ids: [] as string[], error: 'Unable to validate pending category requests.' }
  }

  const rows = Array.isArray(data) ? data : []
  const validIds = rows
    .filter((row: any) => row?.id && String(row?.status || '') === 'pending')
    .map((row: any) => String(row.id))
  if (validIds.length !== dedupedIds.length) {
    console.warn(
      'pending category request ids contained stale/invalid entries; ignoring missing ids',
      {
        requested: dedupedIds.length,
        valid: validIds.length,
        userId,
      },
    )
  }
  return { ids: validIds, error: null as string | null }
}

const syncPendingCategoryRequestLinks = async (
  supabase,
  productId: string,
  categoryRequestIds: string[] = [],
) => {
  const { error: deleteError } = await supabase
    .from(PRODUCT_PENDING_CATEGORY_LINKS)
    .delete()
    .eq('product_id', productId)
  if (deleteError) {
    console.error('pending category request links delete failed:', deleteError.message)
    throw new Error('Unable to update pending category requests.')
  }
  if (!Array.isArray(categoryRequestIds) || !categoryRequestIds.length) return
  const payload = categoryRequestIds.map((requestId) => ({
    product_id: productId,
    category_request_id: requestId,
  }))
  const { error: insertError } = await supabase
    .from(PRODUCT_PENDING_CATEGORY_LINKS)
    .upsert(payload, { onConflict: 'product_id,category_request_id', ignoreDuplicates: true })
  if (insertError) {
    console.error('pending category request links upsert failed:', insertError.message)
    throw new Error('Unable to update pending category requests.')
  }
}

const updateImages = async (supabase, productId, imageIds, userId?: string | null) => {
  if (!imageIds || !imageIds.length) {
    return { resolvedImageIds: [] as string[], idMap: new Map<string, string>() }
  }

  const uniqueIds = Array.from(new Set(imageIds.filter(Boolean)))
  const { data: sourceImages, error: loadError } = await supabase
    .from(IMAGE_TABLE)
    .select('id, product_id, r2_key, url, alt_text, created_by')
    .in('id', uniqueIds)
  if (loadError) {
    console.error('product image load failed:', loadError.message)
    throw new Error('Unable to attach images.')
  }

  const imageById = new Map<string, any>()
  ;(sourceImages || []).forEach((row) => {
    if (row?.id) imageById.set(String(row.id), row)
  })

  const resolvedImageIds: string[] = []
  const idMap = new Map<string, string>()

  for (let index = 0; index < imageIds.length; index += 1) {
    const originalId = String(imageIds[index] || '')
    if (!originalId) continue
    const source = imageById.get(originalId)
    if (!source) continue

    const sourceProductId = source.product_id ? String(source.product_id) : ''
    if (sourceProductId && sourceProductId !== productId) {
      const { data: clonedImage, error: cloneError } = await supabase
        .from(IMAGE_TABLE)
        .insert({
          product_id: productId,
          r2_key: source.r2_key,
          url: source.url,
          alt_text: source.alt_text || null,
          sort_order: index,
          created_by: userId || source.created_by || null,
        })
        .select('id')
        .single()
      if (cloneError || !clonedImage?.id) {
        console.error('product image clone failed:', cloneError?.message || 'missing id')
        throw new Error('Unable to attach images.')
      }
      const clonedId = String(clonedImage.id)
      resolvedImageIds.push(clonedId)
      idMap.set(originalId, clonedId)
      continue
    }

    const { error: attachError } = await supabase
      .from(IMAGE_TABLE)
      .update({ product_id: productId, sort_order: index })
      .eq('id', originalId)
    if (attachError) {
      console.error('product image attach failed:', attachError.message)
      throw new Error('Unable to attach images.')
    }
    resolvedImageIds.push(originalId)
    idMap.set(originalId, originalId)
  }

  return { resolvedImageIds, idMap }
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

const resolveVendorBrandIds = async (db, userId: string, user?: any) => {
  const { data, error } = await db.from('admin_brands').select('id').eq('created_by', userId)
  if (error) {
    console.error('vendor brand lookup failed:', error.message)
  } else if (Array.isArray(data) && data.length) {
    return data.map((item) => item.id).filter(Boolean)
  }

  const fallbackSlug = resolveUserBrandSlugFallback(user)
  if (!fallbackSlug) return []
  const { data: slugMatch, error: slugError } = await db
    .from('admin_brands')
    .select('id')
    .eq('slug', fallbackSlug)
    .limit(1)
  if (slugError) {
    console.error('vendor brand fallback lookup failed:', slugError.message)
    return []
  }
  return Array.isArray(slugMatch) ? slugMatch.map((item) => item.id).filter(Boolean) : []
}

const resolveVendorAccessibleProductIds = async (db, userId: string, user?: any) => {
  const [vendorBrandIds, ownProductsResult] = await Promise.all([
    resolveVendorBrandIds(db, userId, user),
    db.from(PRODUCT_TABLE).select('id').eq('created_by', userId),
  ])

  const ownProductIds =
    ownProductsResult.error
      ? []
      : Array.isArray(ownProductsResult.data)
        ? ownProductsResult.data
            .map((item: any) => String(item?.id || ''))
            .filter(Boolean)
        : []

  let brandLinkedProductIds: string[] = []
  if (vendorBrandIds.length) {
    const { data, error } = await db
      .from(BRAND_LINKS)
      .select('product_id')
      .in('brand_id', vendorBrandIds)
    if (error) {
      console.error('vendor accessible products by brand lookup failed:', error.message)
    } else {
      brandLinkedProductIds = Array.isArray(data)
        ? data
            .map((item: any) => String(item?.product_id || ''))
            .filter(Boolean)
        : []
    }
  }

  return Array.from(new Set([...ownProductIds, ...brandLinkedProductIds]))
}

const canVendorAccessProduct = async (db, userId: string, productId: string, user?: any) => {
  const safeProductId = String(productId || '')
  if (!safeProductId) return false

  const [ownProductResult, vendorBrandIds] = await Promise.all([
    db
      .from(PRODUCT_TABLE)
      .select('id')
      .eq('id', safeProductId)
      .eq('created_by', userId)
      .maybeSingle(),
    resolveVendorBrandIds(db, userId, user),
  ])

  if (ownProductResult.data?.id) return true
  if (!vendorBrandIds.length) return false

  const { data, error } = await db
    .from(BRAND_LINKS)
    .select('product_id')
    .eq('product_id', safeProductId)
    .in('brand_id', vendorBrandIds)
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('vendor product access by brand check failed:', error.message)
    return false
  }
  return Boolean(data?.product_id)
}

const filterBrandIdsForVendor = (brandIds: string[] | undefined, allowedBrandIds: string[]) => {
  if (!Array.isArray(brandIds) || !brandIds.length) return []
  const allowed = new Set(allowedBrandIds)
  return brandIds.filter((id) => allowed.has(id))
}

const resolveVendorReviewGate = async (db: any, userId: string, user?: any) => {
  const brandIds = await resolveVendorBrandIds(db, userId, user)
  if (!brandIds.length) {
    return { enabled: false, brandId: '', brandName: '' }
  }
  const { data, error } = await db
    .from('admin_brands')
    .select('id, name, require_product_review_for_publish')
    .in('id', brandIds)
    .limit(20)

  if (error) {
    const errorCode = String((error as { code?: string })?.code || '')
    if (errorCode !== '42703') {
      console.error('vendor review gate lookup failed:', error.message)
    }
    return { enabled: false, brandId: '', brandName: '' }
  }

  const rows = Array.isArray(data) ? data : []
  if (!rows.length) return { enabled: false, brandId: '', brandName: '' }
  const requiredRow = rows.find((item: any) => Boolean(item?.require_product_review_for_publish))
  const picked = requiredRow || rows[0]
  return {
    enabled: Boolean(requiredRow?.require_product_review_for_publish),
    brandId: String(picked?.id || ''),
    brandName: String(picked?.name || '').trim(),
  }
}

export async function listProducts(request: NextRequest) {
  const { applyCookies, canManageCatalog, isVendor, user } =
    await requireDashboardUser(request)

  if (!canManageCatalog) {
    return jsonError('Forbidden.', 403)
  }
  const db = createAdminSupabaseClient()

  const parseResult = listProductsQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parseResult.success) {
    return jsonError('Invalid query.', 400)
  }

  const { page, per_page, search, status } = parseResult.data
  const from = (page - 1) * per_page
  const to = from + per_page - 1
  let vendorAccessibleProductIds: string[] = []
  if (isVendor && user?.id) {
    vendorAccessibleProductIds = await resolveVendorAccessibleProductIds(db, user.id, user)
    if (!vendorAccessibleProductIds.length) {
      const response = jsonOk({ items: [], pages: 1, page, total_count: 0 })
      applyCookies(response)
      return response
    }
  }

  let query = db
    .from(PRODUCT_TABLE)
    .select('id, name, slug, short_description, description, price, discount_price, sku, sku_auto_generated, stock_quantity, status, product_type, condition_check, packaging_style, return_policy, main_image_id, created_at, updated_at')
    .order('created_at', { ascending: false })
    .range(from, to)
  if (isVendor) {
    query = query.in('id', vendorAccessibleProductIds)
  }

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
    if (errorCode === '42703') {
      return jsonError(buildMissingOwnerColumnMessage(), 500)
    }
    return jsonError('Unable to load products.', 500)
  }

  let totalCount = 0
  try {
    let countQuery = db
      .from(PRODUCT_TABLE)
      .select('id', { count: 'exact', head: true })
    if (isVendor) {
      countQuery = countQuery.in('id', vendorAccessibleProductIds)
    }
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

  const items = await attachRelations(db, data ?? [])

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
  const { applyCookies, canManageCatalog, isVendor, user } =
    await requireDashboardUser(request)

  if (!canManageCatalog) {
    return jsonError('Forbidden.', 403)
  }
  const db = createAdminSupabaseClient()

  const parsed = productIdSchema.safeParse({ id })
  if (!parsed.success) {
    return jsonError('Invalid product id.', 400)
  }
  if (isVendor && user?.id) {
    const hasAccess = await canVendorAccessProduct(db, user.id, parsed.data.id, user)
    if (!hasAccess) {
      return jsonError('Product not found.', 404)
    }
  }

  const query = db
    .from(PRODUCT_TABLE)
    .select('id, name, slug, short_description, description, price, discount_price, sku, sku_auto_generated, stock_quantity, status, product_type, condition_check, packaging_style, return_policy, main_image_id, created_at, updated_at')
    .eq('id', parsed.data.id)
  const { data, error } = await query.single()

  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('product load failed:', error.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    if (errorCode === '42703') {
      return jsonError(buildMissingOwnerColumnMessage(), 500)
    }
    return jsonError('Product not found.', 404)
  }

  const [item] = await attachRelations(db, [data])
  const response = jsonOk({ item })
  applyCookies(response)
  return response
}

export async function createProduct(request: NextRequest) {
  const { applyCookies, canManageCatalog, isAdmin, isVendor, user } =
    await requireDashboardUser(request)

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }
  const db = createAdminSupabaseClient()

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    console.error('product create parse error:', error)
    return jsonError('Invalid payload.', 400)
  }

  const parsed = createProductSchema.safeParse(payload)
  if (!parsed.success) {
    return jsonOk(
      {
        error: 'Invalid product details.',
        validation: buildValidationErrorPayload(parsed.error),
      },
      400,
    )
  }
  if (
    parsed.data.discount_price !== undefined &&
    parsed.data.discount_price !== null &&
    parsed.data.discount_price > parsed.data.price
  ) {
    return jsonError('Discount price cannot exceed base price.', 400)
  }

  const requestedCategoryIds = Array.isArray(parsed.data.category_ids)
    ? parsed.data.category_ids
    : []
  const pendingValidation = await validatePendingCategoryRequests(
    db,
    parsed.data.pending_category_request_ids || [],
    user.id,
    isAdmin,
    isVendor,
  )
  if (pendingValidation.error) {
    return jsonError(pendingValidation.error, 400)
  }
  const pendingCategoryRequestIds = pendingValidation.ids

  if (!requestedCategoryIds.length && !pendingCategoryRequestIds.length) {
    return jsonError('Select at least one category or request a new category.', 400)
  }
  if (!requestedCategoryIds.length && pendingCategoryRequestIds.length) {
    const targetStatus = parsed.data.status || 'publish'
    if (targetStatus !== 'draft') {
      return jsonError('Products with pending category requests must be saved as draft.', 400)
    }
  }

  const slugSource = parsed.data.slug || parsed.data.name
  const baseSlug = buildSlug(slugSource)
  if (!baseSlug) {
    return jsonError('Invalid slug.', 400)
  }
  const slug = await resolveUniqueProductSlug(db, baseSlug)

  let finalBrandIds = parsed.data.brand_ids || []
  if (isVendor) {
    const vendorBrandIds = await resolveVendorBrandIds(db, user.id, user)
    if (!vendorBrandIds.length) {
      return jsonError('No vendor brand linked to this account.', 400)
    }
    const requestedBrandIds = filterBrandIdsForVendor(parsed.data.brand_ids || [], vendorBrandIds)
    finalBrandIds = requestedBrandIds.length ? requestedBrandIds : [vendorBrandIds[0]]
  }

  const providedSku = parsed.data.sku?.trim()
  const skuAutoGenerated = !providedSku
  const sku = providedSku
    ? await ensureUniqueSku(db, providedSku)
    : await generateAutoSku(db, parsed.data.category_ids || [])

  const requestedCreateStatus = parsed.data.status || 'publish'
  let createStatus = requestedCreateStatus
  let createReviewRequired = false
  let createReviewBrandId = ''
  let createReviewBrandName = ''
  if (isVendor && !isAdmin && requestedCreateStatus === 'publish') {
    const reviewGate = await resolveVendorReviewGate(db, user.id, user)
    if (reviewGate.enabled) {
      createStatus = 'draft'
      createReviewRequired = true
      createReviewBrandId = reviewGate.brandId
      createReviewBrandName = reviewGate.brandName
    }
  }

  const { data, error } = await db
    .from(PRODUCT_TABLE)
    .insert({
      name: parsed.data.name,
      slug,
      short_description: parsed.data.short_description || null,
      description: parsed.data.description || null,
      price: parsed.data.price,
      discount_price: parsed.data.discount_price || null,
      sku: sku,
      sku_auto_generated: skuAutoGenerated,
      stock_quantity: parsed.data.stock_quantity ?? 0,
      status: createStatus,
      product_type:
        parsed.data.product_type ||
        (Array.isArray(parsed.data.variations) && parsed.data.variations.length ? 'variable' : 'simple'),
      condition_check: parsed.data.condition_check,
      packaging_style: parsed.data.packaging_style,
      return_policy: parsed.data.return_policy,
      main_image_id: parsed.data.main_image_id || null,
      created_by: user.id,
    })
    .select('id, name, slug, short_description, description, price, discount_price, sku, sku_auto_generated, stock_quantity, status, product_type, condition_check, packaging_style, return_policy, main_image_id, created_at, updated_at')
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
    if (errorCode === '42703') {
      return jsonError(buildMissingOwnerColumnMessage(), 500)
    }
    return jsonError('Unable to create product.', 500)
  }

  try {
    await updateLinks(db, CATEGORY_LINKS, 'category_id', data.id, requestedCategoryIds)
    await updateLinks(db, TAG_LINKS, 'tag_id', data.id, parsed.data.tag_ids || [])
    await updateLinks(db, BRAND_LINKS, 'brand_id', data.id, finalBrandIds)
    await syncPendingCategoryRequestLinks(db, data.id, pendingCategoryRequestIds)
    const { resolvedImageIds, idMap } = await updateImages(
      db,
      data.id,
      parsed.data.image_ids || [],
      user.id,
    )
    const mappedMainImageId = parsed.data.main_image_id
      ? idMap.get(parsed.data.main_image_id) || parsed.data.main_image_id
      : null
    const fallbackMainImageId = resolvedImageIds[0] || null
    const nextMainImageId = mappedMainImageId || fallbackMainImageId
    if (nextMainImageId && nextMainImageId !== data.main_image_id) {
      const { error: mainImageError } = await db
        .from(PRODUCT_TABLE)
        .update({ main_image_id: nextMainImageId })
        .eq('id', data.id)
      if (mainImageError) {
        console.error('product main image update failed:', mainImageError.message)
      } else {
        data.main_image_id = nextMainImageId
      }
    }
    await updateVariations(db, data.id, parsed.data.variations || [])
  } catch (linkError) {
    console.error('product links failed:', linkError)
    return jsonError('Unable to attach product relationships.', 500)
  }

  const [item] = await attachRelations(db, [data])
  if (createReviewRequired) {
    await notifyAllAdmins(db, {
      title: 'Product review required',
      message: `${createReviewBrandName || 'A vendor'} submitted "${String(item?.name || data?.name || 'Product')}" for review before publishing.`,
      type: 'product_review_required',
      severity: 'warning',
      entityType: 'product',
      entityId: String(data?.id || ''),
      metadata: {
        product_id: String(data?.id || ''),
        product_name: String(item?.name || data?.name || ''),
        vendor_user_id: user.id,
        brand_id: createReviewBrandId,
        brand_name: createReviewBrandName,
        requested_status: requestedCreateStatus,
        final_status: createStatus,
      },
      createdBy: user.id,
    })
  }
  const response = jsonOk({ item })
  applyCookies(response)
  return response
}

export async function updateProduct(request: NextRequest, id: string) {
  const { applyCookies, canManageCatalog, isAdmin, isVendor, user } =
    await requireDashboardUser(request)

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }
  const db = createAdminSupabaseClient()

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    console.error('product update parse error:', error)
    return jsonError('Invalid payload.', 400)
  }

  const parsed = updateProductSchema.safeParse({ id, ...(payload as object) })
  if (!parsed.success) {
    return jsonOk(
      {
        error: 'Invalid product details.',
        validation: buildValidationErrorPayload(parsed.error),
      },
      400,
    )
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
  let validatedPendingCategoryRequestIds: string[] | null = null
  if (isVendor && user?.id) {
    const hasAccess = await canVendorAccessProduct(db, user.id, parsed.data.id, user)
    if (!hasAccess) {
      return jsonError('Product not found.', 404)
    }
  }
  if (updates.pending_category_request_ids !== undefined) {
    const pendingValidation = await validatePendingCategoryRequests(
      db,
      updates.pending_category_request_ids || [],
      user.id,
      isAdmin,
      isVendor,
    )
    if (pendingValidation.error) {
      return jsonError(pendingValidation.error, 400)
    }
    validatedPendingCategoryRequestIds = pendingValidation.ids
  }
  const existingProductQuery = db
    .from(PRODUCT_TABLE)
    .select('id, sku, sku_auto_generated')
    .eq('id', parsed.data.id)
  const { data: existingProduct, error: existingProductError } = await existingProductQuery.maybeSingle()
  if (existingProductError) {
    console.error('product current sku lookup failed:', existingProductError.message)
    const errorCode = (existingProductError as { code?: string })?.code
    if (errorCode === '42703') {
      return jsonError(buildMissingOwnerColumnMessage(), 500)
    }
    return jsonError('Unable to update product.', 500)
  }
  if (!existingProduct?.id) {
    return jsonError('Product not found.', 404)
  }

  const slug = updates.slug !== undefined ? buildSlug(updates.slug) : undefined

  let skuAutoGenerated = Boolean(existingProduct?.sku_auto_generated)
  let sku: string | null | undefined = undefined
  if (updates.sku !== undefined) {
    sku = updates.sku
      ? await ensureUniqueSku(db, updates.sku, parsed.data.id)
      : null
    skuAutoGenerated = false
  } else if (!existingProduct?.sku) {
    const categoryIds = await resolveCategoryIdsForSkuGeneration(
      db,
      parsed.data.id,
      updates.category_ids,
    )
    sku = await generateAutoSku(db, categoryIds)
    skuAutoGenerated = true
  }

  if (Array.isArray(updates.category_ids) && updates.category_ids.length === 0) {
    const nextPendingIds = validatedPendingCategoryRequestIds || []
    if (!nextPendingIds.length) {
      return jsonError('Select at least one category or request a new category.', 400)
    }
  }

  if (updates.status === 'publish') {
    let nextCategoryCount = 0
    if (Array.isArray(updates.category_ids)) {
      nextCategoryCount = updates.category_ids.length
    } else {
      const { data: existingCategories, error: existingCategoriesError } = await db
        .from(CATEGORY_LINKS)
        .select('category_id')
        .eq('product_id', parsed.data.id)
      if (existingCategoriesError) {
        console.error('product update existing categories lookup failed:', existingCategoriesError.message)
        return jsonError('Unable to validate product categories.', 500)
      }
      nextCategoryCount = Array.isArray(existingCategories) ? existingCategories.length : 0
    }

    let nextPendingCount = 0
    if (validatedPendingCategoryRequestIds !== null) {
      nextPendingCount = validatedPendingCategoryRequestIds.length
    } else {
      const { data: existingPending, error: existingPendingError } = await db
        .from(PRODUCT_PENDING_CATEGORY_LINKS)
        .select('id')
        .eq('product_id', parsed.data.id)
      if (existingPendingError) {
        console.error('product update existing pending category requests lookup failed:', existingPendingError.message)
        return jsonError('Unable to validate pending category requests.', 500)
      }
      nextPendingCount = Array.isArray(existingPending) ? existingPending.length : 0
    }

    if (!nextCategoryCount && nextPendingCount) {
      return jsonError('Cannot publish while category request is pending approval.', 400)
    }
    if (!nextCategoryCount && !nextPendingCount) {
      return jsonError('Select at least one category before publishing.', 400)
    }
  }
  let nextUpdateStatus = updates.status
  let updateReviewRequired = false
  let updateReviewBrandId = ''
  let updateReviewBrandName = ''
  if (isVendor && !isAdmin && updates.status === 'publish') {
    const reviewGate = await resolveVendorReviewGate(db, user.id, user)
    if (reviewGate.enabled) {
      nextUpdateStatus = 'draft'
      updateReviewRequired = true
      updateReviewBrandId = reviewGate.brandId
      updateReviewBrandName = reviewGate.brandName
    }
  }
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (updates.name !== undefined) {
    updatePayload.name = updates.name
  }
  if (updates.short_description !== undefined) {
    updatePayload.short_description = updates.short_description ?? null
  }
  if (updates.description !== undefined) {
    updatePayload.description = updates.description ?? null
  }
  if (updates.price !== undefined) {
    updatePayload.price = updates.price
  }
  if (updates.discount_price !== undefined) {
    updatePayload.discount_price = updates.discount_price ?? null
  }
  if (updates.stock_quantity !== undefined) {
    updatePayload.stock_quantity = updates.stock_quantity
  }
  if (nextUpdateStatus !== undefined) {
    updatePayload.status = nextUpdateStatus
  }
  if (updates.product_type !== undefined) {
    updatePayload.product_type = updates.product_type
  }
  if (updates.main_image_id !== undefined) {
    updatePayload.main_image_id = updates.main_image_id ?? null
  }
  if (updates.slug !== undefined) {
    updatePayload.slug = slug
  }
  if (updates.condition_check !== undefined) {
    updatePayload.condition_check = updates.condition_check
  }
  if (updates.packaging_style !== undefined) {
    updatePayload.packaging_style = updates.packaging_style
  }
  if (updates.return_policy !== undefined) {
    updatePayload.return_policy = updates.return_policy
  }
  if (updates.sku !== undefined) {
    updatePayload.sku = sku
    updatePayload.sku_auto_generated = skuAutoGenerated
  } else if (!existingProduct?.sku) {
    updatePayload.sku = sku
    updatePayload.sku_auto_generated = skuAutoGenerated
  }

  const updateQuery = db
    .from(PRODUCT_TABLE)
    .update(updatePayload)
    .eq('id', parsed.data.id)
  const { data, error } = await updateQuery
    .select('id, name, slug, short_description, description, price, discount_price, sku, sku_auto_generated, stock_quantity, status, product_type, condition_check, packaging_style, return_policy, main_image_id, created_at, updated_at')
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
    if (errorCode === '42703') {
      return jsonError(buildMissingOwnerColumnMessage(), 500)
    }
    return jsonError('Unable to update product.', 500)
  }

  try {
    let scopedBrandIds = updates.brand_ids
    if (isVendor && Array.isArray(updates.brand_ids)) {
      const vendorBrandIds = await resolveVendorBrandIds(db, user.id, user)
      scopedBrandIds = filterBrandIdsForVendor(updates.brand_ids, vendorBrandIds)
    }
    if (Array.isArray(updates.category_ids)) {
      await updateLinks(db, CATEGORY_LINKS, 'category_id', data.id, updates.category_ids)
    }
    if (Array.isArray(updates.tag_ids)) {
      await updateLinks(db, TAG_LINKS, 'tag_id', data.id, updates.tag_ids)
    }
    if (Array.isArray(scopedBrandIds)) {
      await updateLinks(db, BRAND_LINKS, 'brand_id', data.id, scopedBrandIds)
    }
    if (validatedPendingCategoryRequestIds !== null) {
      await syncPendingCategoryRequestLinks(db, data.id, validatedPendingCategoryRequestIds)
    }
    if (Array.isArray(updates.image_ids)) {
      const { idMap } = await updateImages(db, data.id, updates.image_ids, user.id)
      if (updates.main_image_id !== undefined) {
        const mappedMainImageId = updates.main_image_id
          ? idMap.get(updates.main_image_id) || updates.main_image_id
          : null
        if (mappedMainImageId !== updates.main_image_id) {
          const { error: mainImageError } = await db
            .from(PRODUCT_TABLE)
            .update({ main_image_id: mappedMainImageId })
            .eq('id', data.id)
          if (!mainImageError) {
            data.main_image_id = mappedMainImageId
          }
        }
      }
    }
    if (Array.isArray(updates.variations)) {
      await updateVariations(db, data.id, updates.variations)
    }
  } catch (linkError) {
    console.error('product update links failed:', linkError)
    return jsonError('Unable to update product relationships.', 500)
  }

  const [item] = await attachRelations(db, [data])
  if (updateReviewRequired) {
    await notifyAllAdmins(db, {
      title: 'Product update review required',
      message: `${updateReviewBrandName || 'A vendor'} requested publish for "${String(item?.name || data?.name || 'Product')}" and it is pending admin review.`,
      type: 'product_review_required',
      severity: 'warning',
      entityType: 'product',
      entityId: String(data?.id || ''),
      metadata: {
        product_id: String(data?.id || ''),
        product_name: String(item?.name || data?.name || ''),
        vendor_user_id: user.id,
        brand_id: updateReviewBrandId,
        brand_name: updateReviewBrandName,
        requested_status: updates.status,
        final_status: nextUpdateStatus,
      },
      createdBy: user.id,
    })
  }
  const response = jsonOk({ item })
  applyCookies(response)
  return response
}

export async function deleteProduct(request: NextRequest, id: string) {
  const { applyCookies, canManageCatalog, isVendor, user } =
    await requireDashboardUser(request)

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }
  const db = createAdminSupabaseClient()

  const parsed = productIdSchema.safeParse({ id })
  if (!parsed.success) {
    return jsonError('Invalid product id.', 400)
  }
  if (isVendor && user?.id) {
    const hasAccess = await canVendorAccessProduct(db, user.id, parsed.data.id, user)
    if (!hasAccess) {
      return jsonError('Product not found.', 404)
    }
  }

  const { error } = await db.from(PRODUCT_TABLE).delete().eq('id', parsed.data.id)
  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('product delete failed:', error.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    if (errorCode === '42703') {
      return jsonError(buildMissingOwnerColumnMessage(), 500)
    }
    return jsonError('Unable to delete product.', 500)
  }

  const response = jsonOk({ deleted: true })
  applyCookies(response)
  return response
}
