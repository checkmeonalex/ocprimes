const MAX_VENDOR_ITEM_SCAN = 5000

type VendorOrderItemIdRow = { order_id?: string | null }

const toSafeId = (value: unknown) => String(value || '').trim()

export async function loadVendorProductIds(adminDb: any, userId: string) {
  const safeUserId = toSafeId(userId)
  if (!safeUserId) return []

  const { data: vendorRow, error: vendorError } = await adminDb
    .from('vendors')
    .select('id')
    .eq('user_id', safeUserId)
    .maybeSingle()

  if (vendorError || !vendorRow?.id) return []

  const { data: productRows, error: productError } = await adminDb
    .from('products')
    .select('id')
    .eq('vendor_id', vendorRow.id)

  if (productError) {
    throw new Error('Unable to load vendor product scope.')
  }

  return (Array.isArray(productRows) ? productRows : [])
    .map((row: { id?: string | null }) => toSafeId(row?.id))
    .filter(Boolean)
}

export async function loadVendorOrderIds(adminDb: any, productIds: string[]) {
  const scopedProductIds = Array.isArray(productIds)
    ? productIds.map((id) => toSafeId(id)).filter(Boolean)
    : []
  if (scopedProductIds.length === 0) return []

  const { data: itemRows, error: itemError } = await adminDb
    .from('checkout_order_items')
    .select('order_id, created_at')
    .in('product_id', scopedProductIds)
    .order('created_at', { ascending: false })
    .limit(MAX_VENDOR_ITEM_SCAN)

  if (itemError) {
    throw new Error('Unable to load vendor order scope.')
  }

  return Array.from(
    new Set(
      (Array.isArray(itemRows) ? (itemRows as VendorOrderItemIdRow[]) : [])
        .map((row) => toSafeId(row?.order_id))
        .filter(Boolean),
    ),
  )
}
