'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AdminSidebar from '@/components/AdminSidebar'
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader'
import CustomSelect from '@/components/common/CustomSelect'

const PER_PAGE = 10

const STATUS_TABS = [
  { key: 'all', label: 'All Order' },
  { key: 'pending', label: 'Pending' },
  { key: 'awaiting_payment', label: 'Awaiting Payment' },
  { key: 'payment_failed', label: 'Payment Failed' },
  { key: 'processing', label: 'Processing' },
  { key: 'ready_to_ship', label: 'Ready To Ship' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'refunded', label: 'Refunded' },
  { key: 'cancelled', label: 'Cancelled' },
]

const STATUS_OPTIONS = [
  { key: 'pending', label: 'Pending' },
  { key: 'awaiting_payment', label: 'Awaiting Payment' },
  { key: 'payment_failed', label: 'Payment Failed' },
  { key: 'processing', label: 'Processing' },
  { key: 'ready_to_ship', label: 'Ready To Ship' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'refunded', label: 'Refunded' },
  { key: 'cancelled', label: 'Cancelled' },
]

const STATUS_TONES = {
  pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  awaiting_payment: 'bg-amber-100 text-amber-700 border border-amber-200',
  payment_failed: 'bg-rose-100 text-rose-700 border border-rose-200',
  processing: 'bg-sky-100 text-sky-700 border border-sky-200',
  ready_to_ship: 'bg-cyan-100 text-cyan-700 border border-cyan-200',
  out_for_delivery: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  delivered: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  refunded: 'bg-orange-100 text-orange-700 border border-orange-200',
  cancelled: 'bg-rose-100 text-rose-700 border border-rose-200',
}

const MOBILE_STATUS_TONES = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  awaiting_payment: 'bg-amber-50 text-amber-700 border border-amber-200',
  payment_failed: 'bg-rose-50 text-rose-700 border border-rose-200',
  processing: 'bg-sky-50 text-sky-700 border border-sky-200',
  ready_to_ship: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  out_for_delivery: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  delivered: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  refunded: 'bg-orange-50 text-orange-700 border border-orange-200',
  cancelled: 'bg-rose-50 text-rose-700 border border-rose-200',
}

const MOBILE_SUMMARY_CARDS = [
  {
    key: 'pending',
    label: 'Pending Orders',
    note: 'Awaiting confirmation',
    tone: 'text-amber-600',
    dot: 'bg-amber-400',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    note: 'Being packaged & processed',
    tone: 'text-sky-600',
    dot: 'bg-sky-400',
  },
  {
    key: 'delivered',
    label: 'Completed',
    note: 'Delivered successfully',
    tone: 'text-emerald-600',
    dot: 'bg-emerald-400',
  },
  {
    key: 'cancelled',
    label: 'Canceled',
    note: 'Marked as canceled',
    tone: 'text-rose-600',
    dot: 'bg-rose-400',
  },
]

const MOBILE_FILTER_TABS = [
  { key: 'product', label: 'Product' },
  { key: 'payment', label: 'Payment' },
  { key: 'date_range', label: 'Date Range' },
  { key: 'status', label: 'Status' },
]

const MOBILE_SORT_OPTIONS = [
  { key: 'newest', label: 'Newest First' },
  { key: 'oldest', label: 'Oldest First' },
  { key: 'amount_desc', label: 'Amount: High to Low' },
  { key: 'amount_asc', label: 'Amount: Low to High' },
]

const MOBILE_PAYMENT_OPTIONS = [
  { key: 'all', label: 'All Payments' },
  { key: 'paid', label: 'Paid' },
  { key: 'pending', label: 'Awaiting Payment' },
  { key: 'failed', label: 'Failed' },
]

const MOBILE_DATE_RANGE_OPTIONS = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'last_7_days', label: 'Last 7 Days' },
  { key: 'last_30_days', label: 'Last 30 Days' },
]

const MOBILE_STATUS_OPTIONS = [
  { key: 'all', label: 'All Statuses' },
  { key: 'pending', label: 'Pending' },
  { key: 'awaiting_payment', label: 'Awaiting Payment' },
  { key: 'payment_failed', label: 'Payment Failed' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'ready_to_ship', label: 'Ready To Ship' },
  { key: 'delivered', label: 'Completed' },
  { key: 'refunded', label: 'Refunded' },
  { key: 'cancelled', label: 'Canceled' },
]

const formatCurrency = (value, currency) => {
  const amount = Number(value || 0)
  const safeCurrency = String(currency || 'NGN').toUpperCase()
  if (!Number.isFinite(amount)) return '0'

  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: safeCurrency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    const symbol = safeCurrency === 'NGN' ? '₦' : '$'
    return `${symbol}${amount.toFixed(2)}`
  }
}

const formatDate = (value) => {
  const timestamp = new Date(value || '').getTime()
  if (Number.isNaN(timestamp)) return '—'
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

const toItemText = (count) => {
  const next = Math.max(1, Number(count || 1))
  return `Items ${next}`
}

const formatRelativeTime = (value) => {
  const timestamp = new Date(value || '').getTime()
  if (Number.isNaN(timestamp)) return '—'
  const diffMs = Date.now() - timestamp
  if (diffMs < 0) return 'Just now'

  const minutes = Math.floor(diffMs / (60 * 1000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hours ago`
  const days = Math.floor(hours / 24)
  return `${days} days ago`
}

const isDateWithinRange = (value, dateRange) => {
  const timestamp = new Date(value || '').getTime()
  if (Number.isNaN(timestamp)) return false

  const now = Date.now()
  if (dateRange === 'today') return timestamp >= now - 24 * 60 * 60 * 1000
  if (dateRange === 'last_7_days') return timestamp >= now - 7 * 24 * 60 * 60 * 1000
  if (dateRange === 'last_30_days') return timestamp >= now - 30 * 24 * 60 * 60 * 1000
  return true
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [capabilities, setCapabilities] = useState({
    isSellerScoped: false,
    canUpdateStatus: true,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isActionMenuOpenFor, setIsActionMenuOpenFor] = useState('')
  const [statusUpdatingById, setStatusUpdatingById] = useState({})
  const [summaryCounts, setSummaryCounts] = useState({
    awaiting_payment: 0,
    payment_failed: 0,
    paid: 0,
    processing: 0,
    ready_to_ship: 0,
    out_for_delivery: 0,
    delivered: 0,
    refunded: 0,
    cancelled: 0,
  })
  const [mobileActiveFilterTab, setMobileActiveFilterTab] = useState('product')
  const [mobileSortBy, setMobileSortBy] = useState('newest')
  const [mobilePaymentFilter, setMobilePaymentFilter] = useState('all')
  const [mobileDateRange, setMobileDateRange] = useState('all')
  const [mobileStatusFilter, setMobileStatusFilter] = useState('all')
  const [mobileOverviewExpanded, setMobileOverviewExpanded] = useState(false)
  const [mobileOverviewReveal, setMobileOverviewReveal] = useState(false)

  const hasPrev = page > 1
  const hasNext = page * PER_PAGE < totalCount

  const loadSummaryCounts = async () => {
    const statuses = [
      'awaiting_payment',
      'payment_failed',
      'paid',
      'processing',
      'ready_to_ship',
      'out_for_delivery',
      'delivered',
      'refunded',
      'cancelled',
    ]
    try {
      const results = await Promise.all(
        statuses.map(async (status) => {
          const params = new URLSearchParams({
            page: '1',
            perPage: '1',
            status,
          })
          const response = await fetch(`/api/admin/orders?${params.toString()}`, { cache: 'no-store' })
          const payload = await response.json().catch(() => null)
          if (!response.ok) return [status, 0]
          return [status, Math.max(0, Number(payload?.totalCount || 0))]
        }),
      )

      setSummaryCounts((prev) => {
        const next = { ...prev }
        results.forEach(([key, count]) => {
          next[key] = Number(count || 0)
        })
        return next
      })
    } catch {
      // Keep fallback zeros.
    }
  }

  const loadOrders = async () => {
    setIsLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        page: String(page),
        perPage: String(PER_PAGE),
      })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchTerm.trim()) params.set('search', searchTerm.trim())

      const response = await fetch(`/api/admin/orders?${params.toString()}`, { cache: 'no-store' })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to load orders.')
      }

      setOrders(Array.isArray(payload?.items) ? payload.items : [])
      setTotalCount(Math.max(0, Number(payload?.totalCount || 0)))
      setCapabilities({
        isSellerScoped: Boolean(payload?.capabilities?.isSellerScoped),
        canUpdateStatus: payload?.capabilities?.canUpdateStatus !== false,
      })
    } catch (nextError) {
      setOrders([])
      setTotalCount(0)
      setCapabilities({ isSellerScoped: false, canUpdateStatus: true })
      setError(nextError?.message || 'Unable to load orders.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadOrders()
  }, [page, statusFilter])

  useEffect(() => {
    void loadSummaryCounts()
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1)
      void loadOrders()
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [searchTerm])

  useEffect(() => {
    if (!mobileOverviewExpanded) {
      setMobileOverviewReveal(false)
      return
    }

    const timer = window.setTimeout(() => {
      setMobileOverviewReveal(true)
    }, 30)

    return () => window.clearTimeout(timer)
  }, [mobileOverviewExpanded])

  const handleStatusUpdate = async (orderId, status) => {
    if (!capabilities.canUpdateStatus) return
    const safeOrderId = String(orderId || '').trim()
    const safeStatus = String(status || '').trim().toLowerCase()
    if (!safeOrderId || !safeStatus) return

    setStatusUpdatingById((prev) => ({ ...prev, [safeOrderId]: true }))
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: safeOrderId, status: safeStatus }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to update status.')
      }

      setOrders((prev) =>
        prev.map((entry) =>
          String(entry.id) === safeOrderId
            ? {
                ...entry,
                status: payload?.status || safeStatus,
                statusLabel: payload?.statusLabel || entry.statusLabel,
              }
            : entry,
        ),
      )
      setIsActionMenuOpenFor('')
      void loadSummaryCounts()
    } catch (nextError) {
      setError(nextError?.message || 'Unable to update status.')
    } finally {
      setStatusUpdatingById((prev) => ({ ...prev, [safeOrderId]: false }))
    }
  }

  const orderRangeLabel = useMemo(() => {
    if (totalCount <= 0) return '0'
    const start = (page - 1) * PER_PAGE + 1
    const end = Math.min(totalCount, page * PER_PAGE)
    return `${start}-${end} of ${totalCount}`
  }, [page, totalCount])

  const mobileSummary = useMemo(
    () => ({
      pending: Number(summaryCounts.awaiting_payment || 0),
      in_progress:
        Number(summaryCounts.processing || 0) +
        Number(summaryCounts.ready_to_ship || 0) +
        Number(summaryCounts.out_for_delivery || 0),
      delivered: Number(summaryCounts.delivered || 0),
      cancelled: Number(summaryCounts.cancelled || 0),
    }),
    [summaryCounts],
  )

  const activeMobileFilterOptions = useMemo(() => {
    if (mobileActiveFilterTab === 'payment') return MOBILE_PAYMENT_OPTIONS
    if (mobileActiveFilterTab === 'date_range') return MOBILE_DATE_RANGE_OPTIONS
    if (mobileActiveFilterTab === 'status') return MOBILE_STATUS_OPTIONS
    return MOBILE_SORT_OPTIONS
  }, [mobileActiveFilterTab])

  const activeMobileFilterValue = useMemo(() => {
    if (mobileActiveFilterTab === 'payment') return mobilePaymentFilter
    if (mobileActiveFilterTab === 'date_range') return mobileDateRange
    if (mobileActiveFilterTab === 'status') return mobileStatusFilter
    return mobileSortBy
  }, [mobileActiveFilterTab, mobileDateRange, mobilePaymentFilter, mobileSortBy, mobileStatusFilter])

  const mobileOrders = useMemo(() => {
    let next = [...orders]

    if (mobilePaymentFilter !== 'all') {
      next = next.filter((entry) => {
        const paymentText = String(entry.paymentText || '').toLowerCase()
        if (mobilePaymentFilter === 'paid') return paymentText.includes('paid')
        if (mobilePaymentFilter === 'pending') return paymentText.includes('awaiting')
        if (mobilePaymentFilter === 'failed') return paymentText.includes('failed')
        return true
      })
    }

    if (mobileDateRange !== 'all') {
      next = next.filter((entry) => isDateWithinRange(entry.date, mobileDateRange))
    }

    if (mobileStatusFilter !== 'all') {
      next = next.filter((entry) => {
        const status = String(entry.status || '').toLowerCase()
        if (mobileStatusFilter === 'in_progress') return status === 'processing' || status === 'out_for_delivery'
        return status === mobileStatusFilter
      })
    }

    if (mobileSortBy === 'oldest') {
      next.sort((a, b) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime())
    } else if (mobileSortBy === 'amount_desc') {
      next.sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
    } else if (mobileSortBy === 'amount_asc') {
      next.sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0))
    } else {
      next.sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime())
    }

    return next
  }, [mobileDateRange, mobilePaymentFilter, mobileSortBy, mobileStatusFilter, orders])

  const handleMobileActiveFilterChange = (event) => {
    const nextValue = String(event?.target?.value || '').trim()
    if (!nextValue) return

    if (mobileActiveFilterTab === 'payment') {
      setMobilePaymentFilter(nextValue)
      return
    }
    if (mobileActiveFilterTab === 'date_range') {
      setMobileDateRange(nextValue)
      return
    }
    if (mobileActiveFilterTab === 'status') {
      setMobileStatusFilter(nextValue)
      return
    }
    setMobileSortBy(nextValue)
  }

  return (
    <div className='min-h-screen bg-[#f4f7f9] text-slate-900 lg:bg-white'>
      <div className='flex min-h-screen'>
        <AdminSidebar />
        <main className='flex-1 pb-8'>
          <AdminDesktopHeader />
          <section className='w-full bg-transparent p-0 lg:bg-white lg:px-4 xl:px-5'>
            <div className='px-3 pb-3 pt-4 lg:hidden'>
              <div className='grid grid-cols-2 gap-2'>
                {MOBILE_SUMMARY_CARDS.map((card, index) => {
                  const isExpandableCard = index > 1
                  if (isExpandableCard && !mobileOverviewExpanded) return null

                  const count = Number(mobileSummary[card.key] || 0)
                  const active = mobileStatusFilter === card.key
                  return (
                    <button
                      key={card.key}
                      type='button'
                      onClick={() => {
                        setMobileStatusFilter(card.key)
                        setMobileActiveFilterTab('status')
                      }}
                      className={`rounded-2xl border bg-white px-3 py-3 text-left shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition ${
                        active ? 'border-orange-300 ring-1 ring-orange-200' : 'border-slate-200'
                      } ${
                        isExpandableCard
                          ? `duration-300 ${mobileOverviewReveal ? 'opacity-100' : 'opacity-0'}`
                          : ''
                      }`}
                    >
                      <p className='text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500'>{card.label}</p>
                      <p className='mt-1 text-[28px] font-semibold leading-none text-slate-900'>{count}</p>
                      <p className={`mt-2 inline-flex items-center gap-1.5 text-[11px] ${card.tone}`}>
                        <span className={`inline-flex h-1.5 w-1.5 rounded-full ${card.dot}`} />
                        {card.note}
                      </p>
                    </button>
                  )
                })}
              </div>
              <div className='mt-1 flex justify-center'>
                <button
                  type='button'
                  onClick={() => setMobileOverviewExpanded((prev) => !prev)}
                  className='inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-sky-600 transition hover:text-sky-500'
                >
                  {mobileOverviewExpanded ? (
                    <>
                      <svg viewBox='0 0 24 24' className='h-3.5 w-3.5' fill='none' stroke='currentColor' strokeWidth='2'>
                        <path d='m18 15-6-6-6 6' />
                      </svg>
                      Collapse Overview
                    </>
                  ) : (
                    <>
                      <svg viewBox='0 0 24 24' className='h-3.5 w-3.5' fill='none' stroke='currentColor' strokeWidth='2'>
                        <path d='m6 9 6 6 6-6' />
                      </svg>
                      More Overview
                    </>
                  )}
                </button>
              </div>

              <div className='mt-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_2px_8px_rgba(15,23,42,0.05)]'>
                <div className='grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1'>
                  {MOBILE_FILTER_TABS.map((tab) => {
                    const active = mobileActiveFilterTab === tab.key
                    return (
                      <button
                        key={tab.key}
                        type='button'
                        onClick={() => setMobileActiveFilterTab(tab.key)}
                        className={`h-8 rounded-lg px-1 text-[11px] font-semibold transition ${
                          active ? 'bg-[#ff8f4d] text-white shadow-sm' : 'text-slate-600'
                        }`}
                      >
                        {tab.label}
                      </button>
                    )
                  })}
                </div>

                <div className='mt-2'>
                  <CustomSelect
                    value={activeMobileFilterValue}
                    onChange={handleMobileActiveFilterChange}
                    className='h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800'
                  >
                    {activeMobileFilterOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </CustomSelect>
                </div>
              </div>

              {error ? (
                <div className='mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700'>
                  {error}
                </div>
              ) : null}

              <div className='mt-3 space-y-2'>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <div key={`mobile-orders-skeleton-${index}`} className='rounded-xl border border-slate-200 bg-white p-3'>
                        <div className='h-3.5 w-24 animate-pulse rounded bg-slate-200' />
                        <div className='mt-2 h-3 w-36 animate-pulse rounded bg-slate-100' />
                        <div className='mt-3 h-5 w-20 animate-pulse rounded bg-slate-100' />
                      </div>
                    ))
                  : null}

                {!isLoading && mobileOrders.length === 0 ? (
                  <div className='rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500'>
                    No orders found.
                  </div>
                ) : null}

                {!isLoading &&
                  mobileOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/backend/admin/orders/${order.id}`}
                      className='block rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-[0_1px_6px_rgba(15,23,42,0.04)]'
                    >
                      <div className='flex items-start justify-between gap-3'>
                        <div className='min-w-0'>
                          <p className='text-[13px] font-bold text-slate-900'>
                            {String(order.orderId || '').startsWith('#') ? String(order.orderId) : `#${order.orderId}`}
                          </p>
                          <p className='text-[13px] text-slate-500'>Customer</p>
                          <p className='text-[13px] leading-5 text-slate-400'>
                            Total items bought: {Math.max(1, Number(order.itemCount || 1))}
                          </p>
                        </div>
                        <span className={`inline-flex whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-tight ${MOBILE_STATUS_TONES[order.status] || 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                          {order.statusLabel}
                        </span>
                      </div>
                      <div className='mt-2 flex items-end justify-between'>
                        <p className='text-[13px] font-semibold leading-none text-slate-900'>{formatCurrency(order.amount, order.currency)}</p>
                        <span className='inline-flex items-center gap-1 text-[13px] text-slate-400'>
                          {formatRelativeTime(order.date)}
                          <svg viewBox='0 0 20 20' className='h-3 w-3' fill='none' stroke='currentColor' strokeWidth='2'>
                            <path d='M8 5l5 5-5 5' strokeLinecap='round' strokeLinejoin='round' />
                          </svg>
                        </span>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>

            <div className='hidden lg:block'>
              <div className='grid grid-cols-2 gap-2 pb-3 xl:grid-cols-4'>
                {MOBILE_SUMMARY_CARDS.map((card) => {
                  const count = Number(mobileSummary[card.key] || 0)
                  return (
                    <div
                      key={`desktop-summary-${card.key}`}
                      className='rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left shadow-[0_2px_8px_rgba(15,23,42,0.06)]'
                    >
                      <p className='text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500'>{card.label}</p>
                      <p className='mt-1 text-[28px] font-semibold leading-none text-slate-900'>{count}</p>
                      <p className={`mt-2 inline-flex items-center gap-1.5 text-[11px] ${card.tone}`}>
                        <span className={`inline-flex h-1.5 w-1.5 rounded-full ${card.dot}`} />
                        {card.note}
                      </p>
                    </div>
                  )
                })}
              </div>

              <div className='border-b border-slate-200 bg-white py-4'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <h1 className='text-[30px] font-semibold text-slate-900'>Orders List</h1>
                {!capabilities.isSellerScoped ? (
                  <button
                    type='button'
                    className='inline-flex h-10 items-center justify-center rounded-full bg-emerald-500 px-5 text-sm font-semibold text-white'
                  >
                    + Add Order
                  </button>
                ) : null}
              </div>

              <div className='mt-5 flex flex-wrap items-center justify-between gap-3'>
                <div className='flex flex-wrap items-center gap-2'>
                  {STATUS_TABS.map((tab) => {
                    const active = statusFilter === tab.key
                    return (
                      <button
                        key={tab.key}
                        type='button'
                        onClick={() => {
                          setStatusFilter(tab.key)
                          setPage(1)
                        }}
                        className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
                          active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {tab.label}
                      </button>
                    )
                  })}
                </div>

                <div className='flex items-center gap-2'>
                  <div className='flex h-10 min-w-[230px] items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3'>
                    <svg viewBox='0 0 20 20' className='h-4 w-4 text-slate-500' fill='none' stroke='currentColor' strokeWidth='2'>
                      <circle cx='9' cy='9' r='5' />
                      <path d='m13 13 4 4' strokeLinecap='round' />
                    </svg>
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder='Search...'
                      className='w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400'
                    />
                  </div>
                  <button type='button' className='inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500'>
                    <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2'>
                      <path d='M3 6h14M6 10h8M8 14h4' strokeLinecap='round' />
                    </svg>
                  </button>
                </div>
              </div>
              </div>

            {error ? (
              <div className='mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
                {error}
              </div>
            ) : null}

            <div className='mt-5 overflow-x-auto bg-white'>
              <table className='min-w-full text-left'>
                <thead>
                  <tr className='border-b border-slate-200 text-sm font-medium text-slate-500'>
                    <th className='px-3 py-3'>Product Name</th>
                    <th className='px-3 py-3'>Customer Name</th>
                    <th className='px-3 py-3'>Order Id</th>
                    <th className='px-3 py-3'>Amount</th>
                    <th className='px-3 py-3'>Status</th>
                    <th className='px-3 py-3 text-right'>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 8 }).map((_, index) => (
                        <tr key={`orders-skeleton-${index}`} className='border-b border-slate-100'>
                          <td className='px-3 py-3'><div className='h-4 w-40 animate-pulse rounded bg-slate-100' /></td>
                          <td className='px-3 py-3'><div className='h-4 w-32 animate-pulse rounded bg-slate-100' /></td>
                          <td className='px-3 py-3'><div className='h-4 w-24 animate-pulse rounded bg-slate-100' /></td>
                          <td className='px-3 py-3'><div className='h-4 w-28 animate-pulse rounded bg-slate-100' /></td>
                          <td className='px-3 py-3'><div className='h-8 w-24 animate-pulse rounded-full bg-slate-100' /></td>
                          <td className='px-3 py-3 text-right'><div className='ml-auto h-8 w-8 animate-pulse rounded bg-slate-100' /></td>
                        </tr>
                      ))
                    : null}

                  {!isLoading && orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className='px-3 py-10 text-center text-sm text-slate-500'>
                        No orders found.
                      </td>
                    </tr>
                  ) : null}

                  {!isLoading &&
                    orders.map((order) => (
                      <tr key={order.id} className='border-b border-slate-100'>
                        <td className='px-3 py-3'>
                          <div className='flex items-center gap-2'>
                            <div className='relative h-9 w-9 overflow-hidden rounded-md border border-slate-200 bg-slate-100'>
                              {order.productImage ? (
                                <Image
                                  src={order.productImage}
                                  alt={order.productName}
                                  fill
                                  sizes='36px'
                                  className='object-cover'
                                />
                              ) : null}
                            </div>
                            <div>
                              <p className='text-sm font-semibold text-slate-900'>{order.productName}</p>
                              <p className='text-xs text-slate-500'>{toItemText(order.itemCount)}</p>
                            </div>
                          </div>
                        </td>

                        <td className='px-3 py-3'>
                          <p className='text-sm font-semibold text-slate-900'>{order.customerName}</p>
                          <p className='text-xs text-slate-500'>{order.customerTag}</p>
                        </td>

                        <td className='px-3 py-3'>
                          <p className='text-sm font-semibold text-slate-900'>{order.orderId}</p>
                          <p className='text-xs text-slate-500'>{formatDate(order.date)}</p>
                        </td>

                        <td className='px-3 py-3'>
                          <p className='text-sm font-semibold text-slate-900'>{formatCurrency(order.amount, order.currency)}</p>
                          <p className='text-xs text-slate-500'>{order.paymentText}</p>
                        </td>

                        <td className='px-3 py-3'>
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_TONES[order.status] || 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                            {order.statusLabel}
                          </span>
                        </td>

                        <td className='relative px-3 py-3 text-right'>
                          <button
                            type='button'
                            onClick={() => setIsActionMenuOpenFor((prev) => (prev === order.id ? '' : order.id))}
                            className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50'
                          >
                            <svg viewBox='0 0 20 20' className='h-4 w-4' fill='currentColor'>
                              <circle cx='4' cy='10' r='1.5' />
                              <circle cx='10' cy='10' r='1.5' />
                              <circle cx='16' cy='10' r='1.5' />
                            </svg>
                          </button>

                          {isActionMenuOpenFor === order.id ? (
                            <div className='absolute right-2 top-12 z-20 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg'>
                              <Link
                                href={`/backend/admin/orders/${order.id}`}
                                className='block rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50'
                              >
                                View details
                              </Link>
                              {capabilities.canUpdateStatus
                                ? STATUS_OPTIONS.map((option) => (
                                    <button
                                      key={option.key}
                                      type='button'
                                      onClick={() => handleStatusUpdate(order.id, option.key)}
                                      disabled={Boolean(statusUpdatingById[order.id])}
                                      className='block w-full rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60'
                                    >
                                      Mark as {option.label}
                                    </button>
                                  ))
                                : null}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className='mt-5 flex items-center justify-between bg-white px-1 py-3'>
              <button
                type='button'
                onClick={() => hasPrev && setPage((prev) => prev - 1)}
                disabled={!hasPrev}
                className='inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 disabled:opacity-50'
              >
                <span>←</span>
                <span>Previous</span>
              </button>

              <p className='text-sm font-medium text-slate-500'>{orderRangeLabel}</p>

              <button
                type='button'
                onClick={() => hasNext && setPage((prev) => prev + 1)}
                disabled={!hasNext}
                className='inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 disabled:opacity-50'
              >
                <span>Next</span>
                <span>→</span>
              </button>
            </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
