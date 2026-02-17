import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { getUserRoleSafe } from '@/lib/auth/roles'
import { resolveBrandDisplayedFollowers, resolveBrandIdentity } from '@/lib/catalog/brand-following'

const slugSchema = z
  .string()
  .trim()
  .min(1, 'Vendor slug is required.')
  .max(120, 'Vendor slug is too long.')

const resolveSlug = async (context: { params: Promise<{ slug: string }> }) => {
  const params = await context.params
  const parsed = slugSchema.safeParse(params?.slug)
  if (!parsed.success) return null
  return parsed.data
}

const buildSnapshot = async (
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) => {
  const vendorLookup = await resolveSlug(context)
  if (!vendorLookup) {
    return { response: jsonError('Invalid vendor.', 400), applyCookies: null, brand: null, supabase: null }
  }

  const brand = await resolveBrandIdentity(vendorLookup)
  if (!brand?.id) {
    return { response: jsonError('Vendor not found.', 404), applyCookies: null, brand: null, supabase: null }
  }

  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user || null
  const role = user?.id ? await getUserRoleSafe(supabase, user.id) : 'guest'

  let isFollowing = false
  if (user?.id && role === 'customer') {
    const { data, error } = await supabase
      .from('customer_vendor_follows')
      .select('brand_id')
      .eq('customer_user_id', user.id)
      .eq('brand_id', brand.id)
      .maybeSingle()

    if (error && error.code !== '42P01') {
      console.error('vendor follow status load failed:', error.message)
    }
    isFollowing = Boolean(data?.brand_id)
  }

  const followers = await resolveBrandDisplayedFollowers(String(brand.id))
  return {
    response: null,
    supabase,
    applyCookies,
    brand,
    user,
    role,
    isFollowing,
    followers,
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const snapshot = await buildSnapshot(request, context)
  if (snapshot.response) return snapshot.response

  const response = jsonOk({
    brand: {
      id: String(snapshot.brand.id),
      name: String(snapshot.brand.name || ''),
      slug: String(snapshot.brand.slug || ''),
    },
    followers: snapshot.followers,
    is_following: snapshot.isFollowing,
    can_follow: snapshot.role === 'customer',
  })
  snapshot.applyCookies?.(response)
  return response
}

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const snapshot = await buildSnapshot(request, context)
  if (snapshot.response) return snapshot.response

  if (!snapshot.user?.id) {
    const response = jsonError('You must be signed in.', 401)
    snapshot.applyCookies?.(response)
    return response
  }
  if (snapshot.role !== 'customer') {
    const response = jsonError('Only customer accounts can follow vendors.', 403)
    snapshot.applyCookies?.(response)
    return response
  }

  const { error } = await snapshot.supabase.from('customer_vendor_follows').insert({
    customer_user_id: snapshot.user.id,
    brand_id: snapshot.brand.id,
  })

  if (error && error.code !== '23505' && error.code !== '42P01') {
    console.error('vendor follow insert failed:', error.message)
    const response = jsonError('Unable to follow vendor.', 500)
    snapshot.applyCookies?.(response)
    return response
  }
  if (error?.code === '42P01') {
    const response = jsonError(
      'Follow tables are missing. Apply supabase/sql/060_customer_vendor_follows.sql.',
      500,
    )
    snapshot.applyCookies?.(response)
    return response
  }

  const followers = await resolveBrandDisplayedFollowers(String(snapshot.brand.id))
  const response = jsonOk({
    followers,
    is_following: true,
    can_follow: true,
  })
  snapshot.applyCookies?.(response)
  return response
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const snapshot = await buildSnapshot(request, context)
  if (snapshot.response) return snapshot.response

  if (!snapshot.user?.id) {
    const response = jsonError('You must be signed in.', 401)
    snapshot.applyCookies?.(response)
    return response
  }
  if (snapshot.role !== 'customer') {
    const response = jsonError('Only customer accounts can unfollow vendors.', 403)
    snapshot.applyCookies?.(response)
    return response
  }

  const { error } = await snapshot.supabase
    .from('customer_vendor_follows')
    .delete()
    .eq('customer_user_id', snapshot.user.id)
    .eq('brand_id', snapshot.brand.id)

  if (error && error.code !== '42P01') {
    console.error('vendor unfollow delete failed:', error.message)
    const response = jsonError('Unable to unfollow vendor.', 500)
    snapshot.applyCookies?.(response)
    return response
  }
  if (error?.code === '42P01') {
    const response = jsonError(
      'Follow tables are missing. Apply supabase/sql/060_customer_vendor_follows.sql.',
      500,
    )
    snapshot.applyCookies?.(response)
    return response
  }

  const followers = await resolveBrandDisplayedFollowers(String(snapshot.brand.id))
  const response = jsonOk({
    followers,
    is_following: false,
    can_follow: true,
  })
  snapshot.applyCookies?.(response)
  return response
}
