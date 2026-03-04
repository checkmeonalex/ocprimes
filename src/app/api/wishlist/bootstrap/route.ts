import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { isDefaultWishlistName } from '@/lib/wishlist/list-name'

const querySchema = z.object({
  per_list_limit: z.coerce.number().int().min(1).max(48).default(24),
})

type WishlistRow = {
  id: string
  name: string
  description: string | null
  visibility: string
  share_token: string | null
  created_at: string | null
}

type WishlistBootstrapItem = {
  id: string
  created_at: string | null
  product_id: string
  product_name: string
  product_slug: string
  product_price: number
  product_original_price: number | null
  product_image: string
  product_stock: number
  product_vendor: string
  product_vendor_slug: string
}

const selectListColumns = 'id,name,description,visibility,share_token,created_at'
const PRIVATE_CACHE_CONTROL = 'private, max-age=8, stale-while-revalidate=24'

const buildCardImage = (imagesByProductId: Map<string, string>, productId: string, fallback: string) =>
  String(imagesByProductId.get(productId) || fallback || '').trim()

const applyPrivateCacheHeaders = (response: Response) => {
  response.headers.set('Cache-Control', PRIVATE_CACHE_CONTROL)
  response.headers.set('Vary', 'Cookie')
}

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) {
    return jsonError('You must be signed in.', 401)
  }

  const parsed = querySchema.safeParse({
    per_list_limit: request.nextUrl.searchParams.get('per_list_limit') || 24,
  })
  if (!parsed.success) {
    return jsonError('Invalid query.', 400)
  }
  const perListLimit = parsed.data.per_list_limit

  const { data: fetchedLists, error: listsError } = await supabase
    .from('wishlists')
    .select(selectListColumns)
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })

  if (listsError) {
    console.error('wishlist bootstrap list fetch failed:', listsError.message)
    if (listsError.code === '42P01') {
      return jsonError('Wishlist tables are missing. Apply supabase/sql/021_wishlists.sql.', 500)
    }
    return jsonError('Unable to load wishlists.', 500)
  }

  let lists: WishlistRow[] = Array.isArray(fetchedLists) ? fetchedLists : []
  if (!lists.length) {
    const { data: created, error: createError } = await supabase
      .from('wishlists')
      .insert({
        user_id: auth.user.id,
        name: 'All wishlist',
        visibility: 'invite',
      })
      .select(selectListColumns)
      .single()

    if (createError) {
      console.error('wishlist bootstrap default list create failed:', createError.message)
    } else if (created) {
      lists = [created]
    }
  }

  const listIds = lists.map((entry) => String(entry.id || '').trim()).filter(Boolean)
  if (!listIds.length) {
    const response = jsonOk({
      lists: [],
      items_by_list: {},
      selected_list_id: '',
    })
    applyPrivateCacheHeaders(response)
    applyCookies(response)
    return response
  }

  const { data: rawItems, error: itemsError } = await supabase
    .from('wishlist_items')
    .select('id,wishlist_id,product_id,product_name,product_slug,product_price,product_image,created_at')
    .in('wishlist_id', listIds)
    .order('created_at', { ascending: false })

  if (itemsError) {
    console.error('wishlist bootstrap items fetch failed:', itemsError.message)
    return jsonError('Unable to load wishlist items.', 500)
  }

  const previewsByListId = new Map<string, string[]>()
  const itemsByListId = new Map<string, WishlistBootstrapItem[]>()
  listIds.forEach((listId) => {
    previewsByListId.set(listId, [])
    itemsByListId.set(listId, [])
  })

  const allRows = Array.isArray(rawItems) ? rawItems : []
  const dbProductIds = new Set<string>()

  allRows.forEach((row: any) => {
    const listId = String(row?.wishlist_id || '').trim()
    if (!listId || !itemsByListId.has(listId)) return

    const previews = previewsByListId.get(listId) || []
    const rawImage = String(row?.product_image || '').trim()
    if (rawImage && previews.length < 4) {
      previews.push(rawImage)
      previewsByListId.set(listId, previews)
    }

    const bucket = itemsByListId.get(listId) || []
    if (bucket.length >= perListLimit) return

    const productId = String(row?.product_id || '').trim()
    const isSeedProduct = productId.startsWith('seed-')
    if (productId && !isSeedProduct) {
      dbProductIds.add(productId)
    }

    bucket.push({
      id: String(row?.id || '').trim(),
      created_at: row?.created_at || null,
      product_id: productId,
      product_name: String(row?.product_name || '').trim(),
      product_slug: String(row?.product_slug || '').trim(),
      product_price: Number(row?.product_price) || 0,
      product_original_price: null,
      product_image: rawImage,
      product_stock: 99,
      product_vendor: 'OCPRIMES',
      product_vendor_slug: '',
    })
    itemsByListId.set(listId, bucket)
  })

  const uniqueDbProductIds = Array.from(dbProductIds)
  const productsById = new Map<string, any>()
  const imagesByProductId = new Map<string, string>()
  const brandByProductId = new Map<string, { name: string; slug: string }>()

  if (uniqueDbProductIds.length) {
    const [productRes, imageRes, brandRes] = await Promise.all([
      supabase
        .from('products')
        .select('id,name,slug,price,discount_price,stock_quantity')
        .in('id', uniqueDbProductIds)
        .eq('status', 'publish'),
      supabase
        .from('product_images')
        .select('product_id,url,sort_order')
        .in('product_id', uniqueDbProductIds)
        .order('sort_order', { ascending: true }),
      supabase
        .from('product_brand_links')
        .select('product_id,admin_brands(name,slug)')
        .in('product_id', uniqueDbProductIds),
    ])

    if (productRes.error) {
      console.error('wishlist bootstrap product fetch failed:', productRes.error.message)
      return jsonError('Unable to load wishlist products.', 500)
    }

    ;(productRes.data || []).forEach((product: any) => {
      productsById.set(String(product?.id || '').trim(), product)
    })

    ;(imageRes.data || []).forEach((row: any) => {
      const productId = String(row?.product_id || '').trim()
      if (!productId || imagesByProductId.has(productId)) return
      const url = String(row?.url || '').trim()
      if (!url) return
      imagesByProductId.set(productId, url)
    })

    ;(brandRes.data || []).forEach((row: any) => {
      const productId = String(row?.product_id || '').trim()
      if (!productId || brandByProductId.has(productId)) return
      const embedded = Array.isArray(row?.admin_brands) ? row.admin_brands[0] : row?.admin_brands
      const name = String(embedded?.name || '').trim()
      if (!name) return
      brandByProductId.set(productId, {
        name,
        slug: String(embedded?.slug || '').trim(),
      })
    })
  }

  const normalizedItemsByList: Record<string, WishlistBootstrapItem[]> = {}
  listIds.forEach((listId) => {
    const source = itemsByListId.get(listId) || []
    normalizedItemsByList[listId] = source.map((entry) => {
      const product = productsById.get(entry.product_id)
      if (!product) {
        return entry
      }

      const basePrice = Number(product?.price) || 0
      const discountPrice = Number(product?.discount_price) || 0
      const hasDiscount = discountPrice > 0 && discountPrice < basePrice
      const vendor = brandByProductId.get(entry.product_id)

      return {
        ...entry,
        product_name: String(product?.name || entry.product_name || '').trim(),
        product_slug: String(product?.slug || entry.product_slug || '').trim(),
        product_price: hasDiscount ? discountPrice : basePrice,
        product_original_price: hasDiscount ? basePrice : null,
        product_image: buildCardImage(imagesByProductId, entry.product_id, entry.product_image),
        product_stock: Number(product?.stock_quantity) || 0,
        product_vendor: vendor?.name || 'OCPRIMES',
        product_vendor_slug: vendor?.slug || '',
      }
    })
  })

  const normalizedLists = lists.map((list) => {
    const listId = String(list.id || '').trim()
    return {
      ...list,
      previews: previewsByListId.get(listId) || [],
      item_count: (normalizedItemsByList[listId] || []).length,
    }
  })

  const defaultList = normalizedLists.find((entry) => isDefaultWishlistName(entry.name))
  const selectedListId = String(defaultList?.id || normalizedLists[0]?.id || '').trim()

  const response = jsonOk({
    lists: normalizedLists,
    items_by_list: normalizedItemsByList,
    selected_list_id: selectedListId,
    per_list_limit: perListLimit,
  })
  applyPrivateCacheHeaders(response)
  applyCookies(response)
  return response
}
