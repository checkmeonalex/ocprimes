import type { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import {
  buildSlug,
  categoryTreeQuerySchema,
  createCategorySchema,
  listCategoriesQuerySchema,
  reorderCategoriesSchema,
  updateCategorySchema,
} from '@/lib/admin/categories'
import { normalizeCategoryLayoutOrder } from '@/lib/layouts/category-layout'

const TABLE = 'admin_categories'

const buildMissingTableMessage = () =>
  'categories table not found. Run migration 010_admin_taxonomies.sql.'

export async function listCategories(request: NextRequest) {
  const { supabase, applyCookies, canManageCatalog, isAdmin } = await requireDashboardUser(request)

  if (!canManageCatalog) {
    return jsonError('Forbidden.', 403)
  }
  const db = isAdmin ? supabase : createAdminSupabaseClient()

  const parseResult = listCategoriesQuerySchema.safeParse(
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
    .select(
      'id, name, slug, description, parent_id, sort_order, image_url, image_alt, image_key, banner_image_url, banner_image_key, banner_image_secondary_url, banner_image_secondary_key, banner_slider_urls, banner_slider_keys, banner_slider_mobile_urls, banner_slider_mobile_keys, banner_slider_links, banner_title, banner_subtitle, banner_cta_text, banner_cta_link, featured_strip_image_url, featured_strip_image_key, featured_strip_tag_id, featured_strip_category_id, hotspot_title_main, featured_strip_title_main, browse_categories_title, home_catalog_title, home_catalog_description, home_catalog_filter_mode, home_catalog_category_id, home_catalog_tag_id, home_catalog_limit, layout_order, is_active, created_at, created_by',
    )
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
    let countQuery = db
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
  const { supabase, applyCookies, canManageCatalog, isAdmin } = await requireDashboardUser(request)

  if (!canManageCatalog) {
    return jsonError('Forbidden.', 403)
  }
  const db = isAdmin ? supabase : createAdminSupabaseClient()

  const parseResult = categoryTreeQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parseResult.success) {
    return jsonError('Invalid query.', 400)
  }

  const { limit, search } = parseResult.data

  let query = db
    .from(TABLE)
    .select(
      'id, name, slug, description, parent_id, sort_order, image_url, image_alt, image_key, banner_image_url, banner_image_key, banner_image_secondary_url, banner_image_secondary_key, banner_slider_urls, banner_slider_keys, banner_slider_mobile_urls, banner_slider_mobile_keys, banner_slider_links, banner_title, banner_subtitle, banner_cta_text, banner_cta_link, featured_strip_image_url, featured_strip_image_key, featured_strip_tag_id, featured_strip_category_id, hotspot_title_main, featured_strip_title_main, browse_categories_title, home_catalog_title, home_catalog_description, home_catalog_filter_mode, home_catalog_category_id, home_catalog_tag_id, home_catalog_limit, layout_order, is_active, created_at, created_by',
    )
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
    .select(
      'id, name, slug, description, parent_id, sort_order, image_url, image_alt, image_key, banner_image_url, banner_image_key, banner_image_secondary_url, banner_image_secondary_key, banner_slider_urls, banner_slider_keys, banner_slider_mobile_urls, banner_slider_mobile_keys, banner_slider_links, banner_title, banner_subtitle, banner_cta_text, banner_cta_link, featured_strip_image_url, featured_strip_image_key, featured_strip_tag_id, featured_strip_category_id, hotspot_title_main, featured_strip_title_main, browse_categories_title, home_catalog_title, home_catalog_description, home_catalog_filter_mode, home_catalog_category_id, home_catalog_tag_id, home_catalog_limit, layout_order, is_active, created_at, created_by',
    )
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

export async function updateCategory(request: NextRequest) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)

  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    console.error('category update parse error:', error)
    return jsonError('Invalid payload.', 400)
  }

  const parsed = updateCategorySchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError('Invalid category details.', 400)
  }

  const updates: Record<string, unknown> = {}
  if (parsed.data.name) {
    updates.name = parsed.data.name
  }
  if (parsed.data.slug || parsed.data.name) {
    const slugSource = parsed.data.slug || parsed.data.name || ''
    const slug = buildSlug(slugSource)
    if (!slug) {
      return jsonError('Invalid slug.', 400)
    }
    updates.slug = slug
  }
  if (parsed.data.description !== undefined) {
    updates.description = parsed.data.description
  }
  if (parsed.data.parent_id !== undefined) {
    updates.parent_id = parsed.data.parent_id
  }
  if (parsed.data.image_url !== undefined) {
    updates.image_url = parsed.data.image_url
  }
  if (parsed.data.image_alt !== undefined) {
    updates.image_alt = parsed.data.image_alt
  }
  if (parsed.data.image_key !== undefined) {
    updates.image_key = parsed.data.image_key
  }
  if (parsed.data.is_active !== undefined) {
    updates.is_active = parsed.data.is_active
  }
  if (parsed.data.banner_image_url !== undefined) updates.banner_image_url = parsed.data.banner_image_url
  if (parsed.data.banner_image_key !== undefined) updates.banner_image_key = parsed.data.banner_image_key
  if (parsed.data.banner_image_secondary_url !== undefined)
    updates.banner_image_secondary_url = parsed.data.banner_image_secondary_url
  if (parsed.data.banner_image_secondary_key !== undefined)
    updates.banner_image_secondary_key = parsed.data.banner_image_secondary_key
  if (parsed.data.banner_slider_urls !== undefined) updates.banner_slider_urls = parsed.data.banner_slider_urls
  if (parsed.data.banner_slider_keys !== undefined) updates.banner_slider_keys = parsed.data.banner_slider_keys
  if (parsed.data.banner_slider_mobile_urls !== undefined)
    updates.banner_slider_mobile_urls = parsed.data.banner_slider_mobile_urls
  if (parsed.data.banner_slider_mobile_keys !== undefined)
    updates.banner_slider_mobile_keys = parsed.data.banner_slider_mobile_keys
  if (parsed.data.banner_slider_links !== undefined) {
    updates.banner_slider_links = parsed.data.banner_slider_links
  }
  if (parsed.data.banner_title !== undefined) updates.banner_title = parsed.data.banner_title
  if (parsed.data.banner_subtitle !== undefined) updates.banner_subtitle = parsed.data.banner_subtitle
  if (parsed.data.banner_cta_text !== undefined) updates.banner_cta_text = parsed.data.banner_cta_text
  if (parsed.data.banner_cta_link !== undefined) updates.banner_cta_link = parsed.data.banner_cta_link
  if (parsed.data.hotspot_title_main !== undefined)
    updates.hotspot_title_main = parsed.data.hotspot_title_main
  if (parsed.data.featured_strip_title_main !== undefined)
    updates.featured_strip_title_main = parsed.data.featured_strip_title_main
  if (parsed.data.browse_categories_title !== undefined)
    updates.browse_categories_title = parsed.data.browse_categories_title
  if (parsed.data.home_catalog_title !== undefined)
    updates.home_catalog_title = parsed.data.home_catalog_title
  if (parsed.data.home_catalog_description !== undefined)
    updates.home_catalog_description = parsed.data.home_catalog_description
  if (parsed.data.home_catalog_filter_mode !== undefined)
    updates.home_catalog_filter_mode = parsed.data.home_catalog_filter_mode
  if (parsed.data.home_catalog_category_id !== undefined)
    updates.home_catalog_category_id = parsed.data.home_catalog_category_id
  if (parsed.data.home_catalog_tag_id !== undefined)
    updates.home_catalog_tag_id = parsed.data.home_catalog_tag_id
  if (parsed.data.home_catalog_limit !== undefined)
    updates.home_catalog_limit = parsed.data.home_catalog_limit
  if (parsed.data.featured_strip_image_url !== undefined)
    updates.featured_strip_image_url = parsed.data.featured_strip_image_url
  if (parsed.data.featured_strip_image_key !== undefined)
    updates.featured_strip_image_key = parsed.data.featured_strip_image_key
  if (parsed.data.featured_strip_tag_id !== undefined)
    updates.featured_strip_tag_id = parsed.data.featured_strip_tag_id
  if (parsed.data.featured_strip_category_id !== undefined)
    updates.featured_strip_category_id = parsed.data.featured_strip_category_id
  if (parsed.data.layout_order !== undefined) {
    updates.layout_order = normalizeCategoryLayoutOrder(parsed.data.layout_order)
  }

  if (Object.keys(updates).length === 0) {
    return jsonError('No updates provided.', 400)
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(updates)
    .eq('id', parsed.data.id)
    .select(
      'id, name, slug, description, parent_id, sort_order, image_url, image_alt, image_key, banner_image_url, banner_image_key, banner_slider_urls, banner_slider_keys, banner_slider_mobile_urls, banner_slider_mobile_keys, banner_slider_links, banner_title, banner_subtitle, banner_cta_text, banner_cta_link, featured_strip_image_url, featured_strip_image_key, featured_strip_tag_id, featured_strip_category_id, hotspot_title_main, featured_strip_title_main, browse_categories_title, home_catalog_title, home_catalog_description, home_catalog_filter_mode, home_catalog_category_id, home_catalog_tag_id, home_catalog_limit, layout_order, is_active, created_at, created_by',
    )
    .single()

  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('category update failed:', error.message)
    if (errorCode === '23505') {
      return jsonError('Slug already exists.', 409)
    }
    if (errorCode === '23503') {
      return jsonError('Parent category not found.', 400)
    }
    if (errorCode === '42P01') {
      return jsonError(buildMissingTableMessage(), 500)
    }
    return jsonError('Unable to update category.', 500)
  }

  const response = jsonOk({ item: data })
  applyCookies(response)
  return response
}
