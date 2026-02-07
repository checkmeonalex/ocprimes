import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  filter: z.enum(['all', 'stale']).default('all'),
  stale_days: z.coerce.number().int().min(1).max(3650).default(180),
})

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

  const { page, per_page, filter, stale_days } = parseResult.data
  const from = (page - 1) * per_page
  const to = from + per_page - 1

  let query = supabase
    .from('component_images')
    .select('id, r2_key, url, alt_text, created_at')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filter === 'stale') {
    const cutoff = new Date(Date.now() - stale_days * 24 * 60 * 60 * 1000).toISOString()
    query = query.lt('created_at', cutoff)
  }

  const { data, error } = await query

  if (error) {
    const errorCode = (error as { code?: string })?.code
    console.error('Component media list failed:', error.message)
    if (errorCode === '42P01') {
      return jsonError('Media table not found. Run migration 018_component_images.sql.', 500)
    }
    return jsonError('Unable to load media.', 500)
  }

  let countQuery = supabase.from('component_images').select('id', { count: 'exact', head: true })
  if (filter === 'stale') {
    const cutoff = new Date(Date.now() - stale_days * 24 * 60 * 60 * 1000).toISOString()
    countQuery = countQuery.lt('created_at', cutoff)
  }

  let totalCount = 0
  try {
    const { count, error: countError } = await countQuery
    if (countError) {
      console.error('Component media count failed:', countError.message)
    } else {
      totalCount = count ?? 0
    }
  } catch (countErr) {
    console.error('Component media count failed:', countErr)
  }

  const pages = totalCount
    ? Math.max(1, Math.ceil(totalCount / per_page))
    : data && data.length === per_page
      ? page + 1
      : page

  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL || ''
  const normalizedPublicBase = publicBaseUrl.replace(/\/+$/, '')

  const items = (data ?? []).map((item) => {
    const resolvedUrl =
      normalizedPublicBase && item?.r2_key
        ? `${normalizedPublicBase}/${item.r2_key}`
        : item?.url
    return {
      ...item,
      url: resolvedUrl,
      title: item?.alt_text || 'Media',
      unattached: true,
      is_stale:
        filter === 'stale'
          ? true
          : new Date(item?.created_at || Date.now()).getTime() <
            Date.now() - stale_days * 24 * 60 * 60 * 1000,
    }
  })

  const response = jsonOk({ items, pages, page, total_count: totalCount || null })
  applyCookies(response)
  return response
}
