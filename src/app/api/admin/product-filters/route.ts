import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'

const querySchema = z.object({
  status: z.enum(['publish', 'draft', 'archived']).default('publish'),
})

const CATEGORY_LINKS = 'product_category_links'
const TAG_LINKS = 'product_tag_links'

export async function GET(request: NextRequest) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const parseResult = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parseResult.success) {
    return jsonError('Invalid query.', 400)
  }

  const { status } = parseResult.data

  const [categoryRes, tagRes] = await Promise.all([
    supabase
      .from(CATEGORY_LINKS)
      .select('category_id, products!inner(status)')
      .eq('products.status', status),
    supabase
      .from(TAG_LINKS)
      .select('tag_id, products!inner(status)')
      .eq('products.status', status),
  ])

  if (categoryRes.error) {
    console.error('category filter query failed:', categoryRes.error.message)
    return jsonError('Unable to load category filters.', 500)
  }
  if (tagRes.error) {
    console.error('tag filter query failed:', tagRes.error.message)
    return jsonError('Unable to load tag filters.', 500)
  }

  const categoryCounts = new Map<string, number>()
  const tagCounts = new Map<string, number>()

  ;(categoryRes.data || []).forEach((row: { category_id?: string | null }) => {
    if (!row?.category_id) return
    categoryCounts.set(row.category_id, (categoryCounts.get(row.category_id) || 0) + 1)
  })

  ;(tagRes.data || []).forEach((row: { tag_id?: string | null }) => {
    if (!row?.tag_id) return
    tagCounts.set(row.tag_id, (tagCounts.get(row.tag_id) || 0) + 1)
  })

  const response = jsonOk({
    category_ids: Array.from(categoryCounts.keys()),
    tag_ids: Array.from(tagCounts.keys()),
    category_counts: Object.fromEntries(categoryCounts),
    tag_counts: Object.fromEntries(tagCounts),
  })
  applyCookies(response)
  return response
}
