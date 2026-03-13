import { convertCurrencyAmount } from '@/lib/i18n/exchange-rates'
import { readExchangeRatesPayload } from '@/lib/i18n/exchange-rate-service'
import { resolveDashboardRange } from '@/lib/admin/dashboard-range'
import { loadVendorOrderIds, loadVendorProductIds } from '@/lib/orders/vendor-scope'

const PAID_STATUS = 'paid'
const DASHBOARD_CURRENCY = 'NGN'
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const toSafeText = (value: unknown) => String(value || '').trim()

const toSafeNumber = (value: unknown) => {
  const next = Number(value)
  return Number.isFinite(next) ? next : 0
}

const startOfDay = (value = new Date()) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate())

const shiftDays = (value: Date, delta: number) => {
  const next = new Date(value)
  next.setDate(next.getDate() + delta)
  return next
}

const isWithinWindow = (dateValue: string, start: Date, endExclusive?: Date) => {
  const timestamp = new Date(String(dateValue || '')).getTime()
  if (!Number.isFinite(timestamp)) return false
  if (timestamp < start.getTime()) return false
  if (endExclusive && timestamp >= endExclusive.getTime()) return false
  return true
}

const buildDayKeys = (start: Date, days: number) =>
  Array.from({ length: days }, (_, index) => {
    const date = shiftDays(start, index)
    return date.toISOString().slice(0, 10)
  })

const buildEmptyDayMap = (keys: string[]) =>
  keys.reduce<Record<string, number>>((accumulator, key) => {
    accumulator[key] = 0
    return accumulator
  }, {})

const toDayKey = (value: string) => {
  const date = new Date(String(value || ''))
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

const formatChangeLabel = (current: number, previous: number, comparisonLabel: string) => {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return 'No prior data'
  }
  if (previous <= 0) {
    return current > 0 ? 'New activity' : 'No prior data'
  }
  const diff = ((current - previous) / previous) * 100
  const sign = diff >= 0 ? '+' : ''
  return `${sign}${diff.toFixed(0)}% vs ${comparisonLabel}`
}

const normalizeCurrencyCode = (value: unknown) => {
  const next = toSafeText(value).toUpperCase()
  return next || DASHBOARD_CURRENCY
}

const isUuid = (value: unknown) => UUID_PATTERN.test(toSafeText(value))

const toDashboardCurrency = (
  amount: number,
  sourceCurrency: string,
  unitPerUsd: Record<string, number>,
) => {
  if (!Number.isFinite(amount)) return 0
  return convertCurrencyAmount(
    amount,
    normalizeCurrencyCode(sourceCurrency) as any,
    DASHBOARD_CURRENCY as any,
    unitPerUsd as any,
  )
}

type DashboardActor = {
  isAdmin: boolean
  isVendor: boolean
  user: { id?: string | null } | null
}

const buildEmptyBucketMap = (buckets: Array<{ key: string }>) =>
  buckets.reduce<Record<string, number>>((accumulator, bucket) => {
    accumulator[bucket.key] = 0
    return accumulator
  }, {})

const findBucketKey = (
  value: string,
  buckets: Array<{ key: string; start: Date; end: Date }>,
) => {
  const timestamp = new Date(String(value || '')).getTime()
  if (!Number.isFinite(timestamp)) return ''
  const bucket = buckets.find(
    (entry) => timestamp >= entry.start.getTime() && timestamp < entry.end.getTime(),
  )
  return bucket?.key || ''
}

export async function loadDashboardStats(adminDb: any, actor: DashboardActor, rangeInput?: unknown) {
  const resolvedRange = resolveDashboardRange(rangeInput)
  const currentWindowStart = resolvedRange.currentStart
  const currentWindowEnd = resolvedRange.currentEnd
  const previousWindowStart = resolvedRange.previousStart
  const previousWindowEnd = resolvedRange.previousEnd
  const queryStartIso = previousWindowStart.toISOString()
  const queryEndIso = currentWindowEnd.toISOString()
  const exchangeRates = await readExchangeRatesPayload(adminDb)
  const unitPerUsd = exchangeRates.unitPerUsd
  const isSellerScoped = actor.isVendor && !actor.isAdmin
  const sellerUserId = toSafeText(actor.user?.id)

  let scopedProductIds: string[] = []
  if (isSellerScoped) {
    scopedProductIds = await loadVendorProductIds(adminDb, sellerUserId)
  }

  const totalProductsPromise = isSellerScoped
    ? Promise.resolve(scopedProductIds.length)
    : adminDb
        .from('products')
        .select('id', { count: 'exact', head: true })
        .then((result: any) => Number(result.count || 0))

  const liveProductsPromise = (() => {
    let query = adminDb
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'publish')
    if (isSellerScoped) {
      if (!scopedProductIds.length) return Promise.resolve(0)
      query = query.in('id', scopedProductIds)
    }
    return query.then((result: any) => Number(result.count || 0))
  })()

  const currentNewProductsPromise = (() => {
    let query = adminDb
      .from('products')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', currentWindowStart.toISOString())
      .lt('created_at', currentWindowEnd.toISOString())
    if (isSellerScoped) {
      if (!scopedProductIds.length) return Promise.resolve(0)
      query = query.in('id', scopedProductIds)
    }
    return query.then((result: any) => Number(result.count || 0))
  })()

  const previousNewProductsPromise = (() => {
    let query = adminDb
      .from('products')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', previousWindowStart.toISOString())
      .lt('created_at', previousWindowEnd.toISOString())
    if (isSellerScoped) {
      if (!scopedProductIds.length) return Promise.resolve(0)
      query = query.in('id', scopedProductIds)
    }
    return query.then((result: any) => Number(result.count || 0))
  })()

  let orderRows: Array<{
    id?: string | null
    user_id?: string | null
    total_amount?: number | null
    currency?: string | null
    payment_status?: string | null
    created_at?: string | null
  }> = []
  let itemRows: Array<{
    order_id?: string | null
    product_id?: string | null
    name?: string | null
    image?: string | null
    quantity?: number | null
    line_total?: number | null
    created_at?: string | null
  }> = []

  if (isSellerScoped) {
    if (scopedProductIds.length > 0) {
      const vendorOrderIds = await loadVendorOrderIds(adminDb, scopedProductIds)
      if (vendorOrderIds.length > 0) {
        const { data: scopedOrders, error: scopedOrdersError } = await adminDb
          .from('checkout_orders')
          .select('id, user_id, total_amount, currency, payment_status, created_at')
          .in('id', vendorOrderIds)
          .gte('created_at', queryStartIso)
          .lt('created_at', queryEndIso)

        if (scopedOrdersError) {
          throw new Error('Unable to load dashboard orders.')
        }

        orderRows = Array.isArray(scopedOrders) ? scopedOrders : []
        const scopedOrderIds = orderRows.map((row) => toSafeText(row?.id)).filter(Boolean)

        if (scopedOrderIds.length > 0) {
          const { data: scopedItems, error: scopedItemsError } = await adminDb
            .from('checkout_order_items')
            .select('order_id, product_id, name, image, quantity, line_total, created_at')
            .in('order_id', scopedOrderIds)
            .in('product_id', scopedProductIds)
            .gte('created_at', queryStartIso)
            .lt('created_at', queryEndIso)

          if (scopedItemsError) {
            throw new Error('Unable to load dashboard order items.')
          }

          itemRows = Array.isArray(scopedItems) ? scopedItems : []
        }
      }
    }
  } else {
    const [{ data: allOrders, error: allOrdersError }, { data: allItems, error: allItemsError }] =
      await Promise.all([
        adminDb
          .from('checkout_orders')
          .select('id, user_id, total_amount, currency, payment_status, created_at')
          .gte('created_at', queryStartIso)
          .lt('created_at', queryEndIso),
        adminDb
          .from('checkout_order_items')
          .select('order_id, product_id, name, image, quantity, line_total, created_at')
          .gte('created_at', queryStartIso)
          .lt('created_at', queryEndIso),
      ])

    if (allOrdersError) {
      throw new Error('Unable to load dashboard orders.')
    }
    if (allItemsError) {
      throw new Error('Unable to load dashboard order items.')
    }

    orderRows = Array.isArray(allOrders) ? allOrders : []
    itemRows = Array.isArray(allItems) ? allItems : []
  }

  const [totalProducts, liveProducts, currentNewProducts, previousNewProducts] = await Promise.all([
    totalProductsPromise,
    liveProductsPromise,
    currentNewProductsPromise,
    previousNewProductsPromise,
  ])

  const orderById = new Map(orderRows.map((row) => [toSafeText(row.id), row]))
  const currentPaidOrderIds = new Set<string>()
  const previousPaidOrderIds = new Set<string>()
  const currentCustomers = new Set<string>()
  const previousCustomers = new Set<string>()
  const currentRevenueByBucket = buildEmptyBucketMap(resolvedRange.currentBuckets)
  const previousRevenueByBucket = buildEmptyBucketMap(resolvedRange.previousBuckets)
  const currentOrdersByBucket = buildEmptyBucketMap(resolvedRange.currentBuckets)
  const previousOrdersByBucket = buildEmptyBucketMap(resolvedRange.previousBuckets)

  let currentRevenue = 0
  let previousRevenue = 0
  let previousSoldQuantity = 0

  orderRows.forEach((row) => {
    const orderId = toSafeText(row.id)
    if (!orderId) return
    const paymentStatus = toSafeText(row.payment_status).toLowerCase()
    if (paymentStatus !== PAID_STATUS) return
    const createdAt = toSafeText(row.created_at)
    const orderUserId = toSafeText(row.user_id)
    const currentBucketKey = findBucketKey(createdAt, resolvedRange.currentBuckets)
    const previousBucketKey = findBucketKey(createdAt, resolvedRange.previousBuckets)

    if (isWithinWindow(createdAt, currentWindowStart, currentWindowEnd)) {
      currentPaidOrderIds.add(orderId)
      if (orderUserId) currentCustomers.add(orderUserId)
      if (!isSellerScoped) {
        currentRevenue += toDashboardCurrency(
          toSafeNumber(row.total_amount),
          normalizeCurrencyCode(row.currency),
          unitPerUsd,
        )
      }
      if (currentBucketKey && currentOrdersByBucket[currentBucketKey] !== undefined) {
        currentOrdersByBucket[currentBucketKey] += 1
        if (!isSellerScoped) {
          currentRevenueByBucket[currentBucketKey] += toDashboardCurrency(
            toSafeNumber(row.total_amount),
            normalizeCurrencyCode(row.currency),
            unitPerUsd,
          )
        }
      }
      return
    }

    if (isWithinWindow(createdAt, previousWindowStart, previousWindowEnd)) {
      previousPaidOrderIds.add(orderId)
      if (orderUserId) previousCustomers.add(orderUserId)
      if (!isSellerScoped) {
        previousRevenue += toDashboardCurrency(
          toSafeNumber(row.total_amount),
          normalizeCurrencyCode(row.currency),
          unitPerUsd,
        )
      }
      if (previousBucketKey && previousOrdersByBucket[previousBucketKey] !== undefined) {
        previousOrdersByBucket[previousBucketKey] += 1
        if (!isSellerScoped) {
          previousRevenueByBucket[previousBucketKey] += toDashboardCurrency(
            toSafeNumber(row.total_amount),
            normalizeCurrencyCode(row.currency),
            unitPerUsd,
          )
        }
      }
    }
  })

  const currentProductAgg = new Map<
    string,
    {
      productId: string
      name: string
      image: string | null
      quantity: number
      earning: number
    }
  >()

  itemRows.forEach((row) => {
    const orderId = toSafeText(row.order_id)
    const productId = toSafeText(row.product_id)
    if (!orderId || !productId) return
    const order = orderById.get(orderId)
    const createdAt = toSafeText(order?.created_at || row.created_at)
    const orderCurrency = normalizeCurrencyCode(order?.currency)
    const lineTotalNgn = toDashboardCurrency(toSafeNumber(row.line_total), orderCurrency, unitPerUsd)
    const quantity = Math.max(0, toSafeNumber(row.quantity))
    const currentBucketKey = findBucketKey(createdAt, resolvedRange.currentBuckets)
    const previousBucketKey = findBucketKey(createdAt, resolvedRange.previousBuckets)

    if (currentPaidOrderIds.has(orderId)) {
      if (isSellerScoped) {
        currentRevenue += lineTotalNgn
        if (currentBucketKey && currentRevenueByBucket[currentBucketKey] !== undefined) {
          currentRevenueByBucket[currentBucketKey] += lineTotalNgn
        }
      }

      const existing = currentProductAgg.get(productId) || {
        productId,
        name: toSafeText(row.name) || 'Product',
        image: toSafeText(row.image) || null,
        quantity: 0,
        earning: 0,
      }
      existing.quantity += quantity
      existing.earning += lineTotalNgn
      if (!existing.image && toSafeText(row.image)) {
        existing.image = toSafeText(row.image)
      }
      if (!existing.name && toSafeText(row.name)) {
        existing.name = toSafeText(row.name)
      }
      currentProductAgg.set(productId, existing)
      return
    }

    if (previousPaidOrderIds.has(orderId)) {
      previousSoldQuantity += quantity
      if (isSellerScoped) {
        previousRevenue += lineTotalNgn
        if (previousBucketKey && previousRevenueByBucket[previousBucketKey] !== undefined) {
          previousRevenueByBucket[previousBucketKey] += lineTotalNgn
        }
      }
    }
  })

  const sortedProducts = Array.from(currentProductAgg.values()).sort((left, right) => {
    if (right.earning !== left.earning) return right.earning - left.earning
    return right.quantity - left.quantity
  })

  const topProductIds = sortedProducts
    .slice(0, 20)
    .map((entry) => entry.productId)
    .filter((value, index, list) => Boolean(value) && list.indexOf(value) === index)
  const safeTopProductIds = topProductIds.filter((value) => isUuid(value))
  const { data: productMetaRows, error: productMetaError } = safeTopProductIds.length
    ? await adminDb
        .from('products')
        .select('id, name, price, created_at')
        .in('id', safeTopProductIds)
    : { data: [], error: null as any }

  if (productMetaError) {
    console.error('dashboard product meta load failed:', productMetaError)
  }

  const productMetaById = new Map(
    (Array.isArray(productMetaRows) ? productMetaRows : []).map((row: any) => [
      toSafeText(row.id),
      row,
    ]),
  )

  const topProducts = sortedProducts.slice(0, 5).map((entry) => {
    const meta = productMetaById.get(entry.productId)
    return {
      id: entry.productId,
      name: toSafeText(meta?.name) || entry.name || 'Product',
      dateAdded: toSafeText(meta?.created_at),
      price: toSafeNumber(meta?.price),
      earning: entry.earning,
      quantity: entry.quantity,
      image: entry.image,
    }
  })

  const maxSoldQuantity = sortedProducts[0]?.quantity || 0
  const topSoldItems = sortedProducts.slice(0, 5).map((entry) => ({
    id: entry.productId,
    name: productMetaById.get(entry.productId)?.name || entry.name || 'Product',
    quantity: entry.quantity,
    percent: maxSoldQuantity > 0 ? Math.max(8, Math.round((entry.quantity / maxSoldQuantity) * 100)) : 0,
  }))

  return {
    range: {
      key: resolvedRange.key,
      label: resolvedRange.label,
      windowLabel: resolvedRange.windowLabel,
      comparisonLabel: resolvedRange.comparisonLabel,
    },
    currency: DASHBOARD_CURRENCY,
    isSellerScoped,
    windowDays: Math.max(
      1,
      Math.round((currentWindowEnd.getTime() - currentWindowStart.getTime()) / (24 * 60 * 60 * 1000)),
    ),
    chartDays: resolvedRange.currentBuckets.length,
    stats: {
      revenue: {
        label: 'Total Sales',
        value: currentRevenue,
        note: formatChangeLabel(currentRevenue, previousRevenue, resolvedRange.comparisonLabel),
      },
      products: {
        label: 'Total Products',
        value: totalProducts,
        note:
          currentNewProducts > 0 || previousNewProducts > 0
            ? `${currentNewProducts} added in ${resolvedRange.windowLabel.toLowerCase()}`
            : `${liveProducts} live products`,
      },
      orders: {
        label: 'Total Orders',
        value: currentPaidOrderIds.size,
        note: formatChangeLabel(
          currentPaidOrderIds.size,
          previousPaidOrderIds.size,
          resolvedRange.comparisonLabel,
        ),
      },
      customers: {
        label: 'Total Customers',
        value: currentCustomers.size,
        note: formatChangeLabel(
          currentCustomers.size,
          previousCustomers.size,
          resolvedRange.comparisonLabel,
        ),
      },
    },
    overview: {
      totalProducts,
      liveProducts,
      revenue: currentRevenue,
      sold: sortedProducts.reduce((sum, entry) => sum + Math.max(0, Number(entry.quantity) || 0), 0),
      previousRevenue,
      previousSold: previousSoldQuantity,
    },
    charts: {
      revenue: {
        current: resolvedRange.currentBuckets.map((bucket) => currentRevenueByBucket[bucket.key] || 0),
        previous: resolvedRange.previousBuckets.map((bucket) => previousRevenueByBucket[bucket.key] || 0),
      },
      orders: {
        current: resolvedRange.currentBuckets.map((bucket) => currentOrdersByBucket[bucket.key] || 0),
        previous: resolvedRange.previousBuckets.map((bucket) => previousOrdersByBucket[bucket.key] || 0),
      },
      labels: resolvedRange.currentBuckets.map((bucket) => bucket.label),
    },
    topProducts,
    topSoldItems,
  }
}
