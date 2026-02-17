import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { getUserRoleSafe } from '@/lib/auth/roles'
import { countBrandFollowersMap, fetchBrandsByIds } from '@/lib/catalog/brand-following'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(40).default(20),
})

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return jsonError('You must be signed in.', 401)
  }

  const role = await getUserRoleSafe(supabase, data.user.id)
  if (role !== 'customer') {
    return jsonError('Only customer accounts can view followed stores.', 403)
  }

  const params = querySchema.safeParse({
    page: request.nextUrl.searchParams.get('page') || 1,
    per_page: request.nextUrl.searchParams.get('per_page') || 20,
  })
  if (!params.success) {
    return jsonError(params.error.issues[0]?.message || 'Invalid query params.', 400)
  }

  const { page, per_page } = params.data
  const from = (page - 1) * per_page
  const to = from + per_page - 1

  const { data: followRows, error: followError, count } = await supabase
    .from('customer_vendor_follows')
    .select('brand_id,created_at', { count: 'exact' })
    .eq('customer_user_id', data.user.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (followError) {
    if (followError.code === '42P01') {
      return jsonError(
        'Follow tables are missing. Apply supabase/sql/060_customer_vendor_follows.sql.',
        500,
      )
    }
    console.error('followed stores fetch failed:', followError.message)
    return jsonError('Unable to load followed stores.', 500)
  }

  const rows = Array.isArray(followRows) ? followRows : []
  const brandIds = rows.map((row: any) => String(row?.brand_id || '').trim()).filter(Boolean)
  if (!brandIds.length) {
    const response = jsonOk({
      items: [],
      page,
      per_page,
      total: Math.max(0, Number(count) || 0),
    })
    applyCookies(response)
    return response
  }

  const [brands, followerCounts] = await Promise.all([
    fetchBrandsByIds(brandIds),
    countBrandFollowersMap(brandIds),
  ])

  const brandsById = new Map(
    brands.map((brand: any) => [String(brand?.id || ''), brand]),
  )

  const items = rows
    .map((row: any) => {
      const brandId = String(row?.brand_id || '').trim()
      const brand = brandsById.get(brandId)
      if (!brand?.id) return null
      return {
        brand_id: brandId,
        brand_name: String(brand?.name || ''),
        brand_slug: String(brand?.slug || ''),
        brand_logo_url: String(brand?.logo_url || ''),
        followed_at: row?.created_at || null,
        followers: Math.max(0, Number(followerCounts.get(brandId) || 0)),
      }
    })
    .filter(Boolean)

  const response = jsonOk({
    items,
    page,
    per_page,
    total: Math.max(0, Number(count) || 0),
  })
  applyCookies(response)
  return response
}
