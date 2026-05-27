import { createServerSupabaseClient } from '@/lib/supabase/server'

const LAYOUT_TABLE = 'admin_category_hotspot_layouts'
const POINT_TABLE = 'admin_category_hotspot_points'
const PRODUCT_TABLE = 'products'
const IMAGE_TABLE = 'product_images'

export const fetchHotspotLayoutsByCategory = async (categoryId: string) => {
  if (!categoryId) return []
  const supabase = await createServerSupabaseClient()

  const { data: layouts } = await supabase
    .from(LAYOUT_TABLE)
    .select('id, category_id, image_url, image_alt, sort_order, created_at')
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (!layouts?.length) return []

  const layoutIds = layouts.map((layout) => layout.id)
  const { data: points } = await supabase
    .from(POINT_TABLE)
    .select('id, layout_id, product_id, position_x, position_y, sort_order')
    .in('layout_id', layoutIds)
    .order('sort_order', { ascending: true })

  const productIds = (points || [])
    .map((point) => point.product_id)
    .filter(Boolean)

  const { data: products } = await supabase
    .from(PRODUCT_TABLE)
    .select('id, name, slug, price, discount_price, status')
    .eq('status', 'publish')
    .in('id', productIds)

  const { data: images } = await supabase
    .from(IMAGE_TABLE)
    .select('product_id, url, sort_order')
    .in('product_id', productIds)
    .order('sort_order', { ascending: true })

  const imageByProduct = new Map()
  ;(images || []).forEach((row) => {
    if (!imageByProduct.has(row.product_id)) {
      imageByProduct.set(row.product_id, row.url)
    }
  })

  const productMap = new Map(
    (products || []).map((product) => [
      product.id,
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        discount_price: product.discount_price,
        image_url: imageByProduct.get(product.id) || '',
      },
    ]),
  )

  const pointsByLayout = new Map()
  ;(points || []).forEach((point) => {
    const list = pointsByLayout.get(point.layout_id) || []
    list.push(point)
    pointsByLayout.set(point.layout_id, list)
  })

  return layouts.map((layout) => {
    const hotspots = (pointsByLayout.get(layout.id) || [])
      .map((point) => {
        const product = productMap.get(point.product_id)
        if (!product) return null
        return {
          id: point.id,
          product_id: point.product_id,
          x: Number(point.position_x),
          y: Number(point.position_y),
          product,
        }
      })
      .filter(Boolean)
    return {
      ...layout,
      hotspots,
    }
  })
}
