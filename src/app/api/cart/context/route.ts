import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { normalizeReturnPolicyKey } from '@/lib/cart/return-policy'

const itemSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  slug: z.string().optional(),
  name: z.string().optional(),
})

const payloadSchema = z.object({
  items: z.array(itemSchema).max(120).default([]),
  related_limit: z.coerce.number().int().min(1).max(12).default(6),
})

const toWords = (value: string) =>
  String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

const toSearchFallback = (name: string) => toWords(name).slice(0, 2).join(' ')

const toSafeId = (value: unknown) => String(value || '').trim()

const toSafeSlug = (value: unknown) => String(value || '').trim()

const toSafeNumber = (value: unknown) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

export async function POST(request: NextRequest) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return jsonError('Invalid JSON payload.', 400)
  }

  const parsed = payloadSchema.safeParse(payload)
  if (!parsed.success) {
    return jsonError('Invalid request payload.', 400)
  }

  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const relatedLimit = parsed.data.related_limit
  const compactItems = parsed.data.items

  const cartIds = new Set<string>()
  const cartSlugs = new Set<string>()
  compactItems.forEach((entry) => {
    const id = toSafeId(entry?.id)
    const slug = toSafeSlug(entry?.slug)
    if (id) cartIds.add(id)
    if (slug) cartSlugs.add(slug)
  })

  const uniqueSlugs = Array.from(cartSlugs)
  const returnPolicies: Record<string, string> = {}
  if (uniqueSlugs.length > 0) {
    const { data: returnRows, error: returnError } = await supabase
      .from('products')
      .select('slug,return_policy')
      .in('slug', uniqueSlugs)

    if (!returnError && Array.isArray(returnRows)) {
      returnRows.forEach((row: any) => {
        const slug = toSafeSlug(row?.slug)
        if (!slug) return
        const normalized = normalizeReturnPolicyKey(row?.return_policy)
        if (!normalized) return
        returnPolicies[slug] = normalized
      })
    }
  }

  let relatedOffers: Array<{
    id: string
    slug: string
    name: string
    image: string
    price: number
    originalPrice: number
    discountAmount: number
    sourceName: string
    sourceSlug: string | null
  }> = []

  const cartSlugSample = uniqueSlugs.slice(0, 3)
  const searchFallback = toSearchFallback(String(compactItems[0]?.name || ''))

  const cartCategorySlugs = new Set<string>()
  if (cartSlugSample.length > 0) {
    const { data: cartProducts, error: cartProductsError } = await supabase
      .from('products')
      .select('id,slug,name')
      .in('slug', cartSlugSample)
      .eq('status', 'publish')

    if (!cartProductsError) {
      const cartProductIds = (cartProducts || [])
        .map((entry: any) => toSafeId(entry?.id))
        .filter(Boolean)
      if (cartProductIds.length > 0) {
        const { data: cartCategoryLinks } = await supabase
          .from('product_category_links')
          .select('product_id,admin_categories(slug,name)')
          .in('product_id', cartProductIds)

        ;(cartCategoryLinks || []).forEach((row: any) => {
          const embedded = Array.isArray(row?.admin_categories)
            ? row.admin_categories[0]
            : row?.admin_categories
          const slug = toSafeSlug(embedded?.slug || embedded?.name)
          if (slug) cartCategorySlugs.add(slug)
        })
      }
    }
  }

  const categorySignals = Array.from(cartCategorySlugs).slice(0, 3)
  let candidateProducts: any[] = []
  if (categorySignals.length > 0) {
    const { data: categoryRows } = await supabase
      .from('admin_categories')
      .select('id,slug')
      .in('slug', categorySignals)

    const categoryIds = (categoryRows || [])
      .map((row: any) => toSafeId(row?.id))
      .filter(Boolean)

    if (categoryIds.length > 0) {
      const { data: categoryLinks } = await supabase
        .from('product_category_links')
        .select('product_id')
        .in('category_id', categoryIds)

      const productIds = Array.from(
        new Set((categoryLinks || []).map((row: any) => toSafeId(row?.product_id)).filter(Boolean)),
      )

      if (productIds.length > 0) {
        const { data: productsByCategory } = await supabase
          .from('products')
          .select('id,slug,name,price,discount_price,created_at')
          .in('id', productIds)
          .eq('status', 'publish')
          .order('created_at', { ascending: false })
          .limit(80)
        candidateProducts = Array.isArray(productsByCategory) ? productsByCategory : []
      }
    }
  }

  if (!candidateProducts.length && searchFallback) {
    const term = `%${searchFallback}%`
    const { data: fallbackProducts } = await supabase
      .from('products')
      .select('id,slug,name,price,discount_price,created_at')
      .eq('status', 'publish')
      .or(`name.ilike.${term},slug.ilike.${term},sku.ilike.${term}`)
      .order('created_at', { ascending: false })
      .limit(80)
    candidateProducts = Array.isArray(fallbackProducts) ? fallbackProducts : []
  }

  if (candidateProducts.length > 0) {
    const candidateIds = Array.from(
      new Set(candidateProducts.map((entry: any) => toSafeId(entry?.id)).filter(Boolean)),
    )

    const [imageRes, brandRes] = await Promise.all([
      supabase
        .from('product_images')
        .select('product_id,url,sort_order')
        .in('product_id', candidateIds)
        .order('sort_order', { ascending: true }),
      supabase
        .from('product_brand_links')
        .select('product_id,admin_brands(name,slug)')
        .in('product_id', candidateIds),
    ])

    const imageByProductId = new Map<string, string>()
    ;(imageRes.data || []).forEach((row: any) => {
      const productId = toSafeId(row?.product_id)
      if (!productId || imageByProductId.has(productId)) return
      const url = String(row?.url || '').trim()
      if (!url) return
      imageByProductId.set(productId, url)
    })

    const brandByProductId = new Map<string, { name: string; slug: string }>()
    ;(brandRes.data || []).forEach((row: any) => {
      const productId = toSafeId(row?.product_id)
      if (!productId || brandByProductId.has(productId)) return
      const embedded = Array.isArray(row?.admin_brands) ? row.admin_brands[0] : row?.admin_brands
      const brandName = String(embedded?.name || '').trim()
      if (!brandName) return
      brandByProductId.set(productId, {
        name: brandName,
        slug: String(embedded?.slug || '').trim(),
      })
    })

    const seen = new Set<string>()
    relatedOffers = candidateProducts
      .map((product: any) => {
        const id = toSafeId(product?.id)
        const slug = toSafeSlug(product?.slug)
        if (!id || !slug) return null
        if (cartIds.has(id) || cartSlugs.has(slug)) return null
        const dedupeKey = `${id}:${slug}`
        if (seen.has(dedupeKey)) return null
        seen.add(dedupeKey)

        const basePrice = toSafeNumber(product?.price)
        const discountPrice = toSafeNumber(product?.discount_price)
        const hasDiscount = discountPrice > 0 && discountPrice < basePrice
        if (!hasDiscount) return null
        const discountAmount = basePrice - discountPrice
        if (discountAmount < 5) return null

        const brand = brandByProductId.get(id)
        return {
          id,
          slug,
          name: String(product?.name || 'Untitled product').trim(),
          image: String(imageByProductId.get(id) || '').trim(),
          price: discountPrice,
          originalPrice: basePrice,
          discountAmount,
          sourceName: String(brand?.name || 'OCPRIMES').trim() || 'OCPRIMES',
          sourceSlug: brand?.slug ? String(brand.slug).trim() : null,
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.discountAmount - a.discountAmount)
      .slice(0, relatedLimit)
  }

  const response = jsonOk({
    related_offers: relatedOffers,
    return_policies: returnPolicies,
  })
  applyCookies(response)
  return response
}
