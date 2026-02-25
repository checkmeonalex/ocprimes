type VendorOrderTemplateProduct = {
  name?: string
  quantity?: number
  lineTotal?: number
  image?: string | null
}

type VendorOrderTemplateInput = {
  orderId: string
  orderNumber: string
  currency?: string
  products?: VendorOrderTemplateProduct[]
  actionUrl?: string
}

const toCurrency = (value: unknown) => String(value || 'NGN').trim().toUpperCase() || 'NGN'

export const isSupportedTemplateKey = (value: unknown) =>
  String(value || '').trim() === 'vendor_order_received'

export const buildVendorOrderReceivedTemplate = (input: VendorOrderTemplateInput) => {
  const orderId = String(input.orderId || '').trim()
  const orderNumber = String(input.orderNumber || '').trim()
  const currency = toCurrency(input.currency)
  const products = Array.isArray(input.products) ? input.products.slice(0, 12) : []
  const actionUrl = String(input.actionUrl || '').trim() || `/backend/admin/orders/${orderId}`

  return {
    title: `New order received ${orderNumber}`,
    message: `You received a new order from OCPRIMES. Open to review product items and fulfill.`,
    type: 'order_vendor_message',
    severity: 'info' as const,
    entityType: 'order',
    entityId: orderId || null,
    metadata: {
      template_key: 'vendor_order_received',
      sender_name: 'OCPRIMES',
      order_id: orderId,
      order_number: orderNumber,
      currency,
      products: products.map((item) => ({
        name: String(item?.name || '').trim() || 'Product',
        quantity: Math.max(1, Number(item?.quantity || 1)),
        line_total: Number(item?.lineTotal || 0),
        image: item?.image ? String(item.image) : '',
      })),
      action_url: actionUrl,
      action_label: 'View order',
    },
  }
}

