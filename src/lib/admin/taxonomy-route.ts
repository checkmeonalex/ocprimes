import type { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import {
  buildSlug,
  createTaxonomySchema,
  deleteTaxonomySchema,
  listQuerySchema,
  updateTaxonomySchema,
} from '@/lib/admin/taxonomy'

type TaxonomyConfig = {
  table: string
  singularLabel: string
  pluralLabel: string
}

const buildMissingTableMessage = (config: TaxonomyConfig) =>
  `${config.pluralLabel} table not found. Run migration 010_admin_taxonomies.sql.`

export async function listTaxonomy(request: NextRequest, config: TaxonomyConfig) {
  const { supabase, applyCookies, canManageCatalog, isAdmin, isVendor, user } =
    await requireDashboardUser(request)

  if (!canManageCatalog) {
    return jsonError('Forbidden.', 403)
  }
  const db =
    config.table === 'admin_brands'
      ? createAdminSupabaseClient()
      : isAdmin
        ? supabase
        : createAdminSupabaseClient()

  const parseResult = listQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parseResult.success) {
    return jsonError('Invalid query.', 400)
  }

  const { page, per_page, search } = parseResult.data
  const from = (page - 1) * per_page
  const to = from + per_page - 1

  let query = db
    .from(config.table)
    .select('id, name, slug, description, created_at, created_by')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (isVendor && config.table === 'admin_brands' && user?.id) {
    query = query.eq('created_by', user.id)
  }

  if (search) {
    const term = `%${search}%`
    query = query.or(`name.ilike.${term},slug.ilike.${term}`)
  }

  const { data, error } = await query
  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error(`${config.singularLabel} list failed:`, error.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(config), 500)
    }
    return jsonError(`Unable to load ${config.pluralLabel}.`, 500)
  }

  let totalCount = 0
  try {
    let countQuery = db
      .from(config.table)
      .select('id', { count: 'exact', head: true })
    if (isVendor && config.table === 'admin_brands' && user?.id) {
      countQuery = countQuery.eq('created_by', user.id)
    }
    if (search) {
      const term = `%${search}%`
      countQuery = countQuery.or(`name.ilike.${term},slug.ilike.${term}`)
    }
    const { count, error: countError } = await countQuery
    if (countError) {
      console.error(`${config.singularLabel} count failed:`, countError.message)
    } else {
      totalCount = count ?? 0
    }
  } catch (countErr) {
    console.error(`${config.singularLabel} count failed:`, countErr)
  }

  const pages = totalCount
    ? Math.max(1, Math.ceil(totalCount / per_page))
    : data && data.length === per_page
      ? page + 1
      : page

  let items = Array.isArray(data) ? [...data] : []
  if (config.table === 'admin_tags' && items.length) {
    const tagIds = items.map((item) => item?.id).filter(Boolean)
    const usageCountMap = new Map<string, number>()
    if (tagIds.length) {
      const { data: linkRows, error: linkErr } = await db
        .from('product_tag_links')
        .select('tag_id')
        .in('tag_id', tagIds)
      if (linkErr) {
        console.error('tag usage lookup failed:', linkErr.message)
      } else {
        ;(linkRows || []).forEach((row: { tag_id?: string | null }) => {
          const id = String(row?.tag_id || '')
          if (!id) return
          usageCountMap.set(id, (usageCountMap.get(id) || 0) + 1)
        })
      }
    }
    const viewerId = user?.id ? String(user.id) : ''
    items = items.map((item) => {
      const id = String(item?.id || '')
      const createdBy = String(item?.created_by || '')
      return {
        ...item,
        is_owner: Boolean(viewerId && createdBy && viewerId === createdBy),
        usage_count: usageCountMap.get(id) || 0,
      }
    })
  }

  const response = jsonOk({ items, pages, page, total_count: totalCount || null })
  applyCookies(response)
  return response
}

export async function createTaxonomy(request: NextRequest, config: TaxonomyConfig) {
  const tagTable = config.table === 'admin_tags'
  const dashboardUser = await requireDashboardUser(request)
  const adminUser = tagTable ? null : await requireAdmin(request)

  const supabase = tagTable
    ? dashboardUser.isAdmin
      ? dashboardUser.supabase
      : createAdminSupabaseClient()
    : adminUser!.supabase
  const applyCookies = tagTable ? dashboardUser.applyCookies : adminUser!.applyCookies
  const user = tagTable ? dashboardUser.user : adminUser!.user
  const canCreate = tagTable
    ? dashboardUser.canManageCatalog
    : Boolean(adminUser?.isAdmin)

  if (!canCreate) {
    return jsonError('Forbidden.', 403)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    console.error(`${config.singularLabel} create parse error:`, error)
    return jsonError('Invalid payload.', 400)
  }

  const parsed = createTaxonomySchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError(`Invalid ${config.singularLabel} details.`, 400)
  }

  const slugSource = parsed.data.slug || parsed.data.name
  const slug = buildSlug(slugSource)
  if (!slug) {
    return jsonError('Invalid slug.', 400)
  }

  const { data, error } = await supabase
    .from(config.table)
    .insert({
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      created_by: user?.id || null,
    })
    .select('id, name, slug, description, created_at, created_by')
    .single()

  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error(`${config.singularLabel} create failed:`, error.message)
    if (errorCode === '23505') {
      return jsonError('Slug already exists.', 409)
    }
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(config), 500)
    }
    return jsonError(`Unable to create ${config.singularLabel}.`, 500)
  }

  const response = jsonOk({ item: data })
  applyCookies(response)
  return response
}

export async function updateTaxonomy(request: NextRequest, config: TaxonomyConfig) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    console.error(`${config.singularLabel} update parse error:`, error)
    return jsonError('Invalid payload.', 400)
  }

  const parsed = updateTaxonomySchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError(`Invalid ${config.singularLabel} details.`, 400)
  }

  const slugSource = parsed.data.slug || parsed.data.name
  const slug = buildSlug(slugSource)
  if (!slug) {
    return jsonError('Invalid slug.', 400)
  }

  const { data, error } = await supabase
    .from(config.table)
    .update({
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
    })
    .eq('id', parsed.data.id)
    .select('id, name, slug, description, created_at, created_by')
    .single()

  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error(`${config.singularLabel} update failed:`, error.message)
    if (errorCode === '23505') {
      return jsonError('Slug already exists.', 409)
    }
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(config), 500)
    }
    return jsonError(`Unable to update ${config.singularLabel}.`, 500)
  }

  const response = jsonOk({ item: data })
  applyCookies(response)
  return response
}

export async function deleteTaxonomy(request: NextRequest, config: TaxonomyConfig) {
  const tagTable = config.table === 'admin_tags'

  if (tagTable) {
    const { supabase, applyCookies, canManageCatalog, isAdmin, user } = await requireDashboardUser(request)

    if (!canManageCatalog || !user?.id) {
      return jsonError('Forbidden.', 403)
    }

    let payload: unknown
    try {
      payload = await request.json()
    } catch (error) {
      console.error(`${config.singularLabel} delete parse error:`, error)
      return jsonError('Invalid payload.', 400)
    }

    const parsed = deleteTaxonomySchema.safeParse(payload)
    if (!parsed.success) {
      return jsonError(`Invalid ${config.singularLabel} details.`, 400)
    }

    const db = isAdmin ? supabase : createAdminSupabaseClient()
    if (!isAdmin) {
      const { data: existing, error: existingError } = await db
        .from(config.table)
        .select('id, created_by')
        .eq('id', parsed.data.id)
        .maybeSingle()

      if (existingError) {
        const errorCode = (existingError as { code?: string })?.code
        console.error(`${config.singularLabel} owner lookup failed:`, existingError.message)
        if (errorCode === '42P01') {
          return jsonError(buildMissingTableMessage(config), 500)
        }
        return jsonError(`Unable to delete ${config.singularLabel}.`, 500)
      }

      if (!existing) {
        return jsonError(`${config.singularLabel} not found.`, 404)
      }

      if (String(existing.created_by || '') !== String(user.id)) {
        return jsonError('Forbidden.', 403)
      }
    }

    const { error } = await db.from(config.table).delete().eq('id', parsed.data.id)
    if (error) {
      const errorCode = (error as { code?: string })?.code
      console.error(`${config.singularLabel} delete failed:`, error.message)
      if (errorCode === '42P01') {
        return jsonError(buildMissingTableMessage(config), 500)
      }
      return jsonError(`Unable to delete ${config.singularLabel}.`, 500)
    }

    const response = jsonOk({ success: true })
    applyCookies(response)
    return response
  }

  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    console.error(`${config.singularLabel} delete parse error:`, error)
    return jsonError('Invalid payload.', 400)
  }

  const parsed = deleteTaxonomySchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError(`Invalid ${config.singularLabel} details.`, 400)
  }

  const { error } = await supabase.from(config.table).delete().eq('id', parsed.data.id)
  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error(`${config.singularLabel} delete failed:`, error.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(config), 500)
    }
    return jsonError(`Unable to delete ${config.singularLabel}.`, 500)
  }

  const response = jsonOk({ success: true })
  applyCookies(response)
  return response
}
