import type { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
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

export async function listSizeGuides(request: NextRequest) {
  const { applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) {
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

  let query = db
    .from(TABLE)
    .select(SELECT_FIELDS)
    .order('name', { ascending: true })
    .range(from, to)

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
    if (search) countQuery = countQuery.ilike('name', `%${search}%`)
    const { count, error: countError } = await countQuery
    if (!countError) totalCount = count ?? 0
  } catch (countErr) {
    console.error('size guide count failed:', countErr)
  }

  const pages = totalCount
    ? Math.max(1, Math.ceil(totalCount / per_page))
    : data && data.length === per_page
      ? page + 1
      : page

  const response = jsonOk({ items: data ?? [], pages, page, total_count: totalCount || null })
  applyCookies(response)
  return response
}

export async function createSizeGuide(request: NextRequest) {
  const { applyCookies, isAdmin, user } = await requireAdmin(request)
  if (!isAdmin) {
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

  const { data, error } = await db
    .from(TABLE)
    .insert({
      name: parsed.data.name,
      unit_toggle: parsed.data.unit_toggle,
      columns: parsed.data.columns,
      rows: parsed.data.rows,
      how_to_measure: parsed.data.how_to_measure || null,
      notes: parsed.data.notes || null,
      created_by: user?.id || null,
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
  const { applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) {
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

  const { id, ...rest } = parsed.data
  const updates: Record<string, unknown> = {}
  Object.entries(rest).forEach(([key, value]) => {
    if (value !== undefined) updates[key] = value
  })

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
  const { applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }
  if (!id) {
    return jsonError('Missing size guide id.', 400)
  }
  const db = createAdminSupabaseClient()

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

  const { data: existing, error: existingError } = await db
    .from(TABLE)
    .select('id, name')
    .eq('id', id)
    .maybeSingle()

  if (existingError) {
    console.error('size guide delete prefetch failed:', existingError.message)
    return jsonError('Unable to delete size guide.', 500)
  }
  if (!existing?.id) {
    return jsonError('Size guide not found.', 404)
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
