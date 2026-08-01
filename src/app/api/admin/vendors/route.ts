import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().max(120).optional(),
})

export async function GET(request: NextRequest) {
  const { isAdmin } = await requireAdmin(request)
  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const parseResult = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parseResult.success) {
    return jsonError('Invalid query.', 400)
  }
  const { page, per_page, search } = parseResult.data
  const from = (page - 1) * per_page
  const to = from + per_page - 1

  const db = createAdminSupabaseClient()
  let query = db
    .from('admin_brands')
    .select('id, name, slug, created_by, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search) {
    const term = `%${search}%`
    query = query.or(`name.ilike.${term},slug.ilike.${term}`)
  }

  const { data, error, count } = await query
  if (error) {
    console.error('vendor list failed:', error.message)
    return jsonError('Unable to load vendors.', 500)
  }

  const items = (Array.isArray(data) ? data : []).map((row) => ({
    vendor_id: row.created_by,
    brand_id: row.id,
    name: row.name,
    slug: row.slug,
    created_at: row.created_at,
  }))

  return jsonOk({
    items,
    total_count: Number(count || 0),
    page,
    pages: Math.max(1, Math.ceil(Number(count || 0) / per_page)),
  })
}
