import type { NextRequest } from 'next/server'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import {
  createSizeGuideSchema,
  listSizeGuidesQuerySchema,
  updateSizeGuideSchema,
} from '@/lib/admin/size-guides'

const TABLE = 'size_guides'
const SELECT_FIELDS =
  'id, name, unit_toggle, columns, rows, how_to_measure, notes, created_at, updated_at, created_by'

const buildMissingTableMessage = () => 'size_guides table not found. Run migration 113_size_guides.sql.'

// Same convention as admin_attributes (see attribute-route.ts): created_by
// null means the guide is shared/admin-published and visible to everyone;
// a user id means it's private to whoever created it. No separate
// is_public column — created_by already carries this meaning.
const applyVendorVisibilityFilter = (query: any, userId: string) =>
  query.or(`created_by.eq.${userId},created_by.is.null`)

const getVisibilityState = (createdBy: string | null, userId: string) => {
  if (createdBy && createdBy === userId) return { visibility: 'private' as const, can_edit: true }
  if (!createdBy) return { visibility: 'shared' as const, can_edit: false }
  return { visibility: 'private' as const, can_edit: false }
}

export async function listSizeGuides(request: NextRequest) {
  const { applyCookies, canManageCatalog, isAdmin, isVendor, user } = await requireDashboardUser(request)
  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }
  const db = createAdminSupabaseClient()

  const parseResult = listSizeGuidesQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parseResult.success) {
    return jsonError('Invalid query.', 400)
  }

  const { page, per_page, search } = parseResult.data
  const from = (page - 1) * per_page
  const to = from + per_page - 1

  let query = db.from(TABLE).select(SELECT_FIELDS).order('name', { ascending: true }).range(from, to)
  if (isVendor) {
    query = applyVendorVisibilityFilter(query, user.id)
  }
  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data, error } = await query
  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('size guide list failed:', error.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to load size guides.', 500)
  }

  let totalCount = 0
  try {
    let countQuery = db.from(TABLE).select('id', { count: 'exact', head: true })
    if (isVendor) countQuery = applyVendorVisibilityFilter(countQuery, user.id)
    if (search) countQuery = countQuery.ilike('name', `%${search}%`)
    const { count, error: countError } = await countQuery
    if (!countError) totalCount = count ?? 0
  } catch (countErr) {
    console.error('size guide count failed:', countErr)
  }

  const items = ((data ?? []) as Array<{ created_by: string | null }>).map((row) => ({
    ...row,
    ...(isAdmin
      ? {
          visibility: row?.created_by ? ('private' as const) : ('shared' as const),
          can_edit: true,
          can_change_visibility: !row?.created_by || String(row?.created_by) === user.id,
        }
      : getVisibilityState(row?.created_by || null, user.id)),
  }))

  const pages = totalCount
    ? Math.max(1, Math.ceil(totalCount / per_page))
    : data && data.length === per_page
      ? page + 1
      : page

  const response = jsonOk({
    items,
    pages,
    page,
    total_count: totalCount || null,
    permissions: { is_admin: Boolean(isAdmin), is_vendor: Boolean(isVendor) },
  })
  applyCookies(response)
  return response
}

export async function createSizeGuide(request: NextRequest) {
  const { applyCookies, canManageCatalog, isAdmin, user } = await requireDashboardUser(request)
  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }
  const db = createAdminSupabaseClient()

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    console.error('size guide create parse error:', error)
    return jsonError('Invalid payload.', 400)
  }

  const parsed = createSizeGuideSchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || 'Invalid size guide details.', 400)
  }

  // Vendors always create private guides (created_by = self). Admins can
  // choose to publish shared (created_by = null) or keep it private to
  // themselves, same as attribute-route.ts's createAttribute.
  const createdBy = isAdmin && parsed.data.visibility === 'private' ? user.id : isAdmin ? null : user.id

  const { data, error } = await db
    .from(TABLE)
    .insert({
      name: parsed.data.name,
      unit_toggle: parsed.data.unit_toggle,
      columns: parsed.data.columns,
      rows: parsed.data.rows,
      how_to_measure: parsed.data.how_to_measure || null,
      notes: parsed.data.notes || null,
      created_by: createdBy,
    })
    .select(SELECT_FIELDS)
    .single()

  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('size guide create failed:', error.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to create size guide.', 500)
  }

  const response = jsonOk({ item: data })
  applyCookies(response)
  return response
}

export async function updateSizeGuide(request: NextRequest) {
  const { applyCookies, canManageCatalog, isAdmin, isVendor, user } = await requireDashboardUser(request)
  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }
  const db = createAdminSupabaseClient()

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    console.error('size guide update parse error:', error)
    return jsonError('Invalid payload.', 400)
  }

  const parsed = updateSizeGuideSchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || 'Invalid size guide details.', 400)
  }

  const { id, visibility, ...rest } = parsed.data

  const { data: existing, error: existingError } = await db
    .from(TABLE)
    .select('id, created_by')
    .eq('id', id)
    .maybeSingle()
  if (existingError) {
    console.error('size guide update lookup failed:', existingError.message)
    return jsonError('Unable to update size guide.', 500)
  }
  if (!existing?.id) {
    return jsonError('Size guide not found.', 404)
  }
  if (isVendor && !isAdmin && String(existing.created_by || '') !== user.id) {
    return jsonError('You can only edit size guides you created.', 403)
  }

  const updates: Record<string, unknown> = {}
  Object.entries(rest).forEach(([key, value]) => {
    if (value !== undefined) updates[key] = value
  })
  if (isAdmin && visibility && (!existing.created_by || String(existing.created_by) === user.id)) {
    updates.created_by = visibility === 'public' ? null : user.id
  }

  if (!Object.keys(updates).length) {
    return jsonError('No fields to update.', 400)
  }
  updates.updated_at = new Date().toISOString()

  const { data, error } = await db
    .from(TABLE)
    .update(updates)
    .eq('id', id)
    .select(SELECT_FIELDS)
    .single()

  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('size guide update failed:', error.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    if (errorCode === 'PGRST116') {
      return jsonError('Size guide not found.', 404)
    }
    return jsonError('Unable to update size guide.', 500)
  }

  const response = jsonOk({ item: data })
  applyCookies(response)
  return response
}

export async function deleteSizeGuide(request: NextRequest, id: string) {
  const { applyCookies, canManageCatalog, isAdmin, isVendor, user } = await requireDashboardUser(request)
  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }
  if (!id) {
    return jsonError('Missing size guide id.', 400)
  }
  const db = createAdminSupabaseClient()

  const { data: existing, error: existingError } = await db
    .from(TABLE)
    .select('id, name, created_by')
    .eq('id', id)
    .maybeSingle()

  if (existingError) {
    console.error('size guide delete prefetch failed:', existingError.message)
    return jsonError('Unable to delete size guide.', 500)
  }
  if (!existing?.id) {
    return jsonError('Size guide not found.', 404)
  }
  if (isVendor && !isAdmin && String(existing.created_by || '') !== user.id) {
    return jsonError('You can only delete size guides you created.', 403)
  }

  const [categoryUsage, productUsage] = await Promise.all([
    db.from('admin_categories').select('id', { count: 'exact', head: true }).eq('size_guide_id', id),
    db.from('products').select('id', { count: 'exact', head: true }).eq('size_guide_id', id),
  ])

  const categoryCount = Number(categoryUsage.count || 0)
  const productCount = Number(productUsage.count || 0)
  if (categoryCount > 0 || productCount > 0) {
    const parts: string[] = []
    if (categoryCount > 0) parts.push(`${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'}`)
    if (productCount > 0) parts.push(`${productCount} product${productCount === 1 ? '' : 's'}`)
    return jsonError(
      `This size guide is still assigned to ${parts.join(' and ')}. Unassign it first.`,
      409,
    )
  }

  const { error: deleteError } = await db.from(TABLE).delete().eq('id', id)
  if (deleteError) {
    console.error('size guide delete failed:', deleteError.message)
    return jsonError('Unable to delete size guide.', 500)
  }

  const response = jsonOk({ deleted: true, item: existing })
  applyCookies(response)
  return response
}
