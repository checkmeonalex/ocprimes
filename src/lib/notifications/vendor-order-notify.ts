import { createNotifications } from '@/lib/admin/notifications'
import { buildVendorOrderReceivedTemplate } from '@/lib/notifications/templates'

type OrderItem = {
  product_id?: string | null
  name?: string | null
  image?: string | null
  quantity?: number | null
  line_total?: number | null
}

type VendorOrderInput = {
  orderId: string
  orderNumber: string
  currency?: string
  orderItems: OrderItem[]
}

/**
 * Looks up which vendor(s) own the products in an order and sends each a
 * `vendor_order_received` notification.
 *
 * Resolution order:
 *   1. product_brand_links → admin_brands.created_by  (branded products)
 *   2. products.created_by                             (unbranded vendor products)
 */
export async function notifyVendorsForOrder(
  adminDb: any,
  { orderId, orderNumber, currency = 'NGN', orderItems }: VendorOrderInput,
) {
  if (!orderId || !orderItems.length) return

  const productIds = Array.from(
    new Set(orderItems.map((i) => String(i.product_id || '')).filter(Boolean)),
  )
  if (!productIds.length) return

  const vendorUserIds = new Set<string>()

  // 1 — branded products: product_brand_links → admin_brands.created_by
  try {
    const { data: brandLinks } = await adminDb
      .from('product_brand_links')
      .select('brand_id')
      .in('product_id', productIds)

    const brandIds = Array.from(
      new Set(
        (Array.isArray(brandLinks) ? brandLinks : [])
          .map((r: any) => String(r?.brand_id || ''))
          .filter(Boolean),
      ),
    )

    if (brandIds.length) {
      const { data: brands } = await adminDb
        .from('admin_brands')
        .select('created_by')
        .in('id', brandIds)
      ;(Array.isArray(brands) ? brands : []).forEach((b: any) => {
        const uid = String(b?.created_by || '').trim()
        if (uid) vendorUserIds.add(uid)
      })
    }
  } catch (e) {
    console.error('vendor-order-notify brand lookup failed:', e)
  }

  // 2 — unbranded vendor products: products.created_by
  try {
    const { data: products } = await adminDb
      .from('products')
      .select('created_by')
      .in('id', productIds)
    ;(Array.isArray(products) ? products : []).forEach((p: any) => {
      const uid = String(p?.created_by || '').trim()
      if (uid) vendorUserIds.add(uid)
    })
  } catch (e) {
    console.error('vendor-order-notify product created_by lookup failed:', e)
  }

  if (!vendorUserIds.size) return

  const template = buildVendorOrderReceivedTemplate({
    orderId,
    orderNumber,
    currency,
    products: orderItems.map((item) => ({
      name: String(item.name || '').trim() || 'Product',
      quantity: Math.max(1, Number(item.quantity || 1)),
      lineTotal: Number(item.line_total || 0),
      image: item.image ? String(item.image) : null,
    })),
    actionUrl: `/backend/admin/orders/${orderId}`,
  })

  await createNotifications(
    adminDb,
    Array.from(vendorUserIds).map((userId) => ({
      recipient_user_id: userId,
      recipient_role: 'vendor' as const,
      title: template.title,
      message: template.message,
      type: template.type,
      severity: template.severity,
      entity_type: template.entityType,
      entity_id: template.entityId,
      metadata: template.metadata,
      created_by: null,
    })),
  )
}

/**
 * Sends a vendor notification when an order status changes.
 * Called from the order PATCH route after the customer notification is sent.
 */
export async function notifyVendorsOrderStatusChanged(
  adminDb: any,
  {
    orderId,
    orderNumber,
    nextStatus,
    updatedBy,
  }: {
    orderId: string
    orderNumber: string
    nextStatus: string
    updatedBy?: string | null
  },
) {
  if (!orderId) return

  // Get order items to find vendors
  const { data: items } = await adminDb
    .from('checkout_order_items')
    .select('product_id, name, image, quantity, line_total')
    .eq('order_id', orderId)

  const orderItems: OrderItem[] = Array.isArray(items) ? items : []
  const productIds = Array.from(
    new Set(orderItems.map((i) => String(i.product_id || '')).filter(Boolean)),
  )
  if (!productIds.length) return

  const vendorUserIds = new Set<string>()

  try {
    const { data: brandLinks } = await adminDb
      .from('product_brand_links')
      .select('brand_id')
      .in('product_id', productIds)
    const brandIds = Array.from(
      new Set(
        (Array.isArray(brandLinks) ? brandLinks : [])
          .map((r: any) => String(r?.brand_id || ''))
          .filter(Boolean),
      ),
    )
    if (brandIds.length) {
      const { data: brands } = await adminDb
        .from('admin_brands')
        .select('created_by')
        .in('id', brandIds)
      ;(Array.isArray(brands) ? brands : []).forEach((b: any) => {
        const uid = String(b?.created_by || '').trim()
        if (uid) vendorUserIds.add(uid)
      })
    }
  } catch {}

  try {
    const { data: products } = await adminDb
      .from('products')
      .select('created_by')
      .in('id', productIds)
    ;(Array.isArray(products) ? products : []).forEach((p: any) => {
      const uid = String(p?.created_by || '').trim()
      if (uid) vendorUserIds.add(uid)
    })
  } catch {}

  if (!vendorUserIds.size) return

  const label = nextStatus.replace(/_/g, ' ')
  const orderRef = orderNumber || `#${orderId.slice(0, 8).toUpperCase()}`

  await createNotifications(
    adminDb,
    Array.from(vendorUserIds).map((userId) => ({
      recipient_user_id: userId,
      recipient_role: 'vendor' as const,
      title: `Order ${orderRef} status updated`,
      message: `Order ${orderRef} is now marked as "${label}".`,
      type: 'order_status_vendor',
      severity: nextStatus === 'cancelled' ? ('warning' as const) : ('info' as const),
      entity_type: 'order',
      entity_id: orderId,
      metadata: {
        order_id: orderId,
        order_number: orderRef,
        status: nextStatus,
        action_url: `/backend/admin/orders/${orderId}`,
      },
      created_by: updatedBy || null,
    })),
  )
}
