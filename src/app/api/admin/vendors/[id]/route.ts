import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { DEFAULT_VENDOR_VERIFIED_BADGE_PATH } from '@/lib/catalog/vendor-verification'
import { countBrandFollowers } from '@/lib/catalog/brand-following'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const patchSchema = z.object({
  use_custom_profile_metrics: z.boolean().optional(),
  custom_profile_followers: z.coerce.number().int().min(0).max(100000000).optional(),
  custom_profile_sold: z.coerce.number().int().min(0).max(100000000).optional(),
  is_trusted_vendor: z.boolean().optional(),
  require_product_review_for_publish: z.boolean().optional(),
})

const productSelect =
  'id, name, slug, price, discount_price, stock_quantity, status, created_at, updated_at'

type ProductRow = {
  id?: string
  name?: string
  slug?: string
  price?: number
  discount_price?: number | null
  stock_quantity?: number
  status?: string
  created_at?: string
  updated_at?: string
}

const normalizeProducts = (items: ProductRow[] = []) =>
  items.map((item) => ({
    id: String(item?.id || ''),
    name: String(item?.name || ''),
    slug: String(item?.slug || ''),
    price: Number(item?.price) || 0,
    discount_price:
      item?.discount_price === null || item?.discount_price === undefined
        ? null
        : Number(item.discount_price),
    stock_quantity: Math.max(0, Number(item?.stock_quantity) || 0),
    status: String(item?.status || 'draft'),
    created_at: item?.created_at || null,
    updated_at: item?.updated_at || null,
  }))

type RouteContext = { params: Promise<{ id: string }> }

const loadVendorWorkspace = async (vendorId: string) => {
  const adminDb = createAdminSupabaseClient()

  const [{ data: roleRow }, userResult, { data: brandRow, error: brandError }] = await Promise.all([
    adminDb.from('user_roles').select('role').eq('user_id', vendorId).maybeSingle(),
    adminDb.auth.admin.getUserById(vendorId),
    adminDb
      .from('admin_brands')
      .select(
        'id, name, slug, description, logo_url, created_at, created_by, use_custom_profile_metrics, custom_profile_followers, custom_profile_sold, is_trusted_vendor, trusted_badge_url, require_product_review_for_publish',
      )
      .eq('created_by', vendorId)
      .maybeSingle(),
  ])

  if (brandError) {
    if (String((brandError as any)?.code || '') === '42703') {
      return {
        error: jsonError(
          'Vendor control columns are missing. Apply supabase/sql/061_admin_brand_vendor_controls.sql and supabase/sql/062_admin_brand_publish_review_gate.sql.',
          500,
        ),
        apply: null as any,
      }
    }
    console.error('admin vendor brand lookup failed:', brandError.message)
  }

  const role = String(roleRow?.role || '').toLowerCase()
  const user = userResult?.data?.user || null
  if (!user?.id) {
    return { error: jsonError('Vendor not found.', 404), apply: null as any }
  }

  if (role !== 'vendor' && role !== 'customer' && !brandRow?.id) {
    return { error: jsonError('Vendor not found.', 404), apply: null as any }
  }

  const brandId = String(brandRow?.id || '').trim()
  const brandIds = brandId ? [brandId] : []

  const [
    ownProductsResult,
    ownProductCountResult,
    brandLinkedIdsResult,
    brandLinkedCountResult,
    mediaResult,
  ] = await Promise.all([
    adminDb
      .from('products')
      .select(productSelect)
      .eq('created_by', vendorId)
      .order('created_at', { ascending: false })
      .limit(30),
    adminDb
      .from('products')
      .select('id', { head: true, count: 'exact' })
      .eq('created_by', vendorId),
    brandIds.length
      ? adminDb.from('product_brand_links').select('product_id').in('brand_id', brandIds)
      : Promise.resolve({ data: [], error: null } as any),
    brandIds.length
      ? adminDb
          .from('product_brand_links')
          .select('product_id', { head: true, count: 'exact' })
          .in('brand_id', brandIds)
      : Promise.resolve({ count: 0, error: null } as any),
    adminDb
      .from('product_images')
      .select('id, product_id, url, alt_text, created_at')
      .eq('created_by', vendorId)
      .order('created_at', { ascending: false })
      .limit(24),
  ])

  if (ownProductsResult.error) {
    const code = String((ownProductsResult.error as any)?.code || '')
    if (code === '42703') {
      return {
        error: jsonError(
          'products.created_by column not found. Run migration 042_vendor_access.sql.',
          500,
        ),
        apply: null as any,
      }
    }
    console.error('admin vendor own products lookup failed:', ownProductsResult.error.message)
  }

  const brandLinkedProductIds = Array.from(
    new Set(
      (Array.isArray(brandLinkedIdsResult.data) ? brandLinkedIdsResult.data : [])
        .map((row: any) => String(row?.product_id || '').trim())
        .filter(Boolean),
    ),
  )

  const brandProductsResult = brandLinkedProductIds.length
    ? await adminDb
        .from('products')
        .select(productSelect)
        .in('id', brandLinkedProductIds)
        .order('created_at', { ascending: false })
        .limit(30)
    : ({ data: [], error: null } as any)

  if (brandProductsResult.error) {
    console.error('admin vendor brand products lookup failed:', brandProductsResult.error.message)
  }
  if (mediaResult.error) {
    const code = String((mediaResult.error as any)?.code || '')
    if (code === '42703') {
      return {
        error: jsonError(
          'product_images.created_by column not found. Run migration 042_vendor_access.sql.',
          500,
        ),
        apply: null as any,
      }
    }
    console.error('admin vendor media lookup failed:', mediaResult.error.message)
  }

  if (ownProductCountResult.error) {
    console.error('admin vendor own product count failed:', ownProductCountResult.error.message)
  }
  if (brandLinkedCountResult.error) {
    console.error('admin vendor linked product count failed:', brandLinkedCountResult.error.message)
  }

  const mergedProductsById = new Map<string, ProductRow>()
  ;[...(ownProductsResult.data || []), ...(brandProductsResult.data || [])].forEach((item: any) => {
    const id = String(item?.id || '').trim()
    if (!id || mergedProductsById.has(id)) return
    mergedProductsById.set(id, item)
  })

  const products = normalizeProducts(Array.from(mergedProductsById.values()))
    .sort((a, b) => {
      const aTs = new Date(a.created_at || 0).getTime()
      const bTs = new Date(b.created_at || 0).getTime()
      return bTs - aTs
    })
    .slice(0, 30)

  const realFollowers = brandId ? await countBrandFollowers(brandId) : 0
  const ownProductCount = Math.max(0, Number(ownProductCountResult.count) || 0)
  const linkedProductCount = Math.max(0, Number(brandLinkedCountResult.count) || 0)
  const realProductCount = Math.max(ownProductCount, linkedProductCount)
  const realSold = Math.max(realProductCount * 15, Math.round(realFollowers * 0.42))

  return {
    error: null,
    payload: {
      vendor: {
        id: String(user.id),
        email: String(user.email || ''),
        full_name: String(user.user_metadata?.full_name || '').trim(),
        created_at: user.created_at || null,
        role: role === 'vendor' ? 'vendor' : 'customer',
        access_state: role === 'vendor' ? 'active' : 'deactivated',
        brand: brandRow
          ? {
              id: String(brandRow.id || ''),
              name: String(brandRow.name || ''),
              slug: String(brandRow.slug || ''),
              description: String(brandRow.description || ''),
              logo_url: String(brandRow.logo_url || ''),
              created_at: brandRow.created_at || null,
              use_custom_profile_metrics: Boolean(brandRow.use_custom_profile_metrics),
              custom_profile_followers: Math.max(0, Number(brandRow.custom_profile_followers) || 0),
              custom_profile_sold: Math.max(0, Number(brandRow.custom_profile_sold) || 0),
              is_trusted_vendor: Boolean(brandRow.is_trusted_vendor),
              trusted_badge_url: String(brandRow.trusted_badge_url || '').trim() || DEFAULT_VENDOR_VERIFIED_BADGE_PATH,
              require_product_review_for_publish: Boolean(brandRow.require_product_review_for_publish),
              real_profile_followers: realFollowers,
              real_profile_sold: realSold,
              real_profile_products: realProductCount,
            }
          : null,
      },
      products,
      media: (Array.isArray(mediaResult.data) ? mediaResult.data : []).map((item: any) => ({
        id: String(item?.id || ''),
        product_id: item?.product_id ? String(item.product_id) : null,
        url: String(item?.url || ''),
        alt_text: String(item?.alt_text || ''),
        created_at: item?.created_at || null,
      })),
    },
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { isAdmin, applyCookies } = await requireAdmin(request)
  if (!isAdmin) return jsonError('Forbidden.', 403)

  const params = await context.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) return jsonError('Invalid vendor id.', 400)

  const result = await loadVendorWorkspace(parsed.data.id)
  if (result.error) return result.error

  const response = jsonOk(result.payload)
  applyCookies(response)
  return response
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { isAdmin, applyCookies } = await requireAdmin(request)
  if (!isAdmin) return jsonError('Forbidden.', 403)

  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) return jsonError('Invalid vendor id.', 400)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid payload.', 400)
  }
  const parsedBody = patchSchema.safeParse(body)
  if (!parsedBody.success) {
    return jsonError(parsedBody.error.issues[0]?.message || 'Invalid settings payload.', 400)
  }

  const adminDb = createAdminSupabaseClient()
  const { data: brandRow, error: brandError } = await adminDb
    .from('admin_brands')
    .select('id')
    .eq('created_by', parsedParams.data.id)
    .maybeSingle()
  if (brandError) {
    console.error('admin vendor settings brand lookup failed:', brandError.message)
    return jsonError('Unable to load vendor brand.', 500)
  }
  if (!brandRow?.id) {
    return jsonError('Vendor brand not found.', 404)
  }

  const updates: Record<string, unknown> = {}
  if (parsedBody.data.use_custom_profile_metrics !== undefined) {
    updates.use_custom_profile_metrics = parsedBody.data.use_custom_profile_metrics
  }
  if (parsedBody.data.custom_profile_followers !== undefined) {
    updates.custom_profile_followers = parsedBody.data.custom_profile_followers
  }
  if (parsedBody.data.custom_profile_sold !== undefined) {
    updates.custom_profile_sold = parsedBody.data.custom_profile_sold
  }
  if (parsedBody.data.is_trusted_vendor !== undefined) {
    updates.is_trusted_vendor = parsedBody.data.is_trusted_vendor
    updates.trusted_badge_url = parsedBody.data.is_trusted_vendor
      ? DEFAULT_VENDOR_VERIFIED_BADGE_PATH
      : null
  }
  if (parsedBody.data.require_product_review_for_publish !== undefined) {
    updates.require_product_review_for_publish = parsedBody.data.require_product_review_for_publish
  }
  if (!Object.keys(updates).length) {
    return jsonError('No settings changes were provided.', 400)
  }

  const { error: updateError } = await adminDb
    .from('admin_brands')
    .update(updates)
    .eq('id', brandRow.id)
  if (updateError) {
    if (String((updateError as any)?.code || '') === '42703') {
      return jsonError(
        'Vendor control columns are missing. Apply supabase/sql/061_admin_brand_vendor_controls.sql and supabase/sql/062_admin_brand_publish_review_gate.sql.',
        500,
      )
    }
    console.error('admin vendor settings update failed:', updateError.message)
    return jsonError('Unable to save vendor settings.', 500)
  }

  const response = jsonOk({ success: true })
  applyCookies(response)
  return response
}
