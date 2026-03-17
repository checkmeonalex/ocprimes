import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { buildCategoryTree, mapCategoryTreeToMenu } from '@/lib/categories/tree.mjs'
import {
  CATEGORY_AVAILABILITY_INTERESTS_TABLE,
  categoryInterestMutationSchema,
  toOptionalText,
} from '@/lib/catalog/category-interest'

const PRODUCT_CATEGORY_LINKS_TABLE = 'product_category_links'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(200),
})

export async function GET(request: NextRequest) {
  const { applyCookies } = createRouteHandlerSupabaseClient(request)
  const db = createAdminSupabaseClient()

  const parseResult = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parseResult.success) {
    return jsonError('Invalid query.', 400)
  }

  const { limit } = parseResult.data

  const { data, error } = await db
    .from('admin_categories')
    .select('id, name, slug, parent_id, sort_order, image_url, image_alt, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('public category list failed:', error.message)
    return jsonError('Unable to load categories.', 500)
  }

  const categoryRows = Array.isArray(data) ? data : []
  const categoryIds = categoryRows
    .map((item) => String(item?.id || '').trim())
    .filter(Boolean)
  const categoriesWithProducts = new Set<string>()

  if (categoryIds.length) {
    const { data: productLinkRows, error: productLinksError } = await db
      .from(PRODUCT_CATEGORY_LINKS_TABLE)
      .select('category_id')
      .in('category_id', categoryIds)

    if (productLinksError) {
      console.error('public category product links failed:', productLinksError.message)
    } else {
      ;(productLinkRows || []).forEach((row: { category_id?: string | null }) => {
        const categoryId = String(row?.category_id || '').trim()
        if (categoryId) categoriesWithProducts.add(categoryId)
      })
    }
  }

  const tree = buildCategoryTree(
    categoryRows.map((item) => ({
      ...item,
      has_products: categoriesWithProducts.has(String(item?.id || '').trim()),
    })),
  )
  const categories = mapCategoryTreeToMenu(tree)

  const response = jsonOk({ categories })
  response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400')
  applyCookies(response)
  return response
}

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)

  let payload: unknown = null
  try {
    payload = await request.json()
  } catch {
    return jsonError('Invalid request body.', 400)
  }

  const parsed = categoryInterestMutationSchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError('Invalid request body.', 400)
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    const response = jsonError('Unauthorized', 401)
    applyCookies(response)
    return response
  }

  const adminDb = createAdminSupabaseClient()
  const { categoryId } = parsed.data
  const { data: categoryRow, error: categoryError } = await adminDb
    .from('admin_categories')
    .select('id, name, slug, is_active')
    .eq('id', categoryId)
    .maybeSingle()

  if (categoryError) {
    console.error('category notify target lookup failed:', categoryError.message)
    const response = jsonError('Unable to save this request.', 500)
    applyCookies(response)
    return response
  }

  if (!categoryRow || categoryRow.is_active === false) {
    const response = jsonError('Category not found.', 404)
    applyCookies(response)
    return response
  }

  const categoryName = toOptionalText(categoryRow.name) || toOptionalText(parsed.data.categoryName) || 'Category'
  const categorySlug = toOptionalText(categoryRow.slug) || toOptionalText(parsed.data.categorySlug)

  const { data: existingRow, error: existingError } = await adminDb
    .from(CATEGORY_AVAILABILITY_INTERESTS_TABLE)
    .select('id')
    .eq('category_id', categoryId)
    .eq('requester_user_id', user.id)
    .maybeSingle()

  if (existingError) {
    console.error('category notify existing lookup failed:', existingError.message)
    const response = jsonError('Unable to save this request.', 500)
    applyCookies(response)
    return response
  }

  if (existingRow?.id) {
    const { error: refreshError } = await adminDb
      .from(CATEGORY_AVAILABILITY_INTERESTS_TABLE)
      .update({
        category_name: categoryName,
        category_slug: categorySlug,
      })
      .eq('id', existingRow.id)

    if (refreshError) {
      console.error('category notify refresh failed:', refreshError.message)
      const response = jsonError('Unable to save this request.', 500)
      applyCookies(response)
      return response
    }

    const response = jsonOk({ ok: true, alreadyRegistered: true })
    applyCookies(response)
    return response
  }

  const { error: insertError } = await adminDb.from(CATEGORY_AVAILABILITY_INTERESTS_TABLE).insert({
    category_id: categoryId,
    requester_user_id: user.id,
    category_name: categoryName,
    category_slug: categorySlug,
  })

  if (insertError) {
    console.error('category notify insert failed:', insertError.message)
    const response = jsonError('Unable to save this request.', 500)
    applyCookies(response)
    return response
  }

  const response = jsonOk({ ok: true, alreadyRegistered: false }, 201)
  applyCookies(response)
  return response
}
