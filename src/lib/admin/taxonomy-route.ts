import type { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import {
  buildSlug,
  createTaxonomySchema,
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
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const parseResult = listQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parseResult.success) {
    return jsonError('Invalid query.', 400)
  }

  const { page, per_page, search } = parseResult.data
  const from = (page - 1) * per_page
  const to = from + per_page - 1

  let query = supabase
    .from(config.table)
    .select('id, name, slug, description, created_at, created_by')
    .order('created_at', { ascending: false })
    .range(from, to)

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
    let countQuery = supabase
      .from(config.table)
      .select('id', { count: 'exact', head: true })
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

  const response = jsonOk({ items: data ?? [], pages, page, total_count: totalCount || null })
  applyCookies(response)
  return response
}

export async function createTaxonomy(request: NextRequest, config: TaxonomyConfig) {
  const { supabase, applyCookies, isAdmin, user } = await requireAdmin(request)

  if (!isAdmin) {
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
