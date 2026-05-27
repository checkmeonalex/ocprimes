import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'

const payloadSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(50),
})

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

  const uniqueIds = Array.from(new Set(parsed.data.ids)).slice(0, 50)
  if (!uniqueIds.length) {
    return jsonOk({ items: [] })
  }

  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('id, name, slug, price, discount_price, stock_quantity')
    .in('id', uniqueIds)

  if (productError) {
    console.error('Bulk product fetch failed:', productError.message)
    return jsonError('Unable to load products.', 500)
  }

  const { data: images } = await supabase
    .from('product_images')
    .select('product_id, url, sort_order')
    .in('product_id', uniqueIds)
    .order('sort_order', { ascending: true })

  const imageMap = new Map()
  ;(images || []).forEach((row) => {
    if (!imageMap.has(row.product_id)) {
      imageMap.set(row.product_id, row.url)
    }
  })

  const items = (products || []).map((product) => {
    const basePrice = Number(product.price) || 0
    const discountPrice = Number(product.discount_price) || 0
    const hasDiscount = discountPrice > 0 && discountPrice < basePrice
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: hasDiscount ? discountPrice : basePrice,
      originalPrice: hasDiscount ? basePrice : null,
      stock: Number(product.stock_quantity) || 0,
      image: imageMap.get(product.id) || '',
    }
  })

  const response = jsonOk({ items })
  applyCookies(response)
  return response
}
