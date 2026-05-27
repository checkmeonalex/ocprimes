import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
})

const SOURCE_WINDOW_CAP = 500
const MISSING_COLUMN_CODE = '42703'

const toMediaId = (key: string) =>
  Buffer.from(String(key || '').trim(), 'utf8').toString('base64url')

type ProductVideoRow = {
  id?: string | null
  product_id?: string | null
  r2_key?: string | null
  url?: string | null
  created_by?: string | null
  created_at?: string | null
}

type ProductRow = {
  id?: string | null
  name?: string | null
  slug?: string | null
  status?: string | null
  product_video_key?: string | null
  product_video_url?: string | null
  created_by?: string | null
  created_at?: string | null
}

type BrandLinkRow = {
  product_id?: string | null
  admin_brands?:
    | { name?: string | null; created_by?: string | null }
    | Array<{ name?: string | null; created_by?: string | null }>
}

const buildSellerMaps = async (
  adminDb: ReturnType<typeof createAdminSupabaseClient>,
  productIds: string[],
  ownerIds: string[],
) => {
  const sellerNameByProductId = new Map<string, string>()
  const profileNameByUserId = new Map<string, string>()

  if (productIds.length) {
    const { data: brandLinks, error: brandError } = await adminDb
      .from('product_brand_links')
      .select('product_id, admin_brands(name, created_by)')
      .in('product_id', productIds)

    if (brandError) {
      console.error('home story video brand links failed:', brandError.message)
    } else {
      ;((brandLinks || []) as BrandLinkRow[]).forEach((row) => {
        const productId = String(row?.product_id || '').trim()
        if (!productId || sellerNameByProductId.has(productId)) return
        const relation = row.admin_brands
        const brandName = Array.isArray(relation)
          ? String(relation[0]?.name || '').trim()
          : String(relation?.name || '').trim()
        if (brandName) {
          sellerNameByProductId.set(productId, brandName)
        }
      })
    }
  }

  if (ownerIds.length) {
    const { data: profiles, error: profileError } = await adminDb
      .from('profiles')
      .select('id, full_name')
      .in('id', ownerIds)

    if (profileError) {
      if ((profileError as { code?: string })?.code !== MISSING_COLUMN_CODE) {
        console.error('home story video profiles failed:', profileError.message)
      }
    } else {
      ;(profiles || []).forEach((row: { id?: string | null; full_name?: string | null }) => {
        const id = String(row?.id || '').trim()
        const name = String(row?.full_name || '').trim()
        if (id && name) profileNameByUserId.set(id, name)
      })
    }
  }

  return { sellerNameByProductId, profileNameByUserId }
}

const toResponseItem = ({
  id,
  key,
  url,
  createdAt,
  productId,
  productName,
  productSlug,
  status,
  ownerId,
  sellerNameByProductId,
  profileNameByUserId,
}: {
  id: string
  key: string
  url: string
  createdAt: string
  productId: string
  productName: string
  productSlug: string
  status: string
  ownerId: string
  sellerNameByProductId: Map<string, string>
  profileNameByUserId: Map<string, string>
}) => ({
  id: key ? toMediaId(key) : id,
  key,
  r2_key: key,
  url,
  title: productName || 'Story video',
  media_type: 'video',
  created_at: createdAt || null,
  product_id: productId || '',
  product_name: productName || '',
  product_slug: productSlug || '',
  seller_name:
    sellerNameByProductId.get(productId) ||
    profileNameByUserId.get(ownerId) ||
    (ownerId ? 'Seller' : 'Admin'),
  status: status || '',
  can_delete: Boolean(key && key.startsWith('product-videos/')),
})

type StoryVideoItem = ReturnType<typeof toResponseItem>

const dedupeStoryVideoItems = (
  items: Array<StoryVideoItem | null | undefined>,
): StoryVideoItem[] => {
  const seen = new Set<string>()
  const deduped: StoryVideoItem[] = []
  items.forEach((item) => {
    if (!item) return
    const key = String(item?.r2_key || item?.key || '').trim()
    const url = String(item?.url || '').trim()
    const fingerprint = `${key}::${url}`.toLowerCase()
    if (!key && !url) return
    if (seen.has(fingerprint)) return
    seen.add(fingerprint)
    deduped.push(item)
  })
  return deduped
}

export async function GET(request: NextRequest) {
  const { applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) return jsonError('Forbidden.', 403)

  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parsed.success) return jsonError('Invalid query.', 400)

  const { page, per_page } = parsed.data
  const from = (page - 1) * per_page
  const to = from + per_page - 1
  const sourceWindow = Math.min(
    SOURCE_WINDOW_CAP,
    Math.max(page * per_page + per_page * 2, per_page * 3),
  )
  const adminDb = createAdminSupabaseClient()

  const { data: productVideos, error: inventoryError } = await adminDb
    .from('product_videos')
    .select('id, product_id, r2_key, url, created_by, created_at')
    .order('created_at', { ascending: false })
    .range(0, sourceWindow - 1)

  const inventoryMissing = (inventoryError as { code?: string } | null)?.code === '42P01'
  if (inventoryError && !inventoryMissing) {
    console.error('home story video inventory load failed:', inventoryError.message)
    return jsonError('Unable to load story videos.', 500)
  }

  const inventoryRows = Array.isArray(productVideos) ? (productVideos as ProductVideoRow[]) : []
  const { data: legacyProducts, error: legacyError } = await adminDb
    .from('products')
    .select('id, name, slug, status, product_video_key, product_video_url, created_by, created_at')
    .not('product_video_url', 'is', null)
    .neq('product_video_url', '')
    .order('created_at', { ascending: false })
    .range(0, sourceWindow - 1)

  if (legacyError) {
    console.error('home story legacy product videos failed:', legacyError.message)
    return jsonError('Unable to load story videos.', 500)
  }

  const legacyRows = Array.isArray(legacyProducts) ? (legacyProducts as ProductRow[]) : []
  const productIds = Array.from(
    new Set(
      inventoryRows
        .map((row) => String(row?.product_id || '').trim())
        .concat(legacyRows.map((row) => String(row?.id || '').trim()))
        .filter(Boolean),
    ),
  )

  const productsById = new Map<string, ProductRow>()
  if (productIds.length) {
    const { data: products, error: productError } = await adminDb
      .from('products')
      .select('id, name, slug, status, product_video_key, product_video_url, created_by, created_at')
      .in('id', productIds)

    if (productError) {
      console.error('home story product lookup failed:', productError.message)
    } else {
      ;((products || []) as ProductRow[]).forEach((row) => {
        const id = String(row?.id || '').trim()
        if (id) productsById.set(id, row)
      })
    }
  }

  const ownerIds = Array.from(
    new Set(
      inventoryRows
        .map((row) => String(row?.created_by || '').trim())
        .concat(legacyRows.map((row) => String(row?.created_by || '').trim()))
        .concat(Array.from(productsById.values()).map((row) => String(row?.created_by || '').trim()))
        .filter(Boolean),
    ),
  )

  const { sellerNameByProductId, profileNameByUserId } = await buildSellerMaps(
    adminDb,
    productIds,
    ownerIds,
  )

  const inventoryItems = inventoryRows
    .map((row) => {
      const productId = String(row?.product_id || '').trim()
      const product = productsById.get(productId)
      const url = String(row?.url || product?.product_video_url || '').trim()
      const key = String(row?.r2_key || product?.product_video_key || '').trim()
      if (!url) return null
      return toResponseItem({
        id: String(row?.id || key || url).trim(),
        key,
        url,
        createdAt: String(row?.created_at || product?.created_at || '').trim(),
        productId,
        productName: String(product?.name || '').trim(),
        productSlug: String(product?.slug || '').trim(),
        status: String(product?.status || '').trim(),
        ownerId: String(row?.created_by || product?.created_by || '').trim(),
        sellerNameByProductId,
        profileNameByUserId,
      })
    })
  const legacyItems = legacyRows.map((row) => {
    const productId = String(row?.id || '').trim()
    const url = String(row?.product_video_url || '').trim()
    const key = String(row?.product_video_key || '').trim()
    if (!url) return null
    return toResponseItem({
      id: key || url,
      key,
      url,
      createdAt: String(row?.created_at || '').trim(),
      productId,
      productName: String(row?.name || '').trim(),
      productSlug: String(row?.slug || '').trim(),
      status: String(row?.status || '').trim(),
      ownerId: String(row?.created_by || '').trim(),
      sellerNameByProductId,
      profileNameByUserId,
    })
  })

  const combinedItems = dedupeStoryVideoItems([...inventoryItems, ...legacyItems]).sort((a, b) => {
    const aTime = new Date(a?.created_at || 0).getTime()
    const bTime = new Date(b?.created_at || 0).getTime()
    return bTime - aTime
  })

  const items = combinedItems.slice(from, to + 1)

  const inventoryCountResult = inventoryMissing
    ? { count: 0, error: null }
    : await adminDb.from('product_videos').select('id', { count: 'exact', head: true })
  const legacyCountResult = await adminDb
    .from('products')
    .select('id', { count: 'exact', head: true })
    .not('product_video_url', 'is', null)
    .neq('product_video_url', '')

  const estimatedTotalCount = Math.max(
    combinedItems.length,
    (inventoryCountResult.error ? 0 : inventoryCountResult.count ?? 0) +
      (legacyCountResult.error ? 0 : legacyCountResult.count ?? 0),
  )
  const totalCount = estimatedTotalCount || items.length
  const pages = totalCount ? Math.max(1, Math.ceil(totalCount / per_page)) : 1
  const response = jsonOk({ items, pages, page, total_count: totalCount })
  applyCookies(response)
  return response
}
