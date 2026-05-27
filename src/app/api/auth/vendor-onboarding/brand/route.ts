import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { vendorOnboardingBrandSchema } from '@/lib/auth/validation'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { buildSlug } from '@/lib/admin/taxonomy'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = vendorOnboardingBrandSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Invalid brand name.', 400)
  }

  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return jsonError('You must verify your email first.', 401)
  }

  const brandName = parsed.data.brandName.trim()
  const brandSlug = buildSlug(brandName)
  if (!brandSlug) {
    return jsonError('Invalid brand name.', 400)
  }

  const adminClient = createAdminSupabaseClient()
  const [{ data: brand }, { data: requestHit }] = await Promise.all([
    adminClient.from('admin_brands').select('id').eq('slug', brandSlug).maybeSingle(),
    adminClient
      .from('vendor_requests')
      .select('id,status')
      .eq('brand_slug', brandSlug)
      .in('status', ['pending', 'approved'])
      .maybeSingle(),
  ])

  const available = !brand?.id && !requestHit?.id
  const response = jsonOk({
    available,
    brandSlug,
  })
  applyCookies(response)
  return response
}
