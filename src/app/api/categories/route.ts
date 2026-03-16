import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { buildCategoryTree, mapCategoryTreeToMenu } from '@/lib/categories/tree.mjs'

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
