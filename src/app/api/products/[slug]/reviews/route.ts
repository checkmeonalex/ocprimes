import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
  buildObjectKey,
  uploadToR2,
} from '@/lib/storage/r2'
import { evaluateReviewContentForModeration } from '@/lib/moderation/reviews'
import { createNotifications, notifyAllAdmins } from '@/lib/admin/notifications'

const querySchema = z.object({
  per_page: z.coerce.number().int().min(1).max(120).default(40),
})
const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  content: z.string().trim().max(1200),
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
  ].includes(
    String((error as { code?: string }).code || ''),
  )

const emptyPayload = {
  summary: {
    rating: 0,
    totalReviews: 0,
    wouldRecommendPercent: 0,
    wouldRecommendCount: 0,
    verifiedBy: 'OCPRIMES',
  },
  breakdown: [
    { stars: 5, count: 0 },
    { stars: 4, count: 0 },
    { stars: 3, count: 0 },
    { stars: 2, count: 0 },
    { stars: 1, count: 0 },
  ],
  reviews: [],
}

const parseDateValue = (value: string | null | undefined) => {
  const timestamp = new Date(value || '').getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

const slugifyProductName = (value: string) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const readSlug = async (context: { params: Promise<{ slug: string }> }) => {
  const params = await context.params
  return String(params?.slug || '').trim()
}

const resolveProductBySlug = async (supabase: any, slug: string) => {
  const byProductsTable = await supabase
    .from('products')
    .select('id, name')
    .eq('slug', slug)
    .maybeSingle()

  if (byProductsTable.error && !isSafeMissingSchemaError(byProductsTable.error)) {
    return { error: byProductsTable.error, data: null }
  }
  if (byProductsTable.data?.id) {
    return { error: null, data: byProductsTable.data }
  }

  const byAdminProductsTable = await supabase
    .from('admin_products')
    .select('id, name')
    .eq('slug', slug)
    .maybeSingle()

  if (byAdminProductsTable.error && !isSafeMissingSchemaError(byAdminProductsTable.error)) {
    return { error: byAdminProductsTable.error, data: null }
  }

  return { error: null, data: byAdminProductsTable.data || null }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const slug = await readSlug(context)
  if (!slug) {
    return jsonError('Invalid product slug.', 400)
  }

  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parsed.success) {
    return jsonError('Invalid query.', 400)
  }

  const { per_page } = parsed.data
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)

  const productLookup = await resolveProductBySlug(supabase, slug)
  if (productLookup.error) {
    console.error('public product reviews product lookup failed:', productLookup.error.message)
    return jsonError('Unable to load reviews.', 500)
  }
  const productId = String(productLookup.data?.id || '')
  const productName = String(productLookup.data?.name || '')

  if (!productId) {
    const response = jsonOk(emptyPayload)
    applyCookies(response)
    return response
  }

  const { data: brandLinks, error: brandLinksError } = await supabase
    .from('product_brand_links')
    .select('brand_id')
    .eq('product_id', productId)

  if (brandLinksError && !isSafeMissingSchemaError(brandLinksError)) {
    console.error('public product reviews brand lookup failed:', brandLinksError.message)
    return jsonError('Unable to load reviews.', 500)
  }

  const brandIds = Array.isArray(brandLinks)
    ? Array.from(
        new Set(
          brandLinks
            .map((row: any) => String(row?.brand_id || ''))
            .filter(Boolean),
        ),
      )
    : []

  let vendorProductIds = [productId]
  if (brandIds.length) {
    const { data: vendorLinks, error: vendorLinksError } = await supabase
      .from('product_brand_links')
      .select('product_id')
      .in('brand_id', brandIds)

    if (vendorLinksError && !isSafeMissingSchemaError(vendorLinksError)) {
      console.error('public product reviews vendor products lookup failed:', vendorLinksError.message)
      return jsonError('Unable to load reviews.', 500)
    }

    vendorProductIds = Array.isArray(vendorLinks)
      ? Array.from(
          new Set(
            vendorLinks
              .map((row: any) => String(row?.product_id || ''))
              .filter(Boolean),
          ),
        )
      : [productId]
  }

  if (!vendorProductIds.length) vendorProductIds = [productId]

  const { data: reviewRows, error: reviewsError } = await supabase
    .from('product_reviews')
    .select(
      'id, product_id, reviewer_name, reviewer_avatar_url, rating, content, review_image_urls, review_video_urls, is_verified_purchase, created_at, status',
    )
    .in('product_id', vendorProductIds)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(per_page)

  if (reviewsError) {
    if (isSafeMissingSchemaError(reviewsError)) {
      const response = jsonOk(emptyPayload)
      applyCookies(response)
      return response
    }
    console.error('public product reviews list failed:', reviewsError.message)
    return jsonError('Unable to load reviews.', 500)
  }

  const rows = Array.isArray(reviewRows) ? reviewRows : []
  if (!rows.length) {
    const response = jsonOk(emptyPayload)
    applyCookies(response)
    return response
  }

  const uniqueProductIds = Array.from(
    new Set(
      rows
        .map((row: any) => String(row?.product_id || ''))
        .filter(Boolean),
    ),
  )

  const adminDb = createAdminSupabaseClient()

  const [productsRes, imagesRes] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, slug, image_url')
      .in('id', uniqueProductIds),
    adminDb
      .from('product_images')
      .select('product_id, url, sort_order')
      .in('product_id', uniqueProductIds)
      .order('sort_order', { ascending: true }),
  ])

  if (productsRes.error && !isSafeMissingSchemaError(productsRes.error)) {
    console.error('public product reviews products metadata failed:', productsRes.error.message)
    return jsonError('Unable to load reviews.', 500)
  }
  if (imagesRes.error && !isSafeMissingSchemaError(imagesRes.error)) {
    console.error('public product reviews product images failed:', imagesRes.error.message)
    return jsonError('Unable to load reviews.', 500)
  }

  const productById = new Map<string, any>()
  ;(Array.isArray(productsRes.data) ? productsRes.data : []).forEach((item: any) => {
    const key = String(item?.id || '')
    if (!key) return
    productById.set(key, item)
  })

  const missingProductIds = uniqueProductIds.filter((id) => !productById.has(id))
  if (missingProductIds.length) {
    const { data: adminProducts, error: adminProductsError } = await adminDb
      .from('admin_products')
      .select('id, name, slug')
      .in('id', missingProductIds)

    if (adminProductsError && !isSafeMissingSchemaError(adminProductsError)) {
      console.error('public product reviews admin products metadata failed:', adminProductsError.message)
      return jsonError('Unable to load reviews.', 500)
    }

    ;(Array.isArray(adminProducts) ? adminProducts : []).forEach((item: any) => {
      const key = String(item?.id || '')
      if (!key) return
      productById.set(key, item)
    })
  }
  const imageByProductId = new Map<string, string>()
  ;(Array.isArray(imagesRes.data) ? imagesRes.data : []).forEach((item: any) => {
    const key = String(item?.product_id || '')
    const url = String(item?.url || '').trim()
    if (!key || !url || imageByProductId.has(key)) return
    imageByProductId.set(key, url)
  })

  const sortedRows = [...rows].sort((a: any, b: any) => {
    const aIsCurrent = String(a?.product_id || '') === productId
    const bIsCurrent = String(b?.product_id || '') === productId
    if (aIsCurrent !== bIsCurrent) return aIsCurrent ? -1 : 1
    return parseDateValue(b?.created_at) - parseDateValue(a?.created_at)
  })

  const ratingCounts = new Map<number, number>([
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [5, 0],
  ])
  let ratingTotal = 0
  let recommendationScoreTotal = 0

  const reviews = sortedRows.map((row: any) => {
    const rating = Math.max(1, Math.min(5, Number(row?.rating) || 0))
    ratingTotal += rating
    recommendationScoreTotal += (rating - 1) / 4
    ratingCounts.set(rating, (ratingCounts.get(rating) || 0) + 1)

    const reviewProductId = String(row?.product_id || '')
    const linkedProduct = productById.get(reviewProductId)

    return {
      id: String(row?.id || ''),
      name: String(row?.reviewer_name || 'Anonymous'),
      avatarUrl: String(row?.reviewer_avatar_url || ''),
      createdAt: row?.created_at || null,
      rating,
      body: String(row?.content || ''),
      helpful: 0,
      unhelpful: 0,
      isVerifiedBuyer: Boolean(row?.is_verified_purchase),
      media: [
        ...(Array.isArray(row?.review_image_urls)
          ? row.review_image_urls
              .map((url: any) => String(url || '').trim())
              .filter(Boolean)
              .map((url: string) => ({ type: 'image', url }))
          : []),
        ...(Array.isArray(row?.review_video_urls)
          ? row.review_video_urls
              .map((url: any) => String(url || '').trim())
              .filter(Boolean)
              .map((url: string) => ({ type: 'video', url }))
          : []),
      ],
      product: {
        id: reviewProductId,
        name: String(linkedProduct?.name || (reviewProductId === productId ? productName : '')),
        slug:
          String(linkedProduct?.slug || '').trim() ||
          slugifyProductName(String(linkedProduct?.name || '')),
        image_url:
          String(linkedProduct?.image_url || '').trim() ||
          imageByProductId.get(reviewProductId) ||
          '',
        isCurrentProduct: reviewProductId === productId,
      },
    }
  })

  const totalReviews = reviews.length
  const rating = totalReviews ? Number((ratingTotal / totalReviews).toFixed(1)) : 0
  const wouldRecommendPercent = totalReviews
    ? Math.round((recommendationScoreTotal / totalReviews) * 100)
    : 0
  const wouldRecommendCount = totalReviews
    ? Math.round((wouldRecommendPercent / 100) * totalReviews)
    : 0

  const response = jsonOk({
    summary: {
      rating,
      totalReviews,
      wouldRecommendPercent,
      wouldRecommendCount,
      verifiedBy: 'OCPRIMES',
    },
    breakdown: [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: ratingCounts.get(stars) || 0,
    })),
    reviews,
  })
  applyCookies(response)
  return response
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const slug = await readSlug(context)
  if (!slug) return jsonError('Invalid product slug.', 400)

  const { supabase } = createRouteHandlerSupabaseClient(request)
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData?.user) {
    return jsonError('You must be signed in to review.', 401)
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return jsonError('Invalid form data.', 400)
  }

  const parsed = createReviewSchema.safeParse({
    rating: formData.get('rating'),
    content: formData.get('content'),
  })
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || 'Invalid review details.', 400)
  }

  const db = createAdminSupabaseClient()
  const productLookup = await resolveProductBySlug(db, slug)
  if (productLookup.error) {
    console.error('public create review product lookup failed:', productLookup.error.message)
    return jsonError('Unable to submit review.', 500)
  }
  const productId = String(productLookup.data?.id || '')
  if (!productId) {
    return jsonError('Product not found.', 404)
  }

  const payload = parsed.data
  const user = authData.user
  const rawName = String(user?.user_metadata?.full_name || '').trim()
  const email = String(user?.email || '').trim()
  const fallbackName = email.includes('@') ? email.split('@')[0] : 'User'
  const reviewerName = rawName || fallbackName || 'User'
  const fileEntries = formData.getAll('files')
  const files = fileEntries.filter((entry): entry is File => entry instanceof File)
  if (files.length > 6) {
    return jsonError('You can upload up to 6 files.', 400)
  }

  const imageUrls: string[] = []
  const videoUrls: string[] = []
  for (const file of files) {
    const type = String(file.type || '').toLowerCase()
    const isImage = ALLOWED_IMAGE_TYPES.has(type)
    const isVideo = ALLOWED_VIDEO_TYPES.has(type)
    if (!isImage && !isVideo) {
      return jsonError('Unsupported media type.', 415)
    }
    if (isImage && file.size > MAX_UPLOAD_BYTES) {
      return jsonError('Image file too large.', 413)
    }
    if (isVideo && file.size > MAX_VIDEO_UPLOAD_BYTES) {
      return jsonError('Video file too large.', 413)
    }
    const prefix = `reviews/${user.id}/${productId}`
    const key = buildObjectKey(file, prefix)
    let uploaded
    try {
      uploaded = await uploadToR2(file, key)
    } catch (uploadError) {
      console.error('review media upload failed:', uploadError)
      return jsonError('Unable to upload review media.', 500)
    }
    if (isImage) imageUrls.push(uploaded.url)
    if (isVideo) videoUrls.push(uploaded.url)
  }

  const insertPayload = {
    product_id: productId,
    reviewer_user_id: user.id,
    reviewer_name: reviewerName,
    reviewer_email: email || null,
    reviewer_avatar_url: String(user?.user_metadata?.avatar_url || '').trim() || null,
    rating: payload.rating,
    content: payload.content,
    review_image_urls: imageUrls,
    review_video_urls: videoUrls,
    is_verified_purchase: false,
    status: evaluateReviewContentForModeration(payload.content).requiresModeration
      ? 'pending'
      : 'published',
  }

  const { data, error } = await db
    .from('product_reviews')
    .insert(insertPayload)
    .select('id, created_at, status')
    .single()

  if (error) {
    if (isSafeMissingSchemaError(error)) {
      return jsonError('Reviews are not available yet.', 503)
    }
    console.error('public create review failed:', error.message)
    return jsonError('Unable to submit review.', 500)
  }

  const moderationStatus = String(data?.status || 'published')
  const productNameForNotice = String(productLookup.data?.name || '').trim() || 'Product'
  const actionUrl = '/backend/admin/reviews'

  const notificationDb = createAdminSupabaseClient()
  const { data: brandLinks, error: brandLinkError } = await notificationDb
    .from('product_brand_links')
    .select('brand_id')
    .eq('product_id', productId)
  if (brandLinkError && !isSafeMissingSchemaError(brandLinkError)) {
    console.error('review notification brand links lookup failed:', brandLinkError.message)
  } else {
    const brandIds = Array.isArray(brandLinks)
      ? Array.from(
          new Set(
            brandLinks
              .map((row: any) => String(row?.brand_id || ''))
              .filter(Boolean),
          ),
        )
      : []
    if (brandIds.length) {
      const { data: brandRows, error: brandRowsError } = await notificationDb
        .from('admin_brands')
        .select('id, name, created_by')
        .in('id', brandIds)
      if (brandRowsError && !isSafeMissingSchemaError(brandRowsError)) {
        console.error('review notification brand owners lookup failed:', brandRowsError.message)
      } else {
        const vendorPayloads = (Array.isArray(brandRows) ? brandRows : [])
          .map((brand: any) => ({
            brandName: String(brand?.name || '').trim() || 'Brand',
            ownerId: String(brand?.created_by || '').trim(),
          }))
          .filter((item) => item.ownerId)

        await createNotifications(
          notificationDb,
          vendorPayloads.map((item) => ({
            recipient_user_id: item.ownerId,
            recipient_role: 'vendor',
            title: 'New product review',
            message: `A customer posted a review for "${productNameForNotice}" (brand: "${item.brandName}").`,
            type: 'review_created',
            severity: moderationStatus === 'pending' ? 'warning' : 'info',
            entity_type: 'product_review',
            entity_id: String(data?.id || ''),
            metadata: {
              review_id: String(data?.id || ''),
              product_id: productId,
              product_slug: slug,
              product_name: productNameForNotice,
              brand_name: item.brandName,
              review_status: moderationStatus,
              action_url: actionUrl,
            },
            created_by: user.id,
          })),
        )
      }
    }
  }

  if (moderationStatus === 'pending') {
    await notifyAllAdmins(notificationDb, {
      title: 'Review needs moderation',
      message: `A new review for "${productNameForNotice}" is pending approval.`,
      type: 'review_pending_moderation',
      severity: 'warning',
      entityType: 'product_review',
      entityId: String(data?.id || ''),
      metadata: {
        review_id: String(data?.id || ''),
        product_id: productId,
        product_slug: slug,
        product_name: productNameForNotice,
        action_url: actionUrl,
      },
      createdBy: user.id,
    })
  }

  return jsonOk({
    ok: true,
    requires_moderation: String(data?.status || '') === 'pending',
    message:
      String(data?.status || '') === 'pending'
        ? 'Thanks. Your review was submitted and is pending moderation.'
        : 'Review submitted successfully.',
    review: {
      id: String(data?.id || ''),
      created_at: data?.created_at || null,
      status: String(data?.status || 'published'),
    },
  })
}
