import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { isReturnPolicyDisabled, normalizeReturnPolicyKey } from '@/lib/cart/return-policy'

const getManualStatus = (shippingAddress: Record<string, unknown>) =>
  String(
    shippingAddress?.orderStatus ||
      shippingAddress?.order_status ||
      shippingAddress?.status ||
      '',
  )
    .trim()
    .toLowerCase()

const toStatusKey = (paymentStatus: string, shippingAddress: Record<string, unknown>) => {
  const manual = getManualStatus(shippingAddress)
  if (manual === 'delivered') return 'delivered'
  if (manual === 'out_for_delivery') return 'out_for_delivery'
  if (manual === 'processing') return 'processing'
  if (manual === 'cancelled') return 'cancelled'
  if (manual === 'pending') return 'pending'
  if (manual === 'failed') return 'failed'

  const normalized = String(paymentStatus || '').toLowerCase()
  if (normalized === 'paid') return 'delivered'
  if (normalized === 'failed') return 'failed'
  if (normalized === 'cancelled') return 'cancelled'
  return 'pending'
}

const toStatusLabel = (statusKey: string) => {
  const normalized = String(statusKey || '').trim().toLowerCase()
  if (normalized === 'delivered') return 'Completed'
  if (normalized === 'out_for_delivery') return 'Out for delivery'
  if (normalized === 'processing') return 'Processing'
  if (normalized === 'cancelled') return 'Cancelled'
  if (normalized === 'failed') return 'Failed'
  return 'Awaiting Payment'
}

type BrandLinkRow = {
  product_id: string
  admin_brands?: { name?: string | null } | Array<{ name?: string | null }> | null
}

const formatAddress = (address: Record<string, unknown>) => {
  const parts = [
    String(address?.line1 || address?.streetAddress || '').trim(),
    String(address?.line2 || '').trim(),
    String(address?.city || '').trim(),
    String(address?.state || '').trim(),
    String(address?.postalCode || '').trim(),
    String(address?.country || '').trim(),
  ].filter(Boolean)
  return parts.join(', ')
}

const toPaymentMethodLabel = (methodId: string, channel: string) => {
  const id = String(methodId || '').trim().toLowerCase()
  const ch = String(channel || '').trim().toLowerCase()
  if (id === 'visa') return 'Visa Card'
  if (id === 'mastercard') return 'MasterCard'
  if (id === 'verve') return 'Verve Card'
  if (id === 'amex') return 'American Express'
  if (id === 'bank-transfer' || ch === 'bank_transfer') return 'Bank Transfer'
  if (id === 'ussd' || ch === 'ussd') return 'USSD'
  if (ch === 'card') return 'Card'
  if (ch === 'bank_transfer') return 'Bank Transfer'
  if (ch === 'ussd') return 'USSD'
  return 'Online Wallet'
}

export async function GET(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params
  const safeOrderId = String(orderId || '').trim()
  if (!safeOrderId) {
    return jsonError('Order id is required.', 400)
  }

  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data: auth, error: authError } = await supabase.auth.getUser()

  if (authError || !auth?.user) {
    const response = jsonError('You must be signed in.', 401)
    applyCookies(response)
    return response
  }

  const { data: orderRow, error: orderError } = await supabase
    .from('checkout_orders')
    .select(
      'id, order_number, payment_status, total_amount, shipping_fee, tax_amount, protection_fee, subtotal, created_at, shipping_address, paystack_reference',
    )
    .eq('id', safeOrderId)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (orderError) {
    const response = jsonError('Unable to load order.', 500)
    applyCookies(response)
    return response
  }

  if (!orderRow?.id) {
    const response = jsonError('Order not found.', 404)
    applyCookies(response)
    return response
  }

  const { data: itemsRows, error: itemsError } = await supabase
    .from('checkout_order_items')
    .select(
      'id, product_id, name, image, selected_variation_label, quantity, unit_price, original_unit_price, line_total, created_at',
    )
    .eq('order_id', orderRow.id)
    .order('created_at', { ascending: true })

  if (itemsError) {
    const response = jsonError('Unable to load order items.', 500)
    applyCookies(response)
    return response
  }

  const productIds = Array.from(
    new Set((itemsRows || []).map((entry) => String(entry.product_id || '')).filter(Boolean)),
  )
  const vendorByProductId = new Map<string, string>()
  const returnPolicyByProductId = new Map<string, string>()

  if (productIds.length > 0) {
    const [{ data: brandLinkRows }, { data: productPolicyRows }] = await Promise.all([
      supabase
        .from('product_brand_links')
        .select('product_id, admin_brands(name)')
        .in('product_id', productIds),
      supabase
        .from('products')
        .select('id, return_policy')
        .in('id', productIds),
    ])

    ;((brandLinkRows || []) as BrandLinkRow[]).forEach((row) => {
      const productId = String(row.product_id || '')
      if (!productId || vendorByProductId.has(productId)) return

      const relation = row.admin_brands
      let vendorName = ''
      if (Array.isArray(relation)) {
        vendorName = String(relation[0]?.name || '').trim()
      } else {
        vendorName = String(relation?.name || '').trim()
      }
      if (vendorName) {
        vendorByProductId.set(productId, vendorName)
      }
    })

    ;((productPolicyRows || []) as Array<{ id: string; return_policy?: string | null }>).forEach((row) => {
      const productId = String(row.id || '')
      if (!productId) return
      returnPolicyByProductId.set(productId, normalizeReturnPolicyKey(row.return_policy))
    })
  }

  const shippingAddress = (orderRow.shipping_address || {}) as Record<string, unknown>
  const statusKey = toStatusKey(String(orderRow.payment_status || ''), shippingAddress)
  const contactPhone = String(
    shippingAddress?.phone ||
      shippingAddress?.phoneNumber ||
      shippingAddress?.contactPhone ||
      '',
  ).trim()
  const deliveryMethod = String(
    shippingAddress?.shippingLabel ||
      shippingAddress?.selectedShippingOption ||
      shippingAddress?.deliveryMethod ||
      '',
  ).trim()
  let paymentMethod = String(
    shippingAddress?.paymentMethod || shippingAddress?.selectedPaymentMethod || '',
  ).trim()
  let paymentChannel = String(
    shippingAddress?.paymentChannel || shippingAddress?.selectedPaymentChannel || '',
  ).trim()

  if ((!paymentMethod && !paymentChannel) && orderRow.paystack_reference) {
    const secretKey = String(process.env.PAYSTACK_SECRET_KEY || '').trim()
    if (secretKey) {
      try {
        const verifyResponse = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(String(orderRow.paystack_reference || '').trim())}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${secretKey}`,
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
          },
        )
        const verifyPayload = await verifyResponse.json().catch(() => null)
        const metadata =
          verifyPayload && typeof verifyPayload === 'object'
            ? ((verifyPayload as { data?: { metadata?: Record<string, unknown> } }).data?.metadata || {})
            : {}
        paymentMethod = String(metadata.selected_payment_method || '').trim()
        paymentChannel = String(metadata.selected_payment_channel || '').trim()
      } catch {
        // keep default fallback label
      }
    }
  }

  const response = jsonOk({
    order: {
      id: String(orderRow.id),
      orderNumber: String(orderRow.order_number || '').trim() || `#${String(orderRow.id).replace(/-/g, '').toUpperCase()}`,
      statusKey,
      status: toStatusLabel(statusKey),
      paymentStatus: String(orderRow.payment_status || ''),
      createdAt: String(orderRow.created_at || ''),
      totalAmount: Number(orderRow.total_amount || 0),
      subtotal: Number(orderRow.subtotal || 0),
      shippingFee: Number(orderRow.shipping_fee || 0),
      taxAmount: Number(orderRow.tax_amount || 0),
      protectionFee: Number(orderRow.protection_fee || 0),
      seller: 'OCPRIMES',
      trackId: String(orderRow.paystack_reference || orderRow.id || ''),
      addressLabel: formatAddress(shippingAddress),
      contactPhone,
      deliveryMethod: deliveryMethod || 'Standard delivery',
      paymentMode: toPaymentMethodLabel(paymentMethod, paymentChannel),
      items: (itemsRows || []).map((entry) => ({
        id: String(entry.id),
        productId: String(entry.product_id || ''),
        vendor: vendorByProductId.get(String(entry.product_id || '')) || 'OCPRIMES',
        name: String(entry.name || 'Product'),
        image: entry.image ? String(entry.image) : null,
        variation: entry.selected_variation_label ? String(entry.selected_variation_label) : '',
        quantity: Number(entry.quantity || 0),
        unitPrice: Number(entry.unit_price || 0),
        originalUnitPrice:
          entry.original_unit_price !== null && entry.original_unit_price !== undefined
            ? Number(entry.original_unit_price)
            : null,
        lineTotal: Number(entry.line_total || 0),
        isReturnable: !isReturnPolicyDisabled(
          returnPolicyByProductId.get(String(entry.product_id || '')) || '',
        ),
      })),
    },
  })
  applyCookies(response)
  return response
}
