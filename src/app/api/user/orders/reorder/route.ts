import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { bumpCartVersion, ensureCartForUser } from '@/lib/cart/cart-server'

type CheckoutOrderItemRow = {
  product_id: string
  name: string
  quantity: number | string
  selected_variation_label: string | null
  image: string | null
  unit_price: number | string
  original_unit_price: number | string | null
}

type ProductRow = {
  id: string
  name: string
  slug: string | null
  price: number | string
  discount_price: number | string | null
  stock_quantity: number | string | null
  status: string | null
}

type CartItemRow = {
  id: string
  product_id: string
  quantity: number | string
}

type ProductImageRow = {
  product_id: string
  url: string
}

type ProductCategoryLinkRow = {
  product_id: string
  category_id: string
}

type ProductTagLinkRow = {
  product_id: string
  tag_id: string
}

const toNumeric = (value: unknown) => {
  const num = Number(value || 0)
  return Number.isFinite(num) ? num : 0
}

const parseBody = async (request: NextRequest) => {
  const body = await request.json().catch(() => null)
  const orderId = String(body?.orderId || '').trim()
  return { orderId }
}

export async function POST(request: NextRequest) {
  const { orderId } = await parseBody(request)
  if (!orderId) {
    return jsonError('Order id is required.', 400)
  }

  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data: auth, error: authError } = await supabase.auth.getUser()

  if (authError || !auth?.user) {
    const response = jsonError('You must be signed in.', 401)
    applyCookies(response)
    return response
  }

  const { data: order } = await supabase
    .from('checkout_orders')
    .select('id')
    .eq('id', orderId)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (!order?.id) {
    const response = jsonError('Order not found.', 404)
    applyCookies(response)
    return response
  }

  const { data: itemsData, error: itemsError } = await supabase
    .from('checkout_order_items')
    .select('product_id, name, quantity, selected_variation_label, image, unit_price, original_unit_price')
    .eq('order_id', order.id)

  if (itemsError) {
    const response = jsonError('Unable to load order items.', 500)
    applyCookies(response)
    return response
  }

  const orderItems = (itemsData || []) as CheckoutOrderItemRow[]
  if (orderItems.length <= 0) {
    const response = jsonError('No items available to reorder.', 400)
    applyCookies(response)
    return response
  }

  const productIds = Array.from(new Set(orderItems.map((item) => String(item.product_id || '')).filter(Boolean)))
  if (productIds.length <= 0) {
    const response = jsonError('No products available to reorder.', 400)
    applyCookies(response)
    return response
  }

  const [{ data: productRows, error: productError }, cartRes] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, slug, price, discount_price, stock_quantity, status')
      .in('id', productIds),
    ensureCartForUser(supabase, auth.user.id),
  ])

  if (productError) {
    const response = jsonError('Unable to validate inventory.', 500)
    applyCookies(response)
    return response
  }

  if (cartRes.error || !cartRes.data?.id) {
    const response = jsonError('Unable to load cart.', 500)
    applyCookies(response)
    return response
  }

  const cart = cartRes.data
  const productsById = new Map<string, ProductRow>(
    ((productRows || []) as ProductRow[]).map((product) => [String(product.id), product]),
  )

  const { data: cartRows } = await supabase
    .from('cart_items')
    .select('id, product_id, quantity')
    .eq('cart_id', cart.id)
    .in('product_id', productIds)

  const existingByProduct = new Map<string, number>()
  ;((cartRows || []) as CartItemRow[]).forEach((row) => {
    const key = String(row.product_id || '')
    existingByProduct.set(key, (existingByProduct.get(key) || 0) + Math.max(0, toNumeric(row.quantity)))
  })

  const missingItems: Array<{
    productId: string
    name: string
    attributeSummary: string | null
    requestedQuantity: number
    availableQuantity: number
    addedQuantity: number
    reason: string
  }> = []

  const reorderTargets: Array<{
    product: ProductRow
    source: CheckoutOrderItemRow
    quantityToAdd: number
  }> = []

  orderItems.forEach((source) => {
    const productId = String(source.product_id || '')
    const requestedQuantity = Math.max(1, toNumeric(source.quantity))
    const product = productsById.get(productId)

    if (!product || String(product.status || '') !== 'publish') {
      missingItems.push({
        productId,
        name: String(source.name || 'Product'),
        attributeSummary: source.selected_variation_label
          ? String(source.selected_variation_label)
          : null,
        requestedQuantity,
        availableQuantity: 0,
        addedQuantity: 0,
        reason: 'Product unavailable',
      })
      return
    }

    const stockQuantity = Math.max(0, toNumeric(product.stock_quantity))
    const inCartAlready = existingByProduct.get(productId) || 0
    const availableToAdd = Math.max(0, stockQuantity - inCartAlready)

    if (availableToAdd <= 0) {
      missingItems.push({
        productId,
        name: String(product.name || source.name || 'Product'),
        attributeSummary: source.selected_variation_label
          ? String(source.selected_variation_label)
          : null,
        requestedQuantity,
        availableQuantity: 0,
        addedQuantity: 0,
        reason: 'Out of stock',
      })
      return
    }

    const quantityToAdd = Math.min(requestedQuantity, availableToAdd)
    if (quantityToAdd < requestedQuantity) {
      missingItems.push({
        productId,
        name: String(product.name || source.name || 'Product'),
        attributeSummary: source.selected_variation_label
          ? String(source.selected_variation_label)
          : null,
        requestedQuantity,
        availableQuantity: quantityToAdd,
        addedQuantity: quantityToAdd,
        reason: 'Limited stock',
      })
    }

    reorderTargets.push({
      product,
      source,
      quantityToAdd,
    })
    existingByProduct.set(productId, inCartAlready + quantityToAdd)
  })

  const successfulAdds = reorderTargets.filter((entry) => entry.quantityToAdd > 0)
  if (successfulAdds.length > 0) {
    const defaultRowsQuery = await supabase
      .from('cart_items')
      .select('product_id, quantity')
      .eq('cart_id', cart.id)
      .eq('selected_variation_id', 'default')
      .eq('selected_color', 'default')
      .eq('selected_size', 'default')
      .in(
        'product_id',
        successfulAdds.map((entry) => String(entry.product.id)),
      )

    const existingDefaultQuantity = new Map<string, number>()
    ;((defaultRowsQuery.data || []) as Array<{ product_id: string; quantity: number | string }>).forEach((row) => {
      existingDefaultQuantity.set(String(row.product_id), Math.max(0, toNumeric(row.quantity)))
    })

    const upsertPayload = successfulAdds.map((entry) => {
      const productId = String(entry.product.id)
      const existingQty = existingDefaultQuantity.get(productId) || 0
      const unitPrice =
        toNumeric(entry.product.discount_price) > 0
          ? toNumeric(entry.product.discount_price)
          : toNumeric(entry.product.price || entry.source.unit_price)
      const originalUnitPrice =
        toNumeric(entry.product.price) > unitPrice ? toNumeric(entry.product.price) : null

      return {
        cart_id: cart.id,
        product_id: productId,
        name: String(entry.product.name || entry.source.name || 'Product'),
        slug: entry.product.slug ? String(entry.product.slug) : null,
        price: unitPrice,
        original_price: originalUnitPrice,
        image: entry.source.image ? String(entry.source.image) : null,
        selected_variation_id: 'default',
        selected_variation_label: entry.source.selected_variation_label
          ? String(entry.source.selected_variation_label)
          : null,
        selected_color: 'default',
        selected_size: 'default',
        is_protected: false,
        quantity: existingQty + entry.quantityToAdd,
      }
    })

    const { error: upsertError } = await supabase.from('cart_items').upsert(upsertPayload, {
      onConflict: 'cart_id,product_id,selected_variation_id,selected_color,selected_size',
    })

    if (upsertError) {
      const response = jsonError('Unable to add items to cart.', 500)
      applyCookies(response)
      return response
    }

    await bumpCartVersion(supabase, cart.id, Number(cart.cart_version || 0))
  }

  const missingProductIds = Array.from(new Set(missingItems.map((entry) => entry.productId).filter(Boolean)))
  const orderProductIds = Array.from(
    new Set(orderItems.map((entry) => String(entry.product_id || '')).filter(Boolean)),
  )
  let recommendations: Array<{
    id: string
    name: string
    slug: string
    image: string | null
    price: number
    originalPrice: number | null
    stock: number
    score: number
  }> = []

  const shouldMixOrderSignals = missingItems.length <= 1
  const recommendationSignalSeedIds = Array.from(
    new Set(
      (
        shouldMixOrderSignals
          ? [...missingProductIds, ...orderProductIds]
          : missingProductIds.length > 0
            ? missingProductIds
            : orderProductIds
      ).filter(Boolean),
    ),
  )
  const recommendationExcludeIds = new Set<string>(recommendationSignalSeedIds)

  if (recommendationSignalSeedIds.length > 0) {
    const missingIdSet = new Set<string>(missingProductIds)
    const [seedCategoryRows, seedTagRows, candidateProductRows] = await Promise.all([
      supabase
        .from('product_category_links')
        .select('product_id, category_id')
        .in('product_id', recommendationSignalSeedIds),
      supabase
        .from('product_tag_links')
        .select('product_id, tag_id')
        .in('product_id', recommendationSignalSeedIds),
      supabase
        .from('products')
        .select('id, name, slug, price, discount_price, stock_quantity, status')
        .eq('status', 'publish')
        .gt('stock_quantity', 0)
        .limit(320),
    ])

    const missingCategoryIds = new Set<string>()
    const missingTagIds = new Set<string>()
    const orderCategoryIds = new Set<string>()
    const orderTagIds = new Set<string>()

    ;((seedCategoryRows.data || []) as ProductCategoryLinkRow[]).forEach((row) => {
      const productId = String(row.product_id || '')
      const categoryId = String(row.category_id || '')
      if (!categoryId) return
      if (missingIdSet.has(productId)) {
        missingCategoryIds.add(categoryId)
      } else {
        orderCategoryIds.add(categoryId)
      }
    })

    ;((seedTagRows.data || []) as ProductTagLinkRow[]).forEach((row) => {
      const productId = String(row.product_id || '')
      const tagId = String(row.tag_id || '')
      if (!tagId) return
      if (missingIdSet.has(productId)) {
        missingTagIds.add(tagId)
      } else {
        orderTagIds.add(tagId)
      }
    })

    const candidateProducts = ((candidateProductRows.data || []) as ProductRow[]).filter(
      (product) => !recommendationExcludeIds.has(String(product.id)),
    )
    const candidateIds = candidateProducts.map((entry) => String(entry.id))

    if (candidateIds.length > 0) {
      const [candidateCategoryRows, candidateTagRows, candidateImageRows] = await Promise.all([
        supabase
          .from('product_category_links')
          .select('product_id, category_id')
          .in('product_id', candidateIds),
        supabase
          .from('product_tag_links')
          .select('product_id, tag_id')
          .in('product_id', candidateIds),
        supabase
          .from('product_images')
          .select('product_id, url')
          .in('product_id', candidateIds)
          .order('sort_order', { ascending: true }),
      ])

      const categoriesByProduct = new Map<string, string[]>()
      ;((candidateCategoryRows.data || []) as ProductCategoryLinkRow[]).forEach((row) => {
        const key = String(row.product_id || '')
        const list = categoriesByProduct.get(key) || []
        list.push(String(row.category_id || ''))
        categoriesByProduct.set(key, list)
      })

      const tagsByProduct = new Map<string, string[]>()
      ;((candidateTagRows.data || []) as ProductTagLinkRow[]).forEach((row) => {
        const key = String(row.product_id || '')
        const list = tagsByProduct.get(key) || []
        list.push(String(row.tag_id || ''))
        tagsByProduct.set(key, list)
      })

      const imageByProduct = new Map<string, string>()
      ;((candidateImageRows.data || []) as ProductImageRow[]).forEach((row) => {
        const key = String(row.product_id || '')
        if (!imageByProduct.has(key)) {
          imageByProduct.set(key, String(row.url || ''))
        }
      })

      recommendations = candidateProducts
        .map((product) => {
          const productId = String(product.id)
          const categoryList = categoriesByProduct.get(productId) || []
          const tagList = tagsByProduct.get(productId) || []
          const missingCategoryMatches = categoryList.filter((value) =>
            missingCategoryIds.has(value),
          ).length
          const missingTagMatches = tagList.filter((value) =>
            missingTagIds.has(value),
          ).length
          const orderCategoryMatches = categoryList.filter((value) => orderCategoryIds.has(value)).length
          const orderTagMatches = tagList.filter((value) => orderTagIds.has(value)).length
          const score =
            missingCategoryMatches * 8 +
            missingTagMatches * 3 +
            orderCategoryMatches * 5 +
            orderTagMatches * 2
          return {
            id: productId,
            name: String(product.name || 'Product'),
            slug: String(product.slug || ''),
            image: imageByProduct.get(productId) || null,
            price:
              toNumeric(product.discount_price) > 0
                ? toNumeric(product.discount_price)
                : toNumeric(product.price),
            originalPrice:
              toNumeric(product.price) > toNumeric(product.discount_price)
                ? toNumeric(product.price)
                : null,
            stock: Math.max(0, toNumeric(product.stock_quantity)),
            score,
          }
        })
        .filter((entry) => entry.slug)
        .sort((a, b) => b.score - a.score || b.stock - a.stock)
        .slice(0, 12)
    }
  }

  const response = jsonOk({
    addedItemCount: successfulAdds.length,
    addedQuantity: successfulAdds.reduce((sum, entry) => sum + entry.quantityToAdd, 0),
    missingItems,
    recommendations,
  })
  applyCookies(response)
  return response
}
