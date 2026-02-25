const MAX_VENDOR_ITEM_SCAN = 5000

type VendorBrandRow = { id?: string | null }
type VendorProductRow = { product_id?: string | null }
type VendorOrderItemIdRow = { order_id?: string | null }

const toSafeId = (value: unknown) => String(value || '').trim()

export async function loadVendorProductIds(adminDb: any, userId: string) {
  const safeUserId = toSafeId(userId)
  if (!safeUserId) return []

  const { data: brandRows, error: brandError } = await adminDb
    .from('admin_brands')
    .select('id')
    .eq('created_by', safeUserId)

  if (brandError) {
    throw new Error('Unable to load vendor brand scope.')
  }

  const brandIds = (Array.isArray(brandRows) ? (brandRows as VendorBrandRow[]) : [])
    .map((row) => toSafeId(row?.id))
    .filter(Boolean)

  if (brandIds.length === 0) return []

  const { data: linkRows, error: linkError } = await adminDb
    .from('product_brand_links')
    .select('product_id')
    .in('brand_id', brandIds)

  if (linkError) {
    throw new Error('Unable to load vendor product scope.')
  }

  return Array.from(
    new Set(
      (Array.isArray(linkRows) ? (linkRows as VendorProductRow[]) : [])
        .map((row) => toSafeId(row?.product_id))
        .filter(Boolean),
    ),
  )
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

