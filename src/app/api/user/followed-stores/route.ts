import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { countBrandFollowersMap, fetchBrandsByIds } from '@/lib/catalog/brand-following'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(40).default(20),
  preview_limit: z.coerce.number().int().min(1).max(12).default(6),
  include_previews: z
    .union([z.literal('0'), z.literal('1')])
    .default('1'),
})
const PRIVATE_CACHE_CONTROL = 'private, max-age=8, stale-while-revalidate=24'

const applyPrivateCacheHeaders = (response: Response) => {
  response.headers.set('Cache-Control', PRIVATE_CACHE_CONTROL)
  response.headers.set('Vary', 'Cookie')
}

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return jsonError('You must be signed in.', 401)
  }

  const params = querySchema.safeParse({
    page: request.nextUrl.searchParams.get('page') || 1,
    per_page: request.nextUrl.searchParams.get('per_page') || 20,
    preview_limit: request.nextUrl.searchParams.get('preview_limit') || 6,
    include_previews: request.nextUrl.searchParams.get('include_previews') || '1',
  })
  if (!params.success) {
    return jsonError(params.error.issues[0]?.message || 'Invalid query params.', 400)
  }

  const { page, per_page, preview_limit, include_previews } = params.data
  const includePreviews = include_previews === '1'
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
    applyPrivateCacheHeaders(response)
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

  const previewProductsByBrandId = new Map<string, any[]>()
  if (includePreviews && brandIds.length > 0) {
    const { data: linkRows, error: linkError } = await supabase
      .from('product_brand_links')
      .select('brand_id,product_id')
      .in('brand_id', brandIds)

    if (linkError) {
      console.error('followed stores preview link fetch failed:', linkError.message)
    } else {
      const links = Array.isArray(linkRows) ? linkRows : []
      const productIds = Array.from(
        new Set(
          links.map((row: any) => String(row?.product_id || '').trim()).filter(Boolean),
        ),
      )
      const brandIdsByProductId = new Map<string, string[]>()
      links.forEach((row: any) => {
        const productId = String(row?.product_id || '').trim()
        const brandId = String(row?.brand_id || '').trim()
        if (!productId || !brandId) return
        const existing = brandIdsByProductId.get(productId) || []
        existing.push(brandId)
        brandIdsByProductId.set(productId, existing)
      })

      if (productIds.length > 0) {
        const [productsRes, imagesRes] = await Promise.all([
          supabase
            .from('products')
            .select('id,name,slug,price,discount_price,stock_quantity,created_at')
            .in('id', productIds)
            .eq('status', 'publish')
            .order('created_at', { ascending: false }),
          supabase
            .from('product_images')
            .select('product_id,url,sort_order')
            .in('product_id', productIds)
            .order('sort_order', { ascending: true }),
        ])

        if (productsRes.error) {
          console.error('followed stores preview products fetch failed:', productsRes.error.message)
        } else {
          const imageByProductId = new Map<string, string>()
          ;(imagesRes.data || []).forEach((row: any) => {
            const productId = String(row?.product_id || '').trim()
            if (!productId || imageByProductId.has(productId)) return
            const url = String(row?.url || '').trim()
            if (!url) return
            imageByProductId.set(productId, url)
          })

          const brandById = new Map(
            brands.map((brand: any) => [String(brand?.id || '').trim(), brand]),
          )
          ;(productsRes.data || []).forEach((product: any) => {
            const productId = String(product?.id || '').trim()
            if (!productId) return
            const linkedBrandIds = brandIdsByProductId.get(productId) || []
            if (!linkedBrandIds.length) return

            linkedBrandIds.forEach((brandId) => {
              const bucket = previewProductsByBrandId.get(brandId) || []
              if (bucket.length >= preview_limit) return

              const primaryBrand = brandById.get(brandId)
              const imageUrl = String(imageByProductId.get(productId) || '').trim()
              bucket.push({
                id: productId,
                name: String(product?.name || '').trim(),
                slug: String(product?.slug || '').trim(),
                price: Number(product?.price) || 0,
                discount_price: Number(product?.discount_price) || 0,
                stock_quantity: Number(product?.stock_quantity) || 0,
                image_url: imageUrl,
                images: imageUrl ? [{ url: imageUrl }] : [],
                brands: primaryBrand
                  ? [
                      {
                        id: String(primaryBrand?.id || '').trim(),
                        name: String(primaryBrand?.name || '').trim(),
                        slug: String(primaryBrand?.slug || '').trim(),
                      },
                    ]
                  : [],
                variations: [],
              })
              previewProductsByBrandId.set(brandId, bucket)
            })
          })
        }
      }
    }
  }

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
        preview_products: previewProductsByBrandId.get(brandId) || [],
      }
    })
    .filter(Boolean)

  const response = jsonOk({
    items,
    page,
    per_page,
    total: Math.max(0, Number(count) || 0),
  })
  applyPrivateCacheHeaders(response)
  applyCookies(response)
  return response
}
