import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { vendorOnboardingSubmitSchema } from '@/lib/auth/validation'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'
import { ACCEPTED_COUNTRY_SET } from '@/lib/user/accepted-countries'
import { buildSlug } from '@/lib/admin/taxonomy'
import { provisionVendorAccess } from '@/lib/auth/vendor-access'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = vendorOnboardingSubmitSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Invalid vendor request details.', 400)
  }

  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return jsonError('You must verify your email first.', 401)
  }

  const user = data.user
  const roleInfo = await getUserRoleInfoSafe(supabase, user.id, user.email || '')
  if (roleInfo.isAdmin || roleInfo.isVendor) {
    return jsonError('Your account already has dashboard access.', 409)
  }

  const shippingCountry = parsed.data.shippingCountry.trim()
  if (!ACCEPTED_COUNTRY_SET.has(shippingCountry)) {
    return jsonError('Unsupported shipping country.', 400)
  }

  const brandName = parsed.data.brandName.trim()
  const brandSlug = buildSlug(brandName)
  if (!brandSlug) {
    return jsonError('Invalid brand name.', 400)
  }

  const adminClient = createAdminSupabaseClient()
  const [{ data: existingBrand }, { data: existingBrandRequest }] = await Promise.all([
    adminClient.from('admin_brands').select('id').eq('slug', brandSlug).maybeSingle(),
    adminClient
      .from('vendor_requests')
      .select('id,status,user_id')
      .eq('brand_slug', brandSlug)
      .in('status', ['approved'])
      .maybeSingle(),
  ])

  if (existingBrand?.id) {
    return jsonError('Brand name already exists. Choose another one.', 409)
  }
  if (existingBrandRequest?.id && existingBrandRequest.user_id !== user.id) {
    return jsonError('Brand name is already under review. Choose another one.', 409)
  }

  const { data: existingByUser, error: existingByUserError } = await adminClient
    .from('vendor_requests')
    .select('id,status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingByUserError) {
    console.error('Vendor request lookup failed:', existingByUserError.message)
    return jsonError('Unable to submit vendor request.', 500)
  }

  if (existingByUser?.status === 'approved') {
    return jsonError('Your vendor request was already approved.', 409)
  }

  try {
    await provisionVendorAccess(adminClient, user.id, brandName, brandSlug)
  } catch (error: any) {
    return jsonError(error?.message || 'Unable to enable vendor access.', 500)
  }

  const nowIso = new Date().toISOString()
  const payload = {
    user_id: user.id,
    email: user.email || '',
    full_name: parsed.data.fullName.trim(),
    phone: parsed.data.phone.trim(),
    brand_name: brandName,
    brand_slug: brandSlug,
    shipping_country: shippingCountry,
    status: 'approved',
    requested_at: nowIso,
    reviewed_at: nowIso,
    reviewed_by: user.id,
    review_note: 'Auto-approved via vendor self-signup.',
  }

  const { error: requestPersistError } = await adminClient
    .from('vendor_requests')
    .upsert(payload, { onConflict: 'user_id' })

  if (requestPersistError) {
    console.error('Vendor request persist failed:', requestPersistError.message)
    return jsonError('Vendor enabled but request history could not be saved.', 500)
  }

  await supabase.auth.updateUser({
    data: {
      full_name: parsed.data.fullName.trim(),
      phone: parsed.data.phone.trim(),
      shipping_country: shippingCountry,
      brand_name: brandName,
      vendor_request_status: 'approved',
      vendor_enabled_at: nowIso,
    },
  })

  const response = jsonOk({ submitted: true, status: 'approved', vendorEnabled: true })
  applyCookies(response)
  return response
}
