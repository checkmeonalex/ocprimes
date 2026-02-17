import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { buildSlug } from '@/lib/admin/taxonomy'
import { createNotifications, notifyAllAdmins } from '@/lib/admin/notifications'

const REQUEST_TABLE = 'vendor_category_requests'
const PRODUCT_PENDING_LINK_TABLE = 'vendor_product_pending_category_requests'
const PRODUCT_TABLE = 'products'
const CATEGORY_TABLE = 'admin_categories'
const CATEGORY_LINKS = 'product_category_links'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(40),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  search: z.string().trim().max(120).optional(),
})

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  parent_id: z.string().uuid().nullable().optional(),
  product_id: z.string().uuid().optional(),
})

const updateSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
  reviewNote: z.string().trim().max(600).optional(),
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

const buildEmptyPayload = (page: number, perPage: number, isAdmin: boolean, isVendor: boolean) => ({
  items: [],
  pagination: { page, per_page: perPage, total: 0, total_pages: 0 },
  permissions: {
    can_create_request: Boolean(isAdmin || isVendor),
    can_review_request: Boolean(isAdmin),
  },
})

const ensureProductOwnership = async (
  db: any,
  productId: string,
  userId: string,
  isAdmin: boolean,
) => {
  if (isAdmin) return true
  const { data, error } = await db
    .from(PRODUCT_TABLE)
    .select('id')
    .eq('id', productId)
    .eq('created_by', userId)
    .maybeSingle()
  if (error) {
    console.error('category request product ownership check failed:', error.message)
    return false
  }
  return Boolean(data?.id)
}

export async function GET(request: NextRequest) {
  const { supabase, applyCookies, canManageCatalog, isAdmin, isVendor, user } =
    await requireDashboardUser(request)

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }
  const db = isAdmin ? supabase : createAdminSupabaseClient()

  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parsed.success) {
    return jsonError('Invalid query.', 400)
  }

  const { page, per_page: perPage, status, search } = parsed.data
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  let query = db
    .from(REQUEST_TABLE)
    .select(
      'id, requester_user_id, name, slug, parent_id, status, requested_at, reviewed_at, reviewed_by, review_note, approved_category_id',
      { count: 'exact' },
    )
    .order('requested_at', { ascending: false })
    .range(from, to)

  if (!isAdmin) {
    query = query.eq('requester_user_id', user.id)
  }
  if (status) {
    query = query.eq('status', status)
  }
  if (search) {
    const term = `%${search.replace(/[,%()]/g, ' ').trim()}%`
    query = query.or(`name.ilike.${term},slug.ilike.${term}`)
  }

  const { data, error, count } = await query
  if (error) {
    if (isSafeMissingSchemaError(error)) {
      const response = jsonOk(buildEmptyPayload(page, perPage, isAdmin, isVendor))
      applyCookies(response)
      return response
    }
    console.error('category requests list failed:', error.message)
    return jsonError('Unable to load category requests.', 500)
  }

  const total = Number(count) || 0
  const response = jsonOk({
    items: Array.isArray(data) ? data : [],
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: total > 0 ? Math.ceil(total / perPage) : 0,
    },
    permissions: {
      can_create_request: Boolean(isAdmin || isVendor),
      can_review_request: Boolean(isAdmin),
    },
  })
  applyCookies(response)
  return response
}

export async function POST(request: NextRequest) {
  const { supabase, applyCookies, canManageCatalog, isAdmin, user } =
    await requireDashboardUser(request)

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }
  const db = isAdmin ? supabase : createAdminSupabaseClient()

  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid payload.', 400)
  }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || 'Invalid request.', 400)
  }

  const name = parsed.data.name.trim()
  const slug = buildSlug(name)
  if (!slug) return jsonError('Invalid category name.', 400)

  if (parsed.data.product_id) {
    const canAttach = await ensureProductOwnership(db, parsed.data.product_id, user.id, isAdmin)
    if (!canAttach) {
      return jsonError('You cannot link this request to that product.', 403)
    }
  }

  const { data: existingCategory, error: existingCategoryError } = await db
    .from(CATEGORY_TABLE)
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle()

  if (existingCategoryError && !isSafeMissingSchemaError(existingCategoryError)) {
    console.error('category request existing category lookup failed:', existingCategoryError.message)
    return jsonError('Unable to submit category request.', 500)
  }

  if (existingCategory?.id) {
    const response = jsonOk({
      item: {
        id: null,
        name: existingCategory.name,
        slug: existingCategory.slug,
        status: 'approved',
        approved_category_id: existingCategory.id,
      },
      existing_category: existingCategory,
    })
    applyCookies(response)
    return response
  }

  const { data: existingPending, error: existingPendingError } = await db
    .from(REQUEST_TABLE)
    .select('id, requester_user_id, name, slug, status, approved_category_id')
    .eq('slug', slug)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingPendingError && !isSafeMissingSchemaError(existingPendingError)) {
    console.error('category request duplicate pending lookup failed:', existingPendingError.message)
    return jsonError('Unable to submit category request.', 500)
  }

  if (existingPending?.id) {
    if (parsed.data.product_id) {
      await db.from(PRODUCT_PENDING_LINK_TABLE).upsert(
        {
          product_id: parsed.data.product_id,
          category_request_id: existingPending.id,
        },
        { onConflict: 'product_id,category_request_id', ignoreDuplicates: true },
      )
    }
    const response = jsonOk({
      item: existingPending,
      duplicate_pending: true,
    })
    applyCookies(response)
    return response
  }

  const { data: created, error: createError } = await db
    .from(REQUEST_TABLE)
    .insert({
      requester_user_id: user.id,
      name,
      slug,
      parent_id: parsed.data.parent_id || null,
      status: 'pending',
    })
    .select(
      'id, requester_user_id, name, slug, parent_id, status, requested_at, reviewed_at, reviewed_by, review_note, approved_category_id',
    )
    .single()

  if (createError) {
    if (isSafeMissingSchemaError(createError)) {
      return jsonError('Category requests are not available yet. Run latest migrations.', 503)
    }
    if (String((createError as any)?.code || '') === '23505') {
      return jsonError('A pending request with this category name already exists.', 409)
    }
    console.error('category request create failed:', createError.message)
    return jsonError('Unable to submit category request.', 500)
  }

  if (parsed.data.product_id) {
    const { error: linkError } = await db
      .from(PRODUCT_PENDING_LINK_TABLE)
      .upsert(
        {
          product_id: parsed.data.product_id,
          category_request_id: created.id,
        },
        { onConflict: 'product_id,category_request_id', ignoreDuplicates: true },
      )
    if (linkError) {
      console.error('category request product link failed:', linkError.message)
    }
  }

  const response = jsonOk({ item: created })
  if (!isAdmin) {
    let requesterBrandName = ''
    const { data: requesterBrand } = await db
      .from('admin_brands')
      .select('name')
      .eq('created_by', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    requesterBrandName = String(requesterBrand?.name || '').trim()

    await notifyAllAdmins(createAdminSupabaseClient(), {
      title: 'Category request pending review',
      message: requesterBrandName
        ? `Brand "${requesterBrandName}" requested category "${created.name}".`
        : `You have a new category request: "${created.name}".`,
      type: 'category_request_created',
      severity: 'info',
      entityType: 'vendor_category_request',
      entityId: created.id,
      metadata: {
        request_id: created.id,
        request_slug: created.slug,
        requester_user_id: created.requester_user_id,
        requester_brand_name: requesterBrandName || null,
        action_url: '/backend/admin/categories',
      },
      createdBy: user.id,
    })
  }
  applyCookies(response)
  return response
}

export async function PATCH(request: NextRequest) {
  const { supabase, applyCookies, isAdmin, user } = await requireDashboardUser(request)

  if (!isAdmin || !user?.id) {
    return jsonError('Forbidden.', 403)
  }

  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid payload.', 400)
  }
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || 'Invalid request.', 400)
  }

  const { requestId, status, reviewNote } = parsed.data

  const { data: existing, error: existingError } = await supabase
    .from(REQUEST_TABLE)
    .select('id, requester_user_id, name, slug, parent_id, status, approved_category_id')
    .eq('id', requestId)
    .maybeSingle()

  if (existingError) {
    if (isSafeMissingSchemaError(existingError)) {
      return jsonError('Category requests are not available yet. Run latest migrations.', 503)
    }
    console.error('category request fetch failed:', existingError.message)
    return jsonError('Unable to review category request.', 500)
  }
  if (!existing?.id) {
    return jsonError('Category request not found.', 404)
  }
  if (existing.status !== 'pending') {
    return jsonError('Category request already processed.', 409)
  }

  let approvedCategoryId: string | null = null

  if (status === 'approved') {
    const { data: alreadyCategory, error: alreadyCategoryError } = await supabase
      .from(CATEGORY_TABLE)
      .select('id, slug')
      .eq('slug', existing.slug)
      .maybeSingle()
    if (alreadyCategoryError) {
      console.error('category request approval category lookup failed:', alreadyCategoryError.message)
      return jsonError('Unable to approve category request.', 500)
    }

    if (alreadyCategory?.id) {
      approvedCategoryId = String(alreadyCategory.id)
    } else {
      let maxOrder = -1
      let maxQuery = supabase
        .from(CATEGORY_TABLE)
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
      maxQuery = existing.parent_id
        ? maxQuery.eq('parent_id', existing.parent_id)
        : maxQuery.is('parent_id', null)
      const { data: maxData } = await maxQuery
      maxOrder = typeof maxData?.[0]?.sort_order === 'number' ? maxData[0].sort_order : -1

      const { data: createdCategory, error: createCategoryError } = await supabase
        .from(CATEGORY_TABLE)
        .insert({
          name: existing.name,
          slug: existing.slug,
          parent_id: existing.parent_id || null,
          sort_order: maxOrder + 1,
          created_by: existing.requester_user_id,
        })
        .select('id')
        .single()
      if (createCategoryError || !createdCategory?.id) {
        console.error('category request category create failed:', createCategoryError?.message || 'missing id')
        return jsonError('Unable to approve category request.', 500)
      }
      approvedCategoryId = String(createdCategory.id)
    }
  }

  const reviewPayload: Record<string, any> = {
    status,
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
    review_note: reviewNote || null,
    approved_category_id: approvedCategoryId,
  }
  const { error: updateError } = await supabase
    .from(REQUEST_TABLE)
    .update(reviewPayload)
    .eq('id', requestId)
  if (updateError) {
    console.error('category request update failed:', updateError.message)
    return jsonError('Unable to review category request.', 500)
  }

  const { data: pendingProductLinks, error: pendingProductLinksError } = await supabase
    .from(PRODUCT_PENDING_LINK_TABLE)
    .select('product_id')
    .eq('category_request_id', requestId)

  if (pendingProductLinksError) {
    console.error('category request pending product links fetch failed:', pendingProductLinksError.message)
    return jsonError('Unable to finalize category request.', 500)
  }

  let approvedLinkedProductsCount = 0
  if (status === 'approved' && approvedCategoryId) {
    const productIds = Array.isArray(pendingProductLinks)
      ? Array.from(
          new Set(
            pendingProductLinks
              .map((row: any) => String(row?.product_id || ''))
              .filter(Boolean),
          ),
        )
      : []
    approvedLinkedProductsCount = productIds.length

    if (productIds.length) {
      const payload = productIds.map((productId) => ({
        product_id: productId,
        category_id: approvedCategoryId,
      }))
      const { error: attachError } = await supabase
        .from(CATEGORY_LINKS)
        .upsert(payload, { onConflict: 'product_id,category_id', ignoreDuplicates: true })
      if (attachError) {
        console.error('category request approved category attach failed:', attachError.message)
        return jsonError('Category approved but failed to attach to pending products.', 500)
      }
    }
  }

  const { error: deletePendingLinksError } = await supabase
    .from(PRODUCT_PENDING_LINK_TABLE)
    .delete()
    .eq('category_request_id', requestId)
  if (deletePendingLinksError) {
    console.error('category request pending links cleanup failed:', deletePendingLinksError.message)
  }

  const response = jsonOk({
    success: true,
    item: {
      id: requestId,
      status,
      approved_category_id: approvedCategoryId,
    },
  })

  await createNotifications(createAdminSupabaseClient(), [
    {
      recipient_user_id: existing.requester_user_id,
      recipient_role: 'vendor',
      title: status === 'approved' ? 'Category request approved' : 'Category request rejected',
      message:
        status === 'approved'
          ? approvedLinkedProductsCount > 0
            ? `"${existing.name}" was created and linked to your pending product(s). You can now set your product live and view it.`
            : `"${existing.name}" was created successfully. You can now view and use this category.`
          : `"${existing.name}" was rejected.${reviewNote ? ` Note: ${reviewNote}` : ''}`,
      type: 'category_request_reviewed',
      severity: status === 'approved' ? 'success' : 'warning',
      entity_type: 'vendor_category_request',
      entity_id: requestId,
      metadata: {
        request_id: requestId,
        approved_category_id: approvedCategoryId,
        review_note: reviewNote || null,
        linked_products_count: approvedLinkedProductsCount,
        action_url: '/backend/admin/categories',
      },
      created_by: user.id,
    },
  ])

  applyCookies(response)
  return response
}
