import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { hotspotLayoutRequestSchema } from '@/lib/admin/hotspot-layouts'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const LAYOUT_TABLE = 'admin_category_hotspot_layouts'
const POINT_TABLE = 'admin_category_hotspot_points'
const PRODUCT_TABLE = 'products'
const IMAGE_TABLE = 'product_images'

const buildProductMap = async (supabase, productIds) => {
  if (!productIds.length) return new Map()
  const { data: products } = await supabase
    .from(PRODUCT_TABLE)
    .select('id, name, slug, price, discount_price')
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

  return new Map(
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
}

const loadLayouts = async (supabase, categoryId) => {
  const { data: layouts, error } = await supabase
    .from(LAYOUT_TABLE)
    .select('id, category_id, image_url, image_key, image_alt, sort_order, created_at')
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    const errorCode = (error as { code?: string })?.code
    if (errorCode === '42P01') {
      return {
        errorMessage:
          'Missing hotspot tables. Run migrations 024_admin_category_hotspot_layout.sql and 025_admin_category_hotspot_slider.sql.',
      }
    }
    return { errorMessage: 'Unable to load hotspot layout.' }
  }

  if (!layouts?.length) {
    return { items: [] }
  }

  const layoutIds = layouts.map((layout) => layout.id)
  const { data: points } = await supabase
    .from(POINT_TABLE)
    .select('id, layout_id, product_id, position_x, position_y, sort_order')
    .in('layout_id', layoutIds)
    .order('sort_order', { ascending: true })

  const productIds = (points || [])
    .map((point) => point.product_id)
    .filter(Boolean)
  const productMap = await buildProductMap(supabase, productIds)

  const pointsByLayout = new Map()
  ;(points || []).forEach((point) => {
    const list = pointsByLayout.get(point.layout_id) || []
    list.push(point)
    pointsByLayout.set(point.layout_id, list)
  })

  const items = layouts.map((layout) => {
    const hotspots = (pointsByLayout.get(layout.id) || []).map((point) => ({
      id: point.id,
      product_id: point.product_id,
      x: Number(point.position_x),
      y: Number(point.position_y),
      product: productMap.get(point.product_id) || null,
    }))
    return {
      ...layout,
      hotspots,
    }
  })

  return { items }
}

const loadLayoutById = async (supabase, layoutId) => {
  const { data: layout, error } = await supabase
    .from(LAYOUT_TABLE)
    .select('id, category_id, image_url, image_key, image_alt, sort_order, created_at')
    .eq('id', layoutId)
    .maybeSingle()

  if (error) {
    const errorCode = (error as { code?: string })?.code
    if (errorCode === '42P01') {
      return {
        errorMessage:
          'Missing hotspot tables. Run migrations 024_admin_category_hotspot_layout.sql and 025_admin_category_hotspot_slider.sql.',
      }
    }
    return { errorMessage: 'Unable to load hotspot layout.' }
  }

  if (!layout?.id) {
    return { item: null }
  }

  const { data: points } = await supabase
    .from(POINT_TABLE)
    .select('id, product_id, position_x, position_y, sort_order')
    .eq('layout_id', layout.id)
    .order('sort_order', { ascending: true })

  const productIds = (points || [])
    .map((point) => point.product_id)
    .filter(Boolean)
  const productMap = await buildProductMap(supabase, productIds)

  const hotspots = (points || []).map((point) => ({
    id: point.id,
    product_id: point.product_id,
    x: Number(point.position_x),
    y: Number(point.position_y),
    product: productMap.get(point.product_id) || null,
  }))

  return {
    item: {
      ...layout,
      hotspots,
    },
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const params = await context.params
  const parsed = paramsSchema.safeParse(params || {})
  if (!parsed.success) {
    return jsonError('Invalid category.', 400)
  }

  const result = await loadLayouts(supabase, parsed.data.id)
  if (result?.errorMessage) {
    return jsonError(result.errorMessage, 500)
  }

  const response = jsonOk({ items: result.items || [] })
  applyCookies(response)
  return response
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params || {})
  if (!parsedParams.success) {
    return jsonError('Invalid category.', 400)
  }

  const body = await request.json().catch(() => null)
  const parsedBody = hotspotLayoutRequestSchema.safeParse(body)
  if (!parsedBody.success) {
    return jsonError('Invalid payload.', 400)
  }

  const { image_url, image_key, image_alt, hotspots, layout_id, sort_order } = parsedBody.data
  const categoryId = parsedParams.data.id
  let layout = null

  if (layout_id) {
    const updatePayload = {
      image_url,
      image_key,
      image_alt,
      ...(Number.isFinite(Number(sort_order)) ? { sort_order: Number(sort_order) } : {}),
    }
    const { data: updated, error } = await supabase
      .from(LAYOUT_TABLE)
      .update(updatePayload)
      .eq('id', layout_id)
      .eq('category_id', categoryId)
      .select('id, category_id, image_url, image_key, image_alt, sort_order')
      .maybeSingle()
    if (error || !updated?.id) {
      const errorCode = (error as { code?: string })?.code
      if (errorCode === '42P01') {
        return jsonError(
          'Missing hotspot tables. Run migrations 024_admin_category_hotspot_layout.sql and 025_admin_category_hotspot_slider.sql.',
          500,
        )
      }
      return jsonError('Unable to save hotspot layout.', 500)
    }
    layout = updated
  } else {
    const { data: latest } = await supabase
      .from(LAYOUT_TABLE)
      .select('sort_order')
      .eq('category_id', categoryId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    const nextSort = Number.isFinite(Number(sort_order))
      ? Number(sort_order)
      : Number(latest?.sort_order || 0) + 1

    const { data: created, error } = await supabase
      .from(LAYOUT_TABLE)
      .insert({
        category_id: categoryId,
        image_url,
        image_key,
        image_alt,
        sort_order: nextSort,
      })
      .select('id, category_id, image_url, image_key, image_alt, sort_order')
      .single()
    if (error || !created?.id) {
      const errorCode = (error as { code?: string })?.code
      if (errorCode === '42P01') {
        return jsonError(
          'Missing hotspot tables. Run migrations 024_admin_category_hotspot_layout.sql and 025_admin_category_hotspot_slider.sql.',
          500,
        )
      }
      return jsonError('Unable to save hotspot layout.', 500)
    }
    layout = created
  }

  const { error: deleteError } = await supabase
    .from(POINT_TABLE)
    .delete()
    .eq('layout_id', layout.id)

  if (deleteError) {
    return jsonError('Unable to update hotspot layout.', 500)
  }

  if (hotspots.length) {
    const payload = hotspots.map((hotspot, index) => ({
      layout_id: layout.id,
      product_id: hotspot.product_id,
      position_x: hotspot.x,
      position_y: hotspot.y,
      sort_order: index,
    }))
    const { error: insertError } = await supabase.from(POINT_TABLE).insert(payload)
    if (insertError) {
      return jsonError('Unable to save hotspot points.', 500)
    }
  }

  const result = await loadLayoutById(supabase, layout.id)
  if (result?.errorMessage) {
    return jsonError(result.errorMessage, 500)
  }

  const response = jsonOk({ item: result.item || null })
  applyCookies(response)
  return response
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  const params = await context.params
  const parsed = paramsSchema.safeParse(params || {})
  if (!parsed.success) {
    return jsonError('Invalid category.', 400)
  }

  const layoutId = request.nextUrl.searchParams.get('layout_id')
  let query = supabase.from(LAYOUT_TABLE).delete().eq('category_id', parsed.data.id)
  if (layoutId) {
    query = query.eq('id', layoutId)
  }
  const { error } = await query

  if (error) {
    const errorCode = (error as { code?: string })?.code
    if (errorCode === '42P01') {
      return jsonError(
        'Missing hotspot tables. Run migrations 024_admin_category_hotspot_layout.sql and 025_admin_category_hotspot_slider.sql.',
        500,
      )
    }
    return jsonError('Unable to remove hotspot layout.', 500)
  }

  const response = jsonOk({ ok: true })
  applyCookies(response)
  return response
}
