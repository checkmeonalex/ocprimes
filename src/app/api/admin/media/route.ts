import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'

const toSlug = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const resolveUserBrandSlugFallback = (user: any) => {
  const metadata = user?.user_metadata && typeof user.user_metadata === 'object'
    ? user.user_metadata
    : {}
  const profile = metadata?.profile && typeof metadata.profile === 'object'
    ? metadata.profile
    : {}
  return toSlug(
    metadata?.brand_slug ||
      metadata?.brand_name ||
      profile?.brand_slug ||
      profile?.brand_name ||
      '',
  )
}

const resolveVendorBrandIds = async (db: any, userId: string, user: any) => {
  const { data, error } = await db.from('admin_brands').select('id').eq('created_by', userId)
  if (!error && Array.isArray(data) && data.length) {
    return data.map((item: any) => String(item?.id || '')).filter(Boolean)
  }
  if (error) {
    console.error('vendor brand lookup failed:', error.message)
  }

  const fallbackSlug = resolveUserBrandSlugFallback(user)
  if (!fallbackSlug) return []

  const { data: bySlug, error: slugError } = await db
    .from('admin_brands')
    .select('id')
    .eq('slug', fallbackSlug)
    .limit(1)
  if (slugError) {
    console.error('vendor brand fallback lookup failed:', slugError.message)
    return []
  }
  return Array.isArray(bySlug)
    ? bySlug.map((item: any) => String(item?.id || '')).filter(Boolean)
    : []
}

const resolveVendorAccessibleProductIds = async (db: any, userId: string, user: any) => {
  const [brandIds, ownProductsResult] = await Promise.all([
    resolveVendorBrandIds(db, userId, user),
    db.from('products').select('id').eq('created_by', userId),
  ])

  const ownProductIds = ownProductsResult.error
    ? []
    : Array.isArray(ownProductsResult.data)
      ? ownProductsResult.data.map((item: any) => String(item?.id || '')).filter(Boolean)
      : []

  if (!brandIds.length) {
    return ownProductIds
  }

  const { data: brandProductLinks, error: linkError } = await db
    .from('product_brand_links')
    .select('product_id')
    .in('brand_id', brandIds)
  if (linkError) {
    console.error('vendor brand linked products lookup failed:', linkError.message)
    return ownProductIds
  }

  const brandProductIds = Array.isArray(brandProductLinks)
    ? brandProductLinks.map((item: any) => String(item?.product_id || '')).filter(Boolean)
    : []

  return Array.from(new Set([...ownProductIds, ...brandProductIds]))
}

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  filter: z.enum(['all', 'unattached', 'stale']).default('all'),
  stale_days: z.coerce.number().int().min(1).max(3650).default(180),
})

export async function GET(request: NextRequest) {
  const { supabase, applyCookies, canManageCatalog, isAdmin, isVendor, user } =
    await requireDashboardUser(request)

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }
  const db = isAdmin ? supabase : createAdminSupabaseClient()

  const parseResult = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parseResult.success) {
    return jsonError('Invalid query.', 400)
  }

  const { page, per_page, filter, stale_days } = parseResult.data
  const from = (page - 1) * per_page
  const to = from + per_page - 1
  let vendorAccessibleProductIds: string[] = []
  if (isVendor && user?.id) {
    vendorAccessibleProductIds = await resolveVendorAccessibleProductIds(db, user.id, user)
  }

  let query = db
    .from('product_images')
    .select('id, product_id, r2_key, url, alt_text, sort_order, created_at')
    .order('created_at', { ascending: false })
    .range(from, to)
  if (isVendor) {
    if (vendorAccessibleProductIds.length) {
      const safeIds = vendorAccessibleProductIds
        .filter((id) => /^[0-9a-fA-F-]{16,}$/.test(String(id)))
      if (safeIds.length) {
        query = query.or(`created_by.eq.${user.id},product_id.in.(${safeIds.join(',')})`)
      } else {
        query = query.eq('created_by', user.id)
      }
    } else {
      query = query.eq('created_by', user.id)
    }
  }

  if (filter === 'unattached') {
    query = query.is('product_id', null)
  } else if (filter === 'stale') {
    const cutoff = new Date(Date.now() - stale_days * 24 * 60 * 60 * 1000).toISOString()
    query = query.lt('created_at', cutoff)
  }

  const { data, error } = await query

  if (error) {
    const errorCode = (error as { code?: string })?.code
    const errorDetails = (error as { details?: string })?.details
    const errorHint = (error as { hint?: string })?.hint
    console.error('Media list failed:', {
      code: errorCode,
      message: error.message,
      details: errorDetails,
      hint: errorHint,
    })
    if (errorCode === '42P01') {
      return jsonError('Media table not found. Run migration 009_product_images.sql.', 500)
    }
    if (errorCode === '42703') {
      return jsonError('Media ownership column missing. Run migration 042_vendor_access.sql.', 500)
    }
    return jsonError('Unable to load media.', 500)
  }

  let countQuery = db
    .from('product_images')
    .select('id', { count: 'exact', head: true })
  if (isVendor) {
    if (vendorAccessibleProductIds.length) {
      const safeIds = vendorAccessibleProductIds
        .filter((id) => /^[0-9a-fA-F-]{16,}$/.test(String(id)))
      if (safeIds.length) {
        countQuery = countQuery.or(`created_by.eq.${user.id},product_id.in.(${safeIds.join(',')})`)
      } else {
        countQuery = countQuery.eq('created_by', user.id)
      }
    } else {
      countQuery = countQuery.eq('created_by', user.id)
    }
  }

  if (filter === 'unattached') {
    countQuery = countQuery.is('product_id', null)
  } else if (filter === 'stale') {
    const cutoff = new Date(Date.now() - stale_days * 24 * 60 * 60 * 1000).toISOString()
    countQuery = countQuery.lt('created_at', cutoff)
  }

  let totalCount = 0
  try {
    const { count, error: countError } = await countQuery
    if (countError) {
      console.error('Media count failed:', countError.message)
    } else {
      totalCount = count ?? 0
    }
  } catch (countErr) {
    console.error('Media count failed:', countErr)
  }

  const pages = totalCount
    ? Math.max(1, Math.ceil(totalCount / per_page))
    : data && data.length === per_page
      ? page + 1
      : page

  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL || ''
  const normalizedPublicBase = publicBaseUrl.replace(/\/+$/, '')

  const items = (data ?? []).map((item) => {
    const resolvedUrl =
      normalizedPublicBase && item?.r2_key
        ? `${normalizedPublicBase}/${item.r2_key}`
        : item?.url
    return {
      ...item,
      url: resolvedUrl,
      title: item?.alt_text || 'Media',
      unattached: !item?.product_id,
      is_stale:
        filter === 'stale'
          ? true
          : new Date(item?.created_at || Date.now()).getTime() <
            Date.now() - stale_days * 24 * 60 * 60 * 1000,
    }
  })

  const response = jsonOk({ items, pages, page, total_count: totalCount || null })
  applyCookies(response)
  return response
}
