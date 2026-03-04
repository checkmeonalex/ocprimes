import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { getUserRoleSafe } from '@/lib/auth/roles'
import { resolveBrandDisplayedFollowers, resolveBrandIdentity } from '@/lib/catalog/brand-following'
import { createNotifications } from '@/lib/admin/notifications'

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

const getUserAlias = (email: unknown) => {
  const safeEmail = String(email || '').trim().toLowerCase()
  if (!safeEmail) return ''
  const [alias] = safeEmail.split('@')
  return alias || ''
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
  let db: any = supabase
  try {
    db = createAdminSupabaseClient()
  } catch {
    db = supabase
  }
  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user || null
  const role = user?.id ? await getUserRoleSafe(supabase, user.id) : 'guest'
  const { data: brandOwnerData, error: brandOwnerError } = await db
    .from('admin_brands')
    .select('created_by')
    .eq('id', brand.id)
    .maybeSingle()
  if (brandOwnerError && brandOwnerError.code !== '42P01') {
    console.error('vendor follow brand owner lookup failed:', brandOwnerError.message)
  }
  const brandOwnerUserId = String(brandOwnerData?.created_by || '').trim()

  let isFollowing = false
  if (user?.id) {
    const { data, error } = await db
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
    db,
    brand,
    user,
    role,
    brandOwnerUserId,
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
    can_follow: Boolean(snapshot.user?.id),
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

  if (snapshot.isFollowing) {
    const followers = await resolveBrandDisplayedFollowers(String(snapshot.brand.id))
    const response = jsonOk({
      followers,
      is_following: true,
      can_follow: true,
    })
    snapshot.applyCookies?.(response)
    return response
  }

  const { error } = await snapshot.db.from('customer_vendor_follows').insert({
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

  try {
    let notificationDb: any = snapshot.db
    try {
      notificationDb = createAdminSupabaseClient()
    } catch {
      notificationDb = snapshot.db
    }

    const brandName = String(snapshot.brand?.name || 'this store').trim() || 'this store'
    const followerAlias = getUserAlias(snapshot.user?.email)
    const followerLabel = followerAlias || 'A customer'
    const followerUserId = String(snapshot.user?.id || '').trim()
    const brandOwnerUserId = String(snapshot.brandOwnerUserId || '').trim()

    const payloads: Array<{
      recipient_user_id: string
      recipient_role: 'customer' | 'vendor'
      title: string
      message: string
      type: string
      severity: 'success' | 'info'
      entity_type: string
      entity_id: string
      metadata: Record<string, unknown>
      created_by: string | null
    }> = [
      {
        recipient_user_id: followerUserId,
        recipient_role: 'customer',
        title: 'Store followed',
        message: `You started following ${brandName}.`,
        type: 'store_followed',
        severity: 'success',
        entity_type: 'brand',
        entity_id: String(snapshot.brand?.id || ''),
        metadata: {
          brand_id: String(snapshot.brand?.id || ''),
          brand_name: brandName,
          brand_slug: String(snapshot.brand?.slug || ''),
          action_url: '/UserBackend/followed-stores',
        },
        created_by: followerUserId || null,
      },
    ]

    if (brandOwnerUserId && brandOwnerUserId !== followerUserId) {
      payloads.push({
        recipient_user_id: brandOwnerUserId,
        recipient_role: 'vendor',
        title: 'New store follower',
        message: `${followerLabel} started following your store ${brandName}.`,
        type: 'store_new_follower',
        severity: 'info',
        entity_type: 'brand',
        entity_id: String(snapshot.brand?.id || ''),
        metadata: {
          brand_id: String(snapshot.brand?.id || ''),
          brand_name: brandName,
          brand_slug: String(snapshot.brand?.slug || ''),
          follower_user_id: followerUserId,
          action_url: '/backend/admin/dashboard',
        },
        created_by: followerUserId || null,
      })
    }

    await createNotifications(notificationDb, payloads)
  } catch (notificationError: any) {
    console.error('vendor follow notifications failed:', notificationError?.message || notificationError)
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

  const { error } = await snapshot.db
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
