import type { NextRequest } from 'next/server'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { buildSlug } from '@/lib/admin/taxonomy'
import {
  createAttributeSchema,
  deleteAttributeSchema,
  listAttributesQuerySchema,
  updateAttributeSchema,
} from '@/lib/admin/attributes'

const ATTRIBUTE_TABLE = 'admin_attributes'
const TYPE_TABLE = 'admin_attribute_types'
const OPTIONS_TABLE = 'admin_attribute_options'

const buildMissingTableMessage = () =>
  'attributes table not found. Run migration 014_admin_attributes.sql.'

type AttributeTypeRow = {
  id: string
  name: string
  slug: string
}

type AttributeRow = {
  id: string
  name: string
  slug: string
  description: string | null
  type_id: string
  created_at: string
  created_by: string | null
  admin_attribute_types: AttributeTypeRow[] | null
}

type AttributeOptionRow = {
  id: string
  attribute_id: string
  name: string
  slug: string
  color_hex: string | null
  sort_order: number | null
  created_at: string
}

type AttributeItem = Omit<AttributeRow, 'admin_attribute_types'> & {
  type: AttributeTypeRow[] | null
  options?: AttributeOptionRow[]
  visibility?: 'shared' | 'private'
  can_edit?: boolean
  can_change_visibility?: boolean
}

const applyVendorVisibilityFilter = (query: any, userId: string) =>
  query.or(`created_by.eq.${userId},created_by.is.null`)

const getVisibilityState = (createdBy: string | null, userId: string) => {
  if (createdBy && createdBy === userId) return { visibility: 'private' as const, can_edit: true }
  if (!createdBy) return { visibility: 'shared' as const, can_edit: false }
  return { visibility: 'private' as const, can_edit: false }
}

const resolveType = async (supabase, typeId) => {
  const { data, error } = await supabase
    .from(TYPE_TABLE)
    .select('id, name, slug')
    .eq('id', typeId)
    .maybeSingle()
  if (error || !data?.id) return null
  return data
}

export async function listAttributes(request: NextRequest) {
  const { applyCookies, canManageCatalog, isAdmin, isVendor, user } =
    await requireDashboardUser(request)
  const db = createAdminSupabaseClient()

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }

  const parseResult = listAttributesQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parseResult.success) {
    return jsonError('Invalid query.', 400)
  }

  const { page, per_page, search, include_options } = parseResult.data
  const from = (page - 1) * per_page
  const to = from + per_page - 1

  let query = db
    .from(ATTRIBUTE_TABLE)
    .select('id, name, slug, description, type_id, created_at, created_by, admin_attribute_types(id, name, slug)')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (isVendor) {
    query = applyVendorVisibilityFilter(query, user.id)
  }

  if (search) {
    const term = `%${search}%`
    query = query.or(`name.ilike.${term},slug.ilike.${term}`)
  }

  const { data, error } = await query
  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('attribute list failed:', error.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to load attributes.', 500)
  }

  let totalCount = 0
  try {
    let countQuery = db
      .from(ATTRIBUTE_TABLE)
      .select('id', { count: 'exact', head: true })
    if (isVendor) {
      countQuery = applyVendorVisibilityFilter(countQuery, user.id)
    }
    if (search) {
      const term = `%${search}%`
      countQuery = countQuery.or(`name.ilike.${term},slug.ilike.${term}`)
    }
    const { count, error: countError } = await countQuery
    if (countError) {
      console.error('attribute count failed:', countError.message)
    } else {
      totalCount = count ?? 0
    }
  } catch (countErr) {
    console.error('attribute count failed:', countErr)
  }

  const items: AttributeItem[] = ((data ?? []) as AttributeRow[]).map((row) => ({
    ...row,
    type: row.admin_attribute_types || null,
    ...(isAdmin
      ? {
          visibility: row?.created_by ? ('private' as const) : ('shared' as const),
          can_edit: true,
          can_change_visibility: !row?.created_by || String(row?.created_by) === user.id,
        }
      : getVisibilityState(row?.created_by || null, user.id)),
  }))

  if (include_options && items.length) {
    const ids = items.map((item) => item.id)
    const { data: optionRows, error: optionError } = await db
      .from(OPTIONS_TABLE)
      .select('id, attribute_id, name, slug, color_hex, sort_order, created_at')
      .in('attribute_id', ids)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (optionError) {
      console.error('attribute options list failed:', optionError.message)
      return jsonError('Unable to load attribute options.', 500)
    }

    const grouped = new Map<string, AttributeOptionRow[]>()
    ;((optionRows || []) as AttributeOptionRow[]).forEach((row) => {
      const list = grouped.get(row.attribute_id) || []
      list.push(row)
      grouped.set(row.attribute_id, list)
    })

    items.forEach((item) => {
      item.options = grouped.get(item.id) || []
    })
  }

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
    permissions: {
      is_admin: Boolean(isAdmin),
      is_vendor: Boolean(isVendor),
    },
  })
  applyCookies(response)
  return response
}

export async function createAttribute(request: NextRequest) {
  const { applyCookies, canManageCatalog, isAdmin, user } =
    await requireDashboardUser(request)
  const db = createAdminSupabaseClient()

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    console.error('attribute create parse error:', error)
    return jsonError('Invalid payload.', 400)
  }

  const parsed = createAttributeSchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError('Invalid attribute details.', 400)
  }

  const type = await resolveType(db, parsed.data.type_id)
  if (!type) {
    return jsonError('Invalid attribute type.', 400)
  }

  const slugSource = parsed.data.slug || parsed.data.name
  const slug = buildSlug(slugSource)
  if (!slug) {
    return jsonError('Invalid slug.', 400)
  }

  const { data, error } = await db
    .from(ATTRIBUTE_TABLE)
    .insert({
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      type_id: parsed.data.type_id,
      created_by:
        isAdmin && parsed.data.visibility === 'private'
          ? user.id
          : isAdmin
            ? null
            : user.id,
    })
    .select('id, name, slug, description, type_id, created_at, created_by')
    .single()

  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('attribute create failed:', error.message)
    if (errorCode === '23505') {
      return jsonError('Slug already exists.', 409)
    }
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to create attribute.', 500)
  }

  const response = jsonOk({ item: { ...data, type } })
  applyCookies(response)
  return response
}

export async function updateAttribute(request: NextRequest) {
  const { applyCookies, canManageCatalog, isAdmin, isVendor, user } =
    await requireDashboardUser(request)
  const db = createAdminSupabaseClient()

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    console.error('attribute update parse error:', error)
    return jsonError('Invalid payload.', 400)
  }

  const parsed = updateAttributeSchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError('Invalid attribute details.', 400)
  }

  const { data: existing, error: existingError } = await db
    .from(ATTRIBUTE_TABLE)
    .select('id, created_by')
    .eq('id', parsed.data.id)
    .maybeSingle()

  if (existingError) {
    const errorCode = (existingError as { code?: string })?.code
    console.error('attribute update lookup failed:', existingError.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to update attribute.', 500)
  }
  if (!existing?.id) {
    return jsonError('Attribute not found.', 404)
  }
  if (isVendor && !isAdmin && String(existing?.created_by || '') !== user.id) {
    return jsonError('You can only edit attributes you created.', 403)
  }

  const type = await resolveType(db, parsed.data.type_id)
  if (!type) {
    return jsonError('Invalid attribute type.', 400)
  }

  const slugSource = parsed.data.slug || parsed.data.name
  const slug = buildSlug(slugSource)
  if (!slug) {
    return jsonError('Invalid slug.', 400)
  }

  const { data, error } = await db
    .from(ATTRIBUTE_TABLE)
    .update({
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      type_id: parsed.data.type_id,
      ...(isAdmin &&
      parsed.data.visibility &&
      (!existing?.created_by || String(existing?.created_by) === user.id)
        ? { created_by: parsed.data.visibility === 'public' ? null : user.id }
        : {}),
    })
    .eq('id', parsed.data.id)
    .select('id, name, slug, description, type_id, created_at, created_by')
    .single()

  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('attribute update failed:', error.message)
    if (errorCode === '23505') {
      return jsonError('Slug already exists.', 409)
    }
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to update attribute.', 500)
  }

  const response = jsonOk({ item: { ...data, type } })
  applyCookies(response)
  return response
}

export async function deleteAttribute(request: NextRequest) {
  const { applyCookies, canManageCatalog, isAdmin, isVendor, user } =
    await requireDashboardUser(request)
  const db = createAdminSupabaseClient()

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    console.error('attribute delete parse error:', error)
    return jsonError('Invalid payload.', 400)
  }

  const parsed = deleteAttributeSchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError('Invalid attribute id.', 400)
  }

  if (isVendor && !isAdmin) {
    const { data: existing, error: existingError } = await db
      .from(ATTRIBUTE_TABLE)
      .select('id, created_by')
      .eq('id', parsed.data.id)
      .maybeSingle()

    if (existingError) {
      const errorCode = (existingError as { code?: string })?.code
      console.error('attribute delete lookup failed:', existingError.message)
      if (errorCode === '42P01') {
        return jsonError(buildMissingTableMessage(), 500)
      }
      return jsonError('Unable to delete attribute.', 500)
    }
    if (!existing?.id) {
      return jsonError('Attribute not found.', 404)
    }
    if (String(existing?.created_by || '') !== user.id) {
      return jsonError('You can only delete attributes you created.', 403)
    }
  }

  const { error } = await db
    .from(ATTRIBUTE_TABLE)
    .delete()
    .eq('id', parsed.data.id)

  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('attribute delete failed:', error.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to delete attribute.', 500)
  }

  const response = jsonOk({ deleted: true })
  applyCookies(response)
  return response
}
