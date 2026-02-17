import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const normalizeBrandLookup = (value: string) => {
  const trimmed = String(value || '').trim()
  const normalizedSlug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  const readableName = trimmed
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return { trimmed, normalizedSlug, readableName }
}

const createBrandIdentityQuery = (supabase: any) =>
  supabase.from('admin_brands').select('id, name, slug').limit(1)

const withAdminFallback = async <T>(action: (supabase: any) => Promise<T>) => {
  try {
    const admin = createAdminSupabaseClient()
    return await action(admin)
  } catch {
    const server = await createServerSupabaseClient()
    return await action(server)
  }
}

export const resolveBrandIdentity = async (lookup: string) => {
  const { trimmed, normalizedSlug, readableName } = normalizeBrandLookup(lookup)
  if (!trimmed) return null

  return withAdminFallback(async (supabase) => {
    const bySlug = await createBrandIdentityQuery(supabase).eq('slug', trimmed).maybeSingle()
    if (bySlug.data?.id) return bySlug.data

    if (normalizedSlug && normalizedSlug !== trimmed) {
      const byNormalizedSlug = await createBrandIdentityQuery(supabase)
        .eq('slug', normalizedSlug)
        .maybeSingle()
      if (byNormalizedSlug.data?.id) return byNormalizedSlug.data
    }

    const byId = await createBrandIdentityQuery(supabase).eq('id', trimmed).maybeSingle()
    if (byId.data?.id) return byId.data

    if (!readableName) return null
    const byName = await createBrandIdentityQuery(supabase).ilike('name', readableName).maybeSingle()
    return byName.data?.id ? byName.data : null
  })
}

export const fetchBrandsByIds = async (ids: string[]) => {
  const cleanIds = Array.from(
    new Set(
      (Array.isArray(ids) ? ids : [])
        .map((id) => String(id || '').trim())
        .filter(Boolean),
    ),
  )
  if (!cleanIds.length) return []

  return withAdminFallback(async (supabase) => {
    const { data, error } = await supabase
      .from('admin_brands')
      .select('id, name, slug, logo_url')
      .in('id', cleanIds)
    if (error) {
      console.error('followed stores brand lookup failed:', error.message)
      return []
    }
    return Array.isArray(data) ? data : []
  })
}

export const countBrandFollowers = async (brandId: string) => {
  const cleanBrandId = String(brandId || '').trim()
  if (!cleanBrandId) return 0

  return withAdminFallback(async (supabase) => {
    const { count, error } = await supabase
      .from('customer_vendor_follows')
      .select('brand_id', { head: true, count: 'exact' })
      .eq('brand_id', cleanBrandId)

    if (error) {
      if (error.code !== '42P01') {
        console.error('brand followers count failed:', error.message)
      }
      return 0
    }

    return Math.max(0, Number(count) || 0)
  })
}

export const resolveBrandDisplayedFollowers = async (brandId: string) => {
  const cleanBrandId = String(brandId || '').trim()
  if (!cleanBrandId) return 0

  const custom = await withAdminFallback(async (supabase) => {
    const { data, error } = await supabase
      .from('admin_brands')
      .select('use_custom_profile_metrics, custom_profile_followers')
      .eq('id', cleanBrandId)
      .maybeSingle()
    if (error) {
      if (error.code !== '42703') {
        console.error('brand custom followers lookup failed:', error.message)
      }
      return null
    }
    if (!data?.use_custom_profile_metrics) return null
    return Math.max(0, Number(data?.custom_profile_followers) || 0)
  })

  if (typeof custom === 'number') return custom
  return countBrandFollowers(cleanBrandId)
}

export const countBrandFollowersMap = async (brandIds: string[]) => {
  const cleanIds = Array.from(
    new Set(
      (Array.isArray(brandIds) ? brandIds : [])
        .map((id) => String(id || '').trim())
        .filter(Boolean),
    ),
  )
  if (!cleanIds.length) return new Map()

  return withAdminFallback(async (supabase) => {
    const { data, error } = await supabase
      .from('customer_vendor_follows')
      .select('brand_id')
      .in('brand_id', cleanIds)

    if (error) {
      if (error.code !== '42P01') {
        console.error('brand followers list failed:', error.message)
      }
      return new Map()
    }

    const counts = new Map<string, number>()
    ;(Array.isArray(data) ? data : []).forEach((row: any) => {
      const key = String(row?.brand_id || '').trim()
      if (!key) return
      counts.set(key, (counts.get(key) || 0) + 1)
    })
    return counts
  })
}
