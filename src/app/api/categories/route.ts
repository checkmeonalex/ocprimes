import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { buildCategoryTree, mapCategoryTreeToMenu } from '@/lib/categories/tree.mjs'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

  const tree = buildCategoryTree(data ?? [])
  const categories = mapCategoryTreeToMenu(tree)

  const response = jsonOk({ categories })
  response.headers.set('Cache-Control', 'no-store, max-age=0')
  applyCookies(response)
  return response
}
