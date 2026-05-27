import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createNotifications } from '@/lib/admin/notifications'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().max(120).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  status: z.enum(['pending', 'published', 'hidden']).optional(),
})
const updateSchema = z.object({
  id: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  title: z.string().trim().max(120).nullable().optional(),
  content: z.string().trim().max(1200).optional(),
  status: z.enum(['pending', 'published', 'hidden']).optional(),
})
const deleteSchema = z.object({
  id: z.string().uuid(),
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

const buildEmptyPayload = () => ({
  items: [],
  pagination: { page: 1, per_page: 20, total: 0, total_pages: 0 },
  summary: { total: 0, average_rating: 0 },
  permissions: {
    can_edit_review_content: false,
    can_change_status: false,
    can_delete_review: false,
  },
})

const getStatusLabel = (status: string) => {
  if (status === 'published') return 'published'
  if (status === 'pending') return 'set to pending'
  if (status === 'hidden') return 'hidden'
  return status || 'updated'
}

const resolveProductSummary = async (db: any, productId: string) => {
  if (!productId) return { name: 'Product', slug: '' }

  const productRes = await db
    .from('products')
    .select('name, slug')
    .eq('id', productId)
    .maybeSingle()

  if (productRes.error && !isSafeMissingSchemaError(productRes.error)) {
    console.error('admin review notification product lookup failed:', productRes.error.message)
    return { name: 'Product', slug: '' }
  }
  if (productRes.data?.name || productRes.data?.slug) {
    return {
      name: String(productRes.data?.name || 'Product'),
      slug: String(productRes.data?.slug || ''),
    }
  }

  const adminProductRes = await db
    .from('admin_products')
    .select('name, slug')
    .eq('id', productId)
    .maybeSingle()

  if (adminProductRes.error && !isSafeMissingSchemaError(adminProductRes.error)) {
    console.error(
      'admin review notification admin_products lookup failed:',
      adminProductRes.error.message,
    )
    return { name: 'Product', slug: '' }
  }

  return {
    name: String(adminProductRes.data?.name || 'Product'),
    slug: String(adminProductRes.data?.slug || ''),
  }
}

const resolveVendorScopedProductIds = async (db: any, userId: string) => {
  const { data: brandRows, error: brandErr } = await db
    .from('admin_brands')
    .select('id')
    .eq('created_by', userId)

  if (brandErr) {
    return { error: brandErr, ids: [] as string[] }
  }

  const brandIds = Array.isArray(brandRows)
    ? brandRows.map((row: any) => String(row?.id || '')).filter(Boolean)
    : []
  if (!brandIds.length) {
    return { error: null, ids: [] as string[] }
  }

  const { data: productLinkRows, error: productLinkErr } = await db
    .from('product_brand_links')
    .select('product_id')
    .in('brand_id', brandIds)

  if (productLinkErr) {
    return { error: productLinkErr, ids: [] as string[] }
  }

  const ids = Array.isArray(productLinkRows)
    ? Array.from(
        new Set(
          productLinkRows
            .map((row: any) => String(row?.product_id || ''))
            .filter(Boolean),
        ),
      )
    : []

  return { error: null, ids }
}

export async function GET(request: NextRequest) {
  const { supabase, applyCookies, canManageCatalog, isAdmin, isVendor, user } =
    await requireDashboardUser(request)

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }

  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parsed.success) {
    return jsonError('Invalid query.', 400)
  }

  const { page, per_page, q, rating, status } = parsed.data
  const from = (page - 1) * per_page
  const to = from + per_page - 1

  const db = isAdmin ? supabase : createAdminSupabaseClient()

  let scopedProductIds: string[] | null = null
  if (isVendor) {
    const scoped = await resolveVendorScopedProductIds(db, user.id)
    if (scoped.error) {
      console.error('admin reviews vendor scope failed:', scoped.error.message)
      return jsonError('Unable to load reviews.', 500)
    }
    if (!scoped.ids.length) {
      const response = jsonOk(buildEmptyPayload())
      applyCookies(response)
      return response
    }
    scopedProductIds = scoped.ids
  }

  let listQuery = db
    .from('product_reviews')
    .select(
      'id, product_id, reviewer_name, reviewer_email, rating, title, content, is_verified_purchase, status, created_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })

  if (Array.isArray(scopedProductIds)) {
    listQuery = listQuery.in('product_id', scopedProductIds)
  }
  if (q) {
    const safe = q.replace(/[,%()]/g, ' ').trim()
    if (safe) {
      listQuery = listQuery.or(
        `reviewer_name.ilike.%${safe}%,title.ilike.%${safe}%,content.ilike.%${safe}%`,
      )
    }
  }
  if (rating) listQuery = listQuery.eq('rating', rating)
  if (status) listQuery = listQuery.eq('status', status)

  const { data: reviews, error: reviewsErr, count } = await listQuery.range(from, to)

  if (reviewsErr) {
    if (isSafeMissingSchemaError(reviewsErr)) {
      const response = jsonOk(buildEmptyPayload())
      applyCookies(response)
      return response
    }
    console.error('admin reviews list failed:', reviewsErr.message)
    return jsonError('Unable to load reviews.', 500)
  }

  const rows = Array.isArray(reviews) ? reviews : []
  const productIds = Array.from(
    new Set(rows.map((row: any) => String(row?.product_id || '')).filter(Boolean)),
  )

  const [productsRes, imageRes] = await Promise.all([
    productIds.length
      ? db
          .from('products')
          .select('id, name, slug, price, discount_price, status')
          .in('id', productIds)
      : Promise.resolve({ data: [], error: null } as any),
    productIds.length
      ? db
          .from('product_images')
          .select('product_id, url, sort_order')
          .in('product_id', productIds)
          .order('sort_order', { ascending: true })
      : Promise.resolve({ data: [], error: null } as any),
  ])

  if (productsRes.error && !isSafeMissingSchemaError(productsRes.error)) {
    console.error('admin reviews product fetch failed:', productsRes.error.message)
    return jsonError('Unable to load reviews.', 500)
  }
  if (imageRes.error) {
    console.error('admin reviews image fetch failed:', imageRes.error.message)
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
    const { data: adminProducts, error: adminProductsError } = await db
      .from('admin_products')
      .select('id, name, slug, price, discount_price, status')
      .in('id', missingProductIds)

    if (adminProductsError && !isSafeMissingSchemaError(adminProductsError)) {
      console.error('admin reviews admin_products fallback failed:', adminProductsError.message)
      return jsonError('Unable to load reviews.', 500)
    }

    ;(Array.isArray(adminProducts) ? adminProducts : []).forEach((item: any) => {
      const key = String(item?.id || '')
      if (!key) return
      productById.set(key, item)
    })
  }
  const imageByProductId = new Map<string, string>()
  ;(Array.isArray(imageRes.data) ? imageRes.data : []).forEach((item: any) => {
    const key = String(item?.product_id || '')
    if (!key || imageByProductId.has(key)) return
    imageByProductId.set(key, String(item?.url || '').trim())
  })

  const items = rows.map((review: any) => {
    const product = productById.get(String(review?.product_id || '')) || null
    return {
      id: review.id,
      reviewer_name: review.reviewer_name,
      reviewer_email: review.reviewer_email,
      rating: Number(review.rating) || 0,
      title: review.title || '',
      content: review.content || '',
      is_verified_purchase: Boolean(review.is_verified_purchase),
      status: review.status || 'published',
      created_at: review.created_at,
      product: product
        ? {
            id: product.id,
            name: product.name || 'Untitled product',
            slug: product.slug || '',
            status: product.status || 'draft',
            price: Number(product.discount_price) || Number(product.price) || 0,
            image_url: imageByProductId.get(String(product.id)) || '',
          }
        : null,
    }
  })

  const total = Number(count) || 0
  const totalPages = total > 0 ? Math.ceil(total / per_page) : 0
  const ratingValues = items.map((item) => Number(item.rating) || 0).filter((value) => value > 0)
  const averageRating = ratingValues.length
    ? Number((ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length).toFixed(2))
    : 0

  const response = jsonOk({
    items,
    pagination: {
      page,
      per_page,
      total,
      total_pages: totalPages,
    },
    summary: {
      total,
      average_rating: averageRating,
    },
    permissions: {
      can_edit_review_content: Boolean(isAdmin),
      can_change_status: Boolean(isAdmin || isVendor),
      can_delete_review: Boolean(isAdmin),
    },
  })
  applyCookies(response)
  return response
}

export async function PATCH(request: NextRequest) {
  const { supabase, applyCookies, canManageCatalog, isAdmin, isVendor, user } =
    await requireDashboardUser(request)

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }

  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid body.', 400)
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || 'Invalid review update payload.', 400)
  }

  const db = isAdmin ? supabase : createAdminSupabaseClient()
  const input = parsed.data

  const { data: reviewRow, error: reviewErr } = await db
    .from('product_reviews')
    .select('id, product_id, reviewer_user_id, status')
    .eq('id', input.id)
    .maybeSingle()

  if (reviewErr) {
    if (isSafeMissingSchemaError(reviewErr)) {
      return jsonError('Reviews are not available yet.', 503)
    }
    console.error('admin reviews update lookup failed:', reviewErr.message)
    return jsonError('Unable to update review.', 500)
  }

  if (!reviewRow?.id) {
    return jsonError('Review not found.', 404)
  }

  if (isVendor && !isAdmin) {
    const scoped = await resolveVendorScopedProductIds(db, user.id)
    if (scoped.error) {
      console.error('admin reviews update vendor scope failed:', scoped.error.message)
      return jsonError('Unable to update review.', 500)
    }
    const reviewProductId = String(reviewRow?.product_id || '')
    if (!scoped.ids.includes(reviewProductId)) {
      return jsonError('Forbidden.', 403)
    }
  }

  const updates: Record<string, any> = {}
  const canEditContent = Boolean(isAdmin)
  const canChangeStatus = Boolean(isAdmin || isVendor)

  if (canEditContent && input.rating !== undefined) updates.rating = input.rating
  if (canEditContent && input.title !== undefined) updates.title = input.title || null
  if (canEditContent && input.content !== undefined) updates.content = input.content
  if (canChangeStatus && input.status !== undefined) updates.status = input.status

  if (!canEditContent && (input.rating !== undefined || input.title !== undefined || input.content !== undefined)) {
    return jsonError('Only admins can edit review content.', 403)
  }

  if (!Object.keys(updates).length) {
    return jsonError('No changes provided.', 400)
  }

  const { data: updated, error: updateErr } = await db
    .from('product_reviews')
    .update(updates)
    .eq('id', input.id)
    .select('id, rating, title, content, status, updated_at')
    .single()

  if (updateErr) {
    if (isSafeMissingSchemaError(updateErr)) {
      return jsonError('Reviews are not available yet.', 503)
    }
    console.error('admin reviews update failed:', updateErr.message)
    return jsonError('Unable to update review.', 500)
  }

  const oldStatus = String(reviewRow?.status || '')
  const newStatus = String(updated?.status || oldStatus || '')
  const reviewerUserId = String(reviewRow?.reviewer_user_id || '').trim()

  if (input.status !== undefined && oldStatus !== newStatus && reviewerUserId) {
    const productId = String(reviewRow?.product_id || '')
    const product = await resolveProductSummary(db, productId)
    const productName = String(product?.name || 'Product')
    const productSlug = String(product?.slug || '')

    await createNotifications(db, [
      {
        recipient_user_id: reviewerUserId,
        recipient_role: 'customer',
        title: 'Review status updated',
        message: `Your review for "${productName}" was ${getStatusLabel(newStatus)}.`,
        type: 'review_status_updated',
        severity: newStatus === 'published' ? 'success' : 'info',
        entity_type: 'product_review',
        entity_id: String(updated?.id || input.id),
        metadata: {
          review_id: String(updated?.id || input.id),
          product_id: productId,
          product_name: productName,
          product_slug: productSlug,
          old_status: oldStatus,
          new_status: newStatus,
          action_url: productSlug ? `/product/${productSlug}` : '/UserBackend/reviews',
        },
        created_by: user.id,
      },
    ])
  }

  const response = jsonOk({
    item: {
      id: String(updated?.id || input.id),
      rating: Number(updated?.rating) || 0,
      title: String(updated?.title || ''),
      content: String(updated?.content || ''),
      status: String(updated?.status || 'published'),
      updated_at: updated?.updated_at || null,
    },
  })
  applyCookies(response)
  return response
}

export async function DELETE(request: NextRequest) {
  const { supabase, applyCookies, canManageCatalog, isAdmin, user } =
    await requireDashboardUser(request)

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }
  if (!isAdmin) {
    return jsonError('Only admins can delete reviews.', 403)
  }

  const parsed = deleteSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parsed.success) {
    return jsonError('Invalid query.', 400)
  }

  const db = supabase
  const reviewId = parsed.data.id
  const { data: reviewRow, error: reviewErr } = await db
    .from('product_reviews')
    .select('id, product_id, reviewer_user_id')
    .eq('id', reviewId)
    .maybeSingle()

  if (reviewErr) {
    if (isSafeMissingSchemaError(reviewErr)) {
      return jsonError('Reviews are not available yet.', 503)
    }
    console.error('admin reviews delete lookup failed:', reviewErr.message)
    return jsonError('Unable to delete review.', 500)
  }
  if (!reviewRow?.id) {
    return jsonError('Review not found.', 404)
  }

  const { error: deleteErr } = await db.from('product_reviews').delete().eq('id', reviewId)
  if (deleteErr) {
    if (isSafeMissingSchemaError(deleteErr)) {
      return jsonError('Reviews are not available yet.', 503)
    }
    console.error('admin reviews delete failed:', deleteErr.message)
    return jsonError('Unable to delete review.', 500)
  }

  const reviewerUserId = String(reviewRow?.reviewer_user_id || '').trim()
  if (reviewerUserId) {
    const product = await resolveProductSummary(db, String(reviewRow?.product_id || ''))
    const productName = String(product?.name || 'Product')
    const productSlug = String(product?.slug || '')

    await createNotifications(db, [
      {
        recipient_user_id: reviewerUserId,
        recipient_role: 'customer',
        title: 'Review deleted',
        message: `Your review for "${productName}" was removed by moderation.`,
        type: 'review_deleted',
        severity: 'warning',
        entity_type: 'product_review',
        entity_id: reviewId,
        metadata: {
          review_id: reviewId,
          product_id: String(reviewRow?.product_id || ''),
          product_name: productName,
          product_slug: productSlug,
          action_url: '/UserBackend/reviews',
        },
        created_by: user.id,
      },
    ])
  }

  const response = jsonOk({ ok: true, id: reviewId })
  applyCookies(response)
  return response
}
