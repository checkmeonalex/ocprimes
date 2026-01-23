import type { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import {
  buildSlug,
  categoryTreeQuerySchema,
  createCategorySchema,
  listCategoriesQuerySchema,
  reorderCategoriesSchema,
} from '@/lib/admin/categories'

const TABLE = 'admin_categories'

const buildMissingTableMessage = () =>
  'categories table not found. Run migration 010_admin_taxonomies.sql.'

export async function listCategories(request: NextRequest) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const parseResult = listCategoriesQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parseResult.success) {
    return jsonError('Invalid query.', 400)
  }

  const { page, per_page, search } = parseResult.data
  const from = (page - 1) * per_page
  const to = from + per_page - 1

  let query = supabase
    .from(TABLE)
    .select('id, name, slug, description, parent_id, sort_order, created_at, created_by')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
    .range(from, to)

  if (search) {
    const term = `%${search}%`
    query = query.or(`name.ilike.${term},slug.ilike.${term}`)
  }

  const { data, error } = await query
  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('category list failed:', error.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to load categories.', 500)
  }

  let totalCount = 0
  try {
    let countQuery = supabase
      .from(TABLE)
      .select('id', { count: 'exact', head: true })
    if (search) {
      const term = `%${search}%`
      countQuery = countQuery.or(`name.ilike.${term},slug.ilike.${term}`)
    }
    const { count, error: countError } = await countQuery
    if (countError) {
      console.error('category count failed:', countError.message)
    } else {
      totalCount = count ?? 0
    }
  } catch (countErr) {
    console.error('category count failed:', countErr)
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

export async function listCategoryTree(request: NextRequest) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const parseResult = categoryTreeQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parseResult.success) {
    return jsonError('Invalid query.', 400)
  }

  const { limit, search } = parseResult.data

  let query = supabase
    .from(TABLE)
    .select('id, name, slug, description, parent_id, sort_order, created_at, created_by')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
    .limit(limit)

  if (search) {
    const term = `%${search}%`
    query = query.or(`name.ilike.${term},slug.ilike.${term}`)
  }

  const { data, error } = await query
  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('category tree list failed:', error.message)
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to load categories.', 500)
  }

  const response = jsonOk({ items: data ?? [] })
  applyCookies(response)
  return response
}

export async function createCategory(request: NextRequest) {
  const { supabase, applyCookies, isAdmin, user } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    console.error('category create parse error:', error)
    return jsonError('Invalid payload.', 400)
  }

  const parsed = createCategorySchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError('Invalid category details.', 400)
  }

  const slugSource = parsed.data.slug || parsed.data.name
  const slug = buildSlug(slugSource)
  if (!slug) {
    return jsonError('Invalid slug.', 400)
  }

  const parentId = parsed.data.parent_id || null
  if (parentId === null) {
    // ok
  } else if (parentId && parentId.length === 0) {
    return jsonError('Invalid parent category.', 400)
  }

  let maxOrder = -1
  try {
    let maxQuery = supabase
      .from(TABLE)
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
    maxQuery = parentId ? maxQuery.eq('parent_id', parentId) : maxQuery.is('parent_id', null)
    const { data: maxData, error: maxError } = await maxQuery
    if (maxError) {
      console.error('category sort order lookup failed:', maxError.message)
    } else {
      maxOrder = typeof maxData?.[0]?.sort_order === 'number' ? maxData[0].sort_order : -1
    }
  } catch (maxErr) {
    console.error('category sort order lookup failed:', maxErr)
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      parent_id: parentId,
      sort_order: maxOrder + 1,
      created_by: user?.id || null,
    })
    .select('id, name, slug, description, parent_id, sort_order, created_at, created_by')
    .single()

  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('category create failed:', error.message)
    if (errorCode === '23505') {
      return jsonError('Slug already exists.', 409)
    }
    if (errorCode === '23503') {
      return jsonError('Parent category not found.', 400)
    }
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to create category.', 500)
  }

  const response = jsonOk({ item: data })
  applyCookies(response)
  return response
}

export async function reorderCategories(request: NextRequest) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    console.error('category reorder parse error:', error)
    return jsonError('Invalid payload.', 400)
  }

  const parsed = reorderCategoriesSchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError('Invalid reorder payload.', 400)
  }

  const { updates } = parsed.data
  const seen = new Set<string>()
  for (const update of updates) {
    if (seen.has(update.id)) {
      return jsonError('Duplicate category id in reorder payload.', 400)
    }
    seen.add(update.id)
    if (update.parent_id === update.id) {
      return jsonError('Category cannot be its own parent.', 400)
    }
  }

  for (const update of updates) {
    const { error } = await supabase
      .from(TABLE)
      .update({ parent_id: update.parent_id, sort_order: update.sort_order })
      .eq('id', update.id)
    if (error) {
      const errorCode = (error as { code?: string })?.code
      console.error('category reorder failed:', error.message)
      if (errorCode === '42P01') {
        return jsonError(buildMissingTableMessage(), 500)
      }
      return jsonError('Unable to reorder categories.', 500)
    }
  }

  const response = jsonOk({ updated: updates.length })
  applyCookies(response)
  return response
}
