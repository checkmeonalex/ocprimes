'use client'

import Link from 'next/link'
import { useMemo, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUserI18n } from '@/lib/i18n/useUserI18n'
import { useOptionalCart } from '@/context/CartContext'

const DATE_FILTERS = [
  { key: 'latest', label: 'Latest' },
  { key: 'last_1_day', label: 'Last 1 day' },
  { key: 'last_3_days', label: 'Last 3 days' },
  { key: 'last_1_week', label: 'Last 1 week' },
  { key: 'last_1_month', label: 'Last 1 month' },
]

const formatDateTime = (value) => {
  const timestamp = new Date(value || '').getTime()
  if (Number.isNaN(timestamp)) return ''
  return new Date(timestamp).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getDateCutoff = (dateFilterKey) => {
  const now = Date.now()
  if (dateFilterKey === 'last_1_day') return now - 24 * 60 * 60 * 1000
  if (dateFilterKey === 'last_3_days') return now - 3 * 24 * 60 * 60 * 1000
  if (dateFilterKey === 'last_1_week') return now - 7 * 24 * 60 * 60 * 1000
  if (dateFilterKey === 'last_1_month') return now - 30 * 24 * 60 * 60 * 1000
  return null
}

const toItemCountLabel = (count) => {
  const next = Math.max(0, Number(count || 0))
  return `${next} Item${next === 1 ? '' : 's'}`
}

const getOrdersTitle = (filterKey) => {
  const key = String(filterKey || 'all')
  if (key === 'all') return 'All orders'
  if (key === 'cancelled') return 'Cancel'
  if (key === 'completed') return 'Completed'
  if (key === 'pending') return 'Pending'
  if (key === 'failed') return 'Failed'
  return 'All orders'
}

const matchesStatusFilter = (entry, filterKey) => {
  const key = String(filterKey || 'all')
  const paymentStatus = String(entry?.paymentStatus || '').toLowerCase()
  const uiStatus = String(entry?.status || '').toLowerCase()
  const orderType = String(entry?.orderType || 'delivery').toLowerCase()

  if (key === 'all') return true
  if (key === 'delivery') return orderType === 'delivery'
  if (key === 'completed') return paymentStatus === 'paid' || uiStatus === 'completed'
  if (key === 'pending') return paymentStatus === 'pending'
  if (key === 'failed') return paymentStatus === 'failed'
  if (key === 'cancelled') return paymentStatus === 'cancelled' || uiStatus === 'cancelled'
  return false
}

export default function OrdersPage() {
  const router = useRouter()
  const { formatMoney } = useUserI18n()
  const cart = useOptionalCart()
  const addItem = cart?.addItem || (() => {})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState([])

  const [statusFilter] = useState('all')
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [draftOrderType, setDraftOrderType] = useState('all')
  const [draftDateFilter, setDraftDateFilter] = useState('latest')
  const [appliedOrderType, setAppliedOrderType] = useState('all')
  const [appliedDateFilter, setAppliedDateFilter] = useState('latest')
  const [reorderLoadingByOrderId, setReorderLoadingByOrderId] = useState({})
  const [reorderPopup, setReorderPopup] = useState(null)
  const [recommendationAddingById, setRecommendationAddingById] = useState({})
  const pageTitle = getOrdersTitle(appliedOrderType)

  useEffect(() => {
    let isActive = true
    const loadOrders = async () => {
      setIsLoading(true)
      setError('')
      try {
        const response = await fetch('/api/user/orders', {
          method: 'GET',
          cache: 'no-store',
        })
        const payload = await response.json().catch(() => null)
        if (!isActive) return
        if (response.status === 401) {
          router.push('/login?next=/UserBackend/orders')
          return
        }
        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to load orders.')
        }
        setOrders(Array.isArray(payload?.items) ? payload.items : [])
      } catch (nextError) {
        if (!isActive) return
        setOrders([])
        setError(nextError?.message || 'Unable to load orders.')
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    void loadOrders()
    return () => {
      isActive = false
    }
  }, [router])

  const filteredOrders = useMemo(() => {
    const byStatus = orders.filter((entry) => matchesStatusFilter(entry, statusFilter))

    const byType =
      appliedOrderType === 'all'
        ? byStatus
        : byStatus.filter((entry) => matchesStatusFilter(entry, appliedOrderType))

    const cutoff = getDateCutoff(appliedDateFilter)
    if (!cutoff) return byType

    return byType.filter((entry) => {
      const timestamp = new Date(entry?.createdAt || '').getTime()
      if (Number.isNaN(timestamp)) return false
      return timestamp >= cutoff
    })
  }, [orders, statusFilter, appliedOrderType, appliedDateFilter])

  const applyFilter = () => {
    setAppliedOrderType(draftOrderType)
    setAppliedDateFilter(draftDateFilter)
    setIsFilterSheetOpen(false)
  }

  const handleReorder = async (orderId) => {
    const safeOrderId = String(orderId || '').trim()
    if (!safeOrderId || reorderLoadingByOrderId[safeOrderId]) return

    setReorderLoadingByOrderId((prev) => ({ ...prev, [safeOrderId]: true }))
    setReorderPopup(null)

    try {
      const response = await fetch('/api/user/orders/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId: safeOrderId }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to reorder items.')
      }

      const addedQuantity = Math.max(0, Number(payload?.addedQuantity || 0))
      const missingItems = Array.isArray(payload?.missingItems) ? payload.missingItems : []
      const recommendations = Array.isArray(payload?.recommendations) ? payload.recommendations : []
      const hasMissing = missingItems.length > 0

      setReorderPopup({
        status: hasMissing ? 'warning' : 'success',
        message:
          addedQuantity > 0
            ? `Added ${addedQuantity} item${addedQuantity === 1 ? '' : 's'} to your cart.`
            : 'No items were added to your cart.',
        missingItems,
        recommendations,
      })
    } catch (nextError) {
      setReorderPopup({
        status: 'error',
        message: nextError?.message || 'Unable to reorder items.',
        missingItems: [],
        recommendations: [],
      })
    } finally {
      setReorderLoadingByOrderId((prev) => ({ ...prev, [safeOrderId]: false }))
    }
  }

  const handleAddRecommendedToCart = (item, event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!item?.id) return

    const product = {
      id: String(item.id),
      slug: item.slug ? String(item.slug) : null,
      name: String(item.name || 'Product'),
      image: item.image ? String(item.image) : null,
      price: Number(item.price || 0),
      originalPrice:
        item.originalPrice !== null && item.originalPrice !== undefined
          ? Number(item.originalPrice)
          : null,
    }

    setRecommendationAddingById((prev) => ({ ...prev, [product.id]: true }))
    addItem(product, 1)
    window.setTimeout(() => {
      setRecommendationAddingById((prev) => ({ ...prev, [product.id]: false }))
    }, 450)
  }

  return (
    <section className='min-h-[calc(100vh-7rem)] w-full'>
      <div className='border-b border-slate-200 bg-white px-3 pb-3 pt-4'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-semibold text-slate-900'>{pageTitle}</h1>
          <button
            type='button'
            onClick={() => setIsFilterSheetOpen(true)}
            className='inline-flex h-8 w-8 items-center justify-center rounded-full text-[#925428] hover:bg-slate-100'
            aria-label='Open order filters'
          >
            <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='1.8'>
              <path d='M4 6h10M4 12h16M4 18h10' strokeLinecap='round' />
              <circle cx='16' cy='6' r='2.2' />
              <circle cx='10' cy='18' r='2.2' />
            </svg>
          </button>
        </div>

      </div>

      <div className='pb-6 pt-3'>
        {error ? (
          <div className='rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
            {error}
          </div>
        ) : null}

        <div className='space-y-2'>
          {isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <div key={`orders-skeleton-${index}`} className='rounded-xl border border-slate-200 bg-white p-3'>
                  <div className='h-4 w-2/3 animate-pulse rounded bg-slate-200' />
                  <div className='mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-100' />
                  <div className='mt-3 h-8 w-full animate-pulse rounded bg-slate-100' />
                </div>
              ))
            : null}

          {!isLoading && filteredOrders.length === 0 ? (
            <div className='rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center'>
              <p className='text-sm font-semibold text-slate-700'>No order yet</p>
              <p className='mt-1 text-sm text-slate-500'>You have not placed any order.</p>
              <Link
                href='/'
                className='mt-4 inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-xs font-semibold text-white'
              >
                Place order
              </Link>
            </div>
          ) : null}

          {!isLoading &&
            filteredOrders.map((order) => (
              <article key={order.id} className='rounded-xl border border-slate-200 bg-white p-3'>
                <div className='flex items-center justify-between'>
                  <span className='inline-flex rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white'>
                    {order.status === 'completed' ? 'Success' : order.status}
                  </span>
                  <Link href={`/UserBackend/orders/${order.id}`} className='inline-flex items-center gap-1 text-sm font-medium text-slate-800'>
                    <span>See Details</span>
                    <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2'>
                      <path d='M8 5l5 5-5 5' strokeLinecap='round' strokeLinejoin='round' />
                    </svg>
                  </Link>
                </div>

                <div className='mt-2 min-w-0'>
                  <p className='line-clamp-2 text-[21px] leading-7 font-medium text-slate-900 sm:text-base sm:leading-6'>
                    {order.orderNumber}
                  </p>
                  <p className='mt-1 line-clamp-1 text-xs text-slate-500'>{formatDateTime(order.createdAt)}</p>
                  <p className='mt-2 line-clamp-2 text-sm text-slate-700'>{order.previewText}</p>
                </div>

                <div className='mt-2 flex items-center justify-between border-t border-slate-200 pt-2'>
                  <p className='text-base font-medium text-slate-900'>
                    {toItemCountLabel(order.itemCount)} <span className='text-slate-400'>•</span>{' '}
                    {formatMoney(order.totalAmount)}
                  </p>
                  <button
                    type='button'
                    onClick={() => handleReorder(order.id)}
                    disabled={Boolean(reorderLoadingByOrderId[order.id])}
                    className='inline-flex h-8 items-center justify-center rounded-md border border-[#c67a45] px-3 text-xs font-semibold text-[#c67a45] disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    {reorderLoadingByOrderId[order.id] ? 'Re-Ordering...' : 'Re-Order'}
                  </button>
                </div>
              </article>
            ))}
        </div>
      </div>

      {reorderPopup ? (
        <div className='fixed inset-0 z-50 bg-black/40' onClick={() => setReorderPopup(null)}>
          <div
            className='absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl'
            onClick={(event) => event.stopPropagation()}
          >
            <div className='mb-2 flex items-center justify-between'>
              <p className='text-sm font-semibold text-slate-900'>Product added to cart</p>
              <button
                type='button'
                className='inline-flex h-7 w-7 items-center justify-center text-slate-500'
                onClick={() => setReorderPopup(null)}
                aria-label='Close popup'
              >
                <svg viewBox='0 0 20 20' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='2'>
                  <path d='m5 5 10 10M15 5 5 15' strokeLinecap='round' />
                </svg>
              </button>
            </div>

            <p
              className={`text-xs ${
                reorderPopup.status === 'success'
                  ? 'text-emerald-700'
                  : reorderPopup.status === 'warning'
                    ? 'text-amber-700'
                    : 'text-rose-700'
              }`}
            >
              {reorderPopup.message}
            </p>

            {Array.isArray(reorderPopup.missingItems) && reorderPopup.missingItems.length > 0 ? (
              <div className='mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2'>
                {reorderPopup.missingItems.map((entry, index) => (
                  <p key={`${entry.productId || entry.name}-${index}`} className='text-[11px] text-amber-800'>
                    {entry.reason === 'Limited stock'
                      ? `We don't have ${entry.requestedQuantity} of ${entry.name}${
                          entry.attributeSummary ? ` (${entry.attributeSummary})` : ''
                        }. We only have ${entry.availableQuantity}. Added ${entry.addedQuantity} to cart.`
                      : `${entry.name}${entry.attributeSummary ? ` (${entry.attributeSummary})` : ''} is not available.`}
                  </p>
                ))}
              </div>
            ) : null}

            {Array.isArray(reorderPopup.recommendations) && reorderPopup.recommendations.length > 0 ? (
              <div className='mt-3'>
                <p className='text-base font-semibold text-slate-900'>Recommended accessories</p>
                <div className='mt-2 flex gap-2 overflow-x-auto pb-1'>
                  {reorderPopup.recommendations.map((item) => (
                    <Link
                      key={item.id}
                      href={`/product/${item.slug}`}
                      className='relative w-32 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'
                    >
                      <div className='relative aspect-square w-full overflow-hidden bg-slate-100'>
                        {item.image ? (
                          <Image src={item.image} alt={item.name || 'Product'} fill sizes='128px' className='object-cover' />
                        ) : null}
                        <button
                          type='button'
                          aria-label='Add to cart'
                          onClick={(event) => handleAddRecommendedToCart(item, event)}
                          className='absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-black shadow-sm transition hover:bg-gray-50'
                        >
                          {recommendationAddingById[item.id] ? (
                            <span className='h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700' />
                          ) : (
                            <svg
                              viewBox='0 0 24 24'
                              className='h-4 w-4 text-black'
                              fill='none'
                              stroke='currentColor'
                              strokeWidth='3'
                              strokeLinecap='round'
                            >
                              <path d='M12 5v14M5 12h14' />
                            </svg>
                          )}
                        </button>
                      </div>
                      <div className='p-2'>
                        <p className='line-clamp-2 text-[11px] font-medium text-slate-800'>{item.name}</p>
                        <p className='mt-1 text-xs font-semibold text-slate-900'>{formatMoney(item.price)}</p>
                        {Number(item.originalPrice || 0) > Number(item.price || 0) ? (
                          <p className='mt-0.5 text-[10px] text-slate-400 line-through'>
                            {formatMoney(item.originalPrice)}
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            <Link
              href='/cart'
              className='mt-4 inline-flex h-11 w-full items-center justify-center rounded-md bg-black text-sm font-semibold text-white'
              onClick={() => setReorderPopup(null)}
            >
              Go to cart
            </Link>
            <button
              type='button'
              className='mt-2 inline-flex h-11 w-full items-center justify-center rounded-md border border-slate-300 text-sm font-semibold text-slate-900'
              onClick={() => setReorderPopup(null)}
            >
              Continue shopping
            </button>
          </div>
        </div>
      ) : null}

      {isFilterSheetOpen ? (
        <div className='fixed inset-0 z-40 bg-black/35 sm:hidden' onClick={() => setIsFilterSheetOpen(false)}>
          <div
            className='absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4'
            onClick={(event) => event.stopPropagation()}
          >
            <div className='mx-auto mb-3 h-1.5 w-16 rounded-full bg-slate-300' />
            <h2 className='text-2xl font-semibold text-slate-900'>Order Type</h2>
            <div className='mt-2 space-y-2'>
              {[
                { key: 'all', label: 'All' },
                { key: 'completed', label: 'Completed' },
                { key: 'pending', label: 'Pending' },
                { key: 'failed', label: 'Failed' },
                { key: 'cancelled', label: 'Cancelled' },
              ].map((option) => (
                <label key={option.key} className='flex items-center gap-2 text-sm text-slate-700'>
                  <input
                    type='radio'
                    name='order-type'
                    checked={draftOrderType === option.key}
                    onChange={() => setDraftOrderType(option.key)}
                    className='accent-[#b16a3d]'
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>

            <h3 className='mt-4 text-xl font-semibold text-slate-900'>Sort by Date</h3>
            <div className='mt-2 space-y-2'>
              {DATE_FILTERS.map((option) => (
                <label key={option.key} className='flex items-center gap-2 text-sm text-slate-700'>
                  <input
                    type='radio'
                    name='date-filter'
                    checked={draftDateFilter === option.key}
                    onChange={() => setDraftDateFilter(option.key)}
                    className='accent-[#b16a3d]'
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>

            <button
              type='button'
              onClick={applyFilter}
              className='mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-[#b16a3d] text-sm font-semibold text-white'
            >
              Apply Filter
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
