import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(30),
})

const deleteQuerySchema = z.object({
  review_id: z.string().trim().min(1).max(120),
})

const MISSING_TABLE_CODE = '42P01'
const MISSING_COLUMN_CODE = '42703'
const MISSING_TABLE_SCHEMA_CACHE_CODE = 'PGRST205'
const MISSING_COLUMN_SCHEMA_CACHE_CODE = 'PGRST204'

const isSafeMissingSchemaError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  [
    MISSING_TABLE_CODE,
    MISSING_COLUMN_CODE,
    MISSING_TABLE_SCHEMA_CACHE_CODE,
    MISSING_COLUMN_SCHEMA_CACHE_CODE,
  ].includes(String((error as { code?: string }).code || ''))

const buildEmptyPayload = (page: number, perPage: number) => ({
  items: [],
  pagination: {
    page,
    per_page: perPage,
    total: 0,
    total_pages: 0,
  },
})

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parsed.success) return jsonError('Invalid query.', 400)

  const { page, per_page: perPage } = parsed.data
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData?.user) {
    return jsonError('You must be signed in.', 401)
  }

  const userId = String(authData.user.id || '').trim()
  const userEmail = String(authData.user.email || '').trim().toLowerCase()
  if (!userId) return jsonError('You must be signed in.', 401)

  const db = createAdminSupabaseClient()

  const [userIdReviewsRes, emailReviewsRes] = await Promise.all([
    db
      .from('product_reviews')
      .select(
        'id, product_id, reviewer_user_id, reviewer_name, reviewer_email, reviewer_avatar_url, rating, content, status, review_image_urls, review_video_urls, created_at',
      )
      .eq('reviewer_user_id', userId)
      .order('created_at', { ascending: false }),
    userEmail
      ? db
          .from('product_reviews')
          .select(
            'id, product_id, reviewer_user_id, reviewer_name, reviewer_email, reviewer_avatar_url, rating, content, status, review_image_urls, review_video_urls, created_at',
          )
          .is('reviewer_user_id', null)
          .eq('reviewer_email', userEmail)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null } as any),
  ])

  if (userIdReviewsRes.error) {
    if (isSafeMissingSchemaError(userIdReviewsRes.error)) {
      const response = jsonOk(buildEmptyPayload(page, perPage))
      applyCookies(response)
      return response
    }
    console.error('user reviews fetch by user id failed:', userIdReviewsRes.error.message)
    return jsonError('Unable to load reviews.', 500)
  }
  if (emailReviewsRes.error) {
    if (isSafeMissingSchemaError(emailReviewsRes.error)) {
      const response = jsonOk(buildEmptyPayload(page, perPage))
      applyCookies(response)
      return response
    }
    console.error('user reviews fetch by email failed:', emailReviewsRes.error.message)
    return jsonError('Unable to load reviews.', 500)
  }

  const allRows = [
    ...(Array.isArray(userIdReviewsRes.data) ? userIdReviewsRes.data : []),
    ...(Array.isArray(emailReviewsRes.data) ? emailReviewsRes.data : []),
  ]

  const uniqueRows = Array.from(
    new Map(
      allRows
        .filter((row: any) => row?.id)
        .map((row: any) => [String(row.id), row]),
    ).values(),
  )

  uniqueRows.sort((a: any, b: any) => {
    const aTs = new Date(a?.created_at || '').getTime()
    const bTs = new Date(b?.created_at || '').getTime()
    return (Number.isNaN(bTs) ? 0 : bTs) - (Number.isNaN(aTs) ? 0 : aTs)
  })

  const total = uniqueRows.length
  const pagedRows = uniqueRows.slice(from, to + 1)
  const totalPages = total > 0 ? Math.ceil(total / perPage) : 0

  const productIds = Array.from(
    new Set(pagedRows.map((row: any) => String(row?.product_id || '').trim()).filter(Boolean)),
  )

  const [productsRes, imageRes, orderItemsRes] = await Promise.all([
    productIds.length
      ? db
          .from('products')
          .select('id, name, slug, image_url')
          .in('id', productIds)
      : Promise.resolve({ data: [], error: null } as any),
    productIds.length
      ? db
          .from('product_images')
          .select('product_id, url, sort_order')
          .in('product_id', productIds)
          .order('sort_order', { ascending: true })
      : Promise.resolve({ data: [], error: null } as any),
    productIds.length
      ? db
          .from('checkout_order_items')
          .select('product_id, name, image, created_at')
          .in('product_id', productIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null } as any),
  ])

  if (productsRes.error && !isSafeMissingSchemaError(productsRes.error)) {
    console.error('user reviews products fetch failed:', productsRes.error.message)
    return jsonError('Unable to load reviews.', 500)
  }
  if (imageRes.error && !isSafeMissingSchemaError(imageRes.error)) {
    console.error('user reviews images fetch failed:', imageRes.error.message)
    return jsonError('Unable to load reviews.', 500)
  }
  if (orderItemsRes.error && !isSafeMissingSchemaError(orderItemsRes.error)) {
    console.error('user reviews order items fetch failed:', orderItemsRes.error.message)
    return jsonError('Unable to load reviews.', 500)
  }
  const productById = new Map<string, any>()
  ;(Array.isArray(productsRes.data) ? productsRes.data : []).forEach((item: any) => {
    const key = String(item?.id || '')
    if (!key) return
    productById.set(key, item)
  })

  const missingProductIds = productIds.filter((id) => !productById.has(id))
  if (missingProductIds.length) {
    const { data: fallbackProducts, error: fallbackProductsError } = await db
      .from('admin_products')
      .select('id, name, slug')
      .in('id', missingProductIds)

    if (fallbackProductsError && !isSafeMissingSchemaError(fallbackProductsError)) {
      console.error('user reviews admin_products fallback failed:', fallbackProductsError.message)
      return jsonError('Unable to load reviews.', 500)
    }

    ;(Array.isArray(fallbackProducts) ? fallbackProducts : []).forEach((item: any) => {
      const key = String(item?.id || '')
      if (!key) return
      productById.set(key, item)
    })
  }

  const imageByProductId = new Map<string, string>()
  ;(Array.isArray(imageRes.data) ? imageRes.data : []).forEach((item: any) => {
    const key = String(item?.product_id || '')
    const url = String(item?.url || '').trim()
    if (!key || !url || imageByProductId.has(key)) return
    imageByProductId.set(key, url)
  })

  const orderItemByProductId = new Map<string, { name: string; image: string }>()
  ;(Array.isArray(orderItemsRes.data) ? orderItemsRes.data : []).forEach((item: any) => {
    const key = String(item?.product_id || '').trim()
    if (!key || orderItemByProductId.has(key)) return
    orderItemByProductId.set(key, {
      name: String(item?.name || '').trim(),
      image: String(item?.image || '').trim(),
    })
  })

  const items = pagedRows.map((row: any) => {
    const productId = String(row?.product_id || '').trim()
    const product = productById.get(productId) || null
    const orderSnapshot = orderItemByProductId.get(productId)
    const orderSnapshotName = String(orderSnapshot?.name || '').trim()
    const orderSnapshotImage = String(orderSnapshot?.image || '').trim()
    return {
      id: String(row?.id || ''),
      product_id: productId,
      rating: Number(row?.rating) || 0,
      content: String(row?.content || ''),
      status: String(row?.status || 'published'),
      created_at: row?.created_at || null,
      reviewer_name: String(row?.reviewer_name || ''),
      reviewer_avatar_url: String(row?.reviewer_avatar_url || ''),
      review_image_urls: Array.isArray(row?.review_image_urls)
        ? row.review_image_urls.map((url: any) => String(url || '').trim()).filter(Boolean)
        : [],
      review_video_urls: Array.isArray(row?.review_video_urls)
        ? row.review_video_urls.map((url: any) => String(url || '').trim()).filter(Boolean)
        : [],
      product: product || productId
        ? {
            id: String(product?.id || productId || ''),
            name:
              String(product?.name || '').trim() ||
              orderSnapshotName ||
              'Unavailable product',
            slug: String(product?.slug || '').trim(),
            image_url:
              imageByProductId.get(String(product?.id || productId || '')) ||
              String(product?.image_url || '').trim() ||
              orderSnapshotImage ||
              '',
          }
        : null,
    }
  })

  const response = jsonOk({
    items,
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: totalPages,
    },
  })
  applyCookies(response)
  return response
}

export async function DELETE(request: NextRequest) {
  const parsed = deleteQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parsed.success) return jsonError('Invalid review id.', 400)

  const reviewId = String(parsed.data.review_id || '').trim()
  if (!reviewId) return jsonError('Invalid review id.', 400)

  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData?.user) {
    return jsonError('You must be signed in.', 401)
  }

  const userId = String(authData.user.id || '').trim()
  const userEmail = String(authData.user.email || '').trim().toLowerCase()
  if (!userId) return jsonError('You must be signed in.', 401)

  const db = createAdminSupabaseClient()
  const { data: reviewRow, error: reviewError } = await db
    .from('product_reviews')
    .select('id, reviewer_user_id, reviewer_email')
    .eq('id', reviewId)
    .maybeSingle()

  if (reviewError) {
    if (isSafeMissingSchemaError(reviewError)) {
      return jsonError('Review not found.', 404)
    }
    console.error('user review ownership check failed:', reviewError.message)
    return jsonError('Unable to delete review.', 500)
  }

  if (!reviewRow?.id) {
    return jsonError('Review not found.', 404)
  }

  const reviewOwnerUserId = String(reviewRow?.reviewer_user_id || '').trim()
  const reviewOwnerEmail = String(reviewRow?.reviewer_email || '').trim().toLowerCase()
  const isOwnedByUserId = Boolean(reviewOwnerUserId) && reviewOwnerUserId === userId
  const isLegacyOwnedByEmail =
    !reviewOwnerUserId && Boolean(userEmail) && Boolean(reviewOwnerEmail) && reviewOwnerEmail === userEmail
  if (!isOwnedByUserId && !isLegacyOwnedByEmail) {
    return jsonError('You cannot delete this review.', 403)
  }

  const { error: deleteError } = await db
    .from('product_reviews')
    .delete()
    .eq('id', reviewId)

  if (deleteError) {
    if (isSafeMissingSchemaError(deleteError)) {
      return jsonError('Review not found.', 404)
    }
    console.error('user review delete failed:', deleteError.message)
    return jsonError('Unable to delete review.', 500)
  }

  const response = jsonOk({
    ok: true,
    review_id: reviewId,
  })
  applyCookies(response)
  return response
}
