'use client'

import CustomSelect from '@/components/common/CustomSelect'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader'

const STATUS_TONES = {
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-sky-100 text-sky-700',
  out_for_delivery: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
}

const PAYMENT_TONES = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-rose-100 text-rose-700',
}

const STATUS_OPTIONS = [
  { key: 'pending', label: 'Awaiting Payment' },
  { key: 'processing', label: 'Processing' },
  { key: 'out_for_delivery', label: 'Out for delivery' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
]

const formatCurrency = (value, currency) => {
  const amount = Number(value || 0)
  const safeCurrency = String(currency || 'NGN').toUpperCase()

  if (!Number.isFinite(amount)) return safeCurrency === 'NGN' ? 'NGN 0.00' : '$0.00'

  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: safeCurrency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    const symbol = safeCurrency === 'NGN' ? 'NGN' : '$'
    return `${symbol} ${amount.toFixed(2)}`
  }
}

const formatDate = (value) => {
  const timestamp = new Date(value || '').getTime()
  if (Number.isNaN(timestamp)) return 'Unknown date'

  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

const normalizeOrderNumber = (value) => {
  const safe = String(value || '').trim()
  if (!safe) return '#-'
  if (safe.startsWith('#')) return safe
  return `#${safe}`
}

const toAddressLines = (value) =>
  String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

const fallbackNameFromEmail = (value) => {
  const clean = String(value || '').trim()
  if (!clean.includes('@')) return ''
  return clean
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .trim()
}

const EMPTY_SHIPPING_FORM = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
}

function Card({ title, children, headerAddon = null, bodyClassName = '' }) {
  return (
    <section className='w-full overflow-visible rounded-none border-0 bg-white shadow-none sm:overflow-hidden sm:rounded-2xl sm:border sm:border-[#e4ecf5] sm:bg-white sm:shadow-[0_1px_4px_rgba(15,23,42,0.04)]'>
      <div className='flex items-center justify-between border-b border-[#e9eef5] px-4 py-4 sm:px-5'>
        <p className='text-lg font-semibold text-slate-800'>{title}</p>
        {headerAddon}
      </div>
      <div className={bodyClassName || 'px-4 py-4 sm:px-5'}>{children}</div>
    </section>
  )
}

function DetailPill({ tone, label }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      {label}
    </span>
  )
}

function InlineRowIcon({ children }) {
  return (
    <span className='inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef3ff] text-[#4d67cc]'>
      {children}
    </span>
  )
}

export default function OrderDetailPage() {
  const params = useParams()
  const orderId = Array.isArray(params?.orderId) ? params.orderId[0] : params?.orderId

  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isEditingShipping, setIsEditingShipping] = useState(false)
  const [isSavingShipping, setIsSavingShipping] = useState(false)
  const [isCustomerDetailsOpen, setIsCustomerDetailsOpen] = useState(false)
  const [shippingForm, setShippingForm] = useState(EMPTY_SHIPPING_FORM)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [sellerMessagingByItemId, setSellerMessagingByItemId] = useState({})

  const loadOrder = useCallback(async () => {
    if (!orderId) return

    setIsLoading(true)
    setError('')
    setNotice('')

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, { cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to load order details.')
      }
      setOrder(payload?.order || null)
    } catch (nextError) {
      setOrder(null)
      setError(nextError?.message || 'Unable to load order details.')
    } finally {
      setIsLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    void loadOrder()
  }, [loadOrder])

  const handleStatusChange = async (status) => {
    if (!order?.id || !status) return
    setIsUpdating(true)
    setError('')
    setNotice('')

    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: String(order.id), status: String(status) }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to update status.')
      }

      setOrder((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          status: payload?.status || status,
          statusLabel: payload?.statusLabel || prev.statusLabel,
        }
      })
    } catch (nextError) {
      setError(nextError?.message || 'Unable to update status.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleMessageSeller = async (item) => {
    const itemId = String(item?.id || '').trim()
    const vendorUserId = String(item?.vendorUserId || '').trim()
    if (!itemId || !order?.id) return
    if (!vendorUserId) {
      setError('Seller is not linked for this product.')
      return
    }

    setSellerMessagingByItemId((prev) => ({ ...prev, [itemId]: true }))
    setError('')
    setNotice('')
    try {
      const orderLabel = normalizeOrderNumber(order?.orderNumber)
      const response = await fetch(`/api/admin/vendors/${vendorUserId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Order inquiry ${orderLabel}`,
          message: `Please review "${String(item?.name || 'Product')}" for order ${orderLabel}.`,
          type: 'order_vendor_message',
          severity: 'info',
          entity_type: 'order',
          entity_id: String(order.id),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to message seller.')
      }
      setNotice(`Message sent to ${String(item?.vendor || 'seller')}.`)
    } catch (nextError) {
      setError(nextError?.message || 'Unable to message seller.')
    } finally {
      setSellerMessagingByItemId((prev) => ({ ...prev, [itemId]: false }))
    }
  }

  const totals = useMemo(() => {
    if (!order) return null

    return {
      subtotal: formatCurrency(order.subtotal, order.currency),
      shipping: Number(order.shippingFee || 0) <= 0 ? 'FREE' : formatCurrency(order.shippingFee, order.currency),
      protection:
        Number(order.protectionFee || 0) <= 0 ? 'FREE' : formatCurrency(order.protectionFee, order.currency),
      tax: Number(order.taxAmount || 0) <= 0 ? 'FREE' : formatCurrency(order.taxAmount, order.currency),
      total: formatCurrency(order.totalAmount, order.currency),
    }
  }, [order])

  const shippingLines = useMemo(() => toAddressLines(order?.shippingAddress?.text), [order?.shippingAddress?.text])
  const billingLines = useMemo(() => toAddressLines(order?.billingAddress?.text), [order?.billingAddress?.text])
  const customerDisplayName = useMemo(() => {
    const fromCustomer = String(order?.customer?.name || '').trim()
    if (fromCustomer && fromCustomer.toLowerCase() !== 'customer') return fromCustomer
    const fromShipping = String(order?.shippingAddress?.fullName || order?.shippingAddress?.name || '').trim()
    if (fromShipping) return fromShipping
    const fromEmail = fallbackNameFromEmail(order?.customer?.email)
    if (fromEmail) return fromEmail
    return fromCustomer || 'Customer'
  }, [order?.customer?.name, order?.customer?.email, order?.shippingAddress?.fullName, order?.shippingAddress?.name])
  const customerTotalSpent = useMemo(
    () => formatCurrency(order?.customer?.totalSpent, order?.currency),
    [order?.customer?.totalSpent, order?.currency],
  )
  const customerLastSeenLabel = useMemo(() => {
    const safe = String(order?.customer?.lastSeenLabel || '').trim()
    if (safe) return safe
    const fallbackAt = String(order?.customer?.lastSeenAt || '').trim()
    return fallbackAt ? formatDate(fallbackAt) : '—'
  }, [order?.customer?.lastSeenLabel, order?.customer?.lastSeenAt])

  useEffect(() => {
    if (!order?.shippingAddress) return
    setShippingForm({
      fullName: String(order.shippingAddress.fullName || order.shippingAddress.name || ''),
      phone: String(order.shippingAddress.phone || order.customer?.phone || ''),
      line1: String(order.shippingAddress.line1 || ''),
      line2: String(order.shippingAddress.line2 || ''),
      city: String(order.shippingAddress.city || ''),
      state: String(order.shippingAddress.state || ''),
      postalCode: String(order.shippingAddress.postalCode || ''),
      country: String(order.shippingAddress.country || ''),
    })
  }, [order])

  const orderNumber = normalizeOrderNumber(order?.orderNumber)

  const handleShippingInputChange = (field, value) => {
    setShippingForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCancelShippingEdit = () => {
    if (order?.shippingAddress) {
      setShippingForm({
        fullName: String(order.shippingAddress.fullName || order.shippingAddress.name || ''),
        phone: String(order.shippingAddress.phone || order.customer?.phone || ''),
        line1: String(order.shippingAddress.line1 || ''),
        line2: String(order.shippingAddress.line2 || ''),
        city: String(order.shippingAddress.city || ''),
        state: String(order.shippingAddress.state || ''),
        postalCode: String(order.shippingAddress.postalCode || ''),
        country: String(order.shippingAddress.country || ''),
      })
    } else {
      setShippingForm(EMPTY_SHIPPING_FORM)
    }
    setIsEditingShipping(false)
  }

  const handleSaveShippingAddress = async () => {
    if (!order?.id) return

    const payload = {
      fullName: String(shippingForm.fullName || '').trim(),
      phone: String(shippingForm.phone || '').trim(),
      line1: String(shippingForm.line1 || '').trim(),
      line2: String(shippingForm.line2 || '').trim(),
      city: String(shippingForm.city || '').trim(),
      state: String(shippingForm.state || '').trim(),
      postalCode: String(shippingForm.postalCode || '').trim(),
      country: String(shippingForm.country || '').trim(),
    }

    if (!payload.fullName || !payload.line1 || !payload.city || !payload.country) {
      setError('Full name, address line 1, city, and country are required.')
      return
    }

    setIsSavingShipping(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shippingAddress: payload }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error || 'Unable to update shipping address.')
      }

      setOrder((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          customer: {
            ...prev.customer,
            ...(result?.order?.customer || {}),
          },
          shippingAddress: {
            ...prev.shippingAddress,
            ...(result?.order?.shippingAddress || {}),
          },
        }
      })
      setIsEditingShipping(false)
    } catch (nextError) {
      setError(nextError?.message || 'Unable to update shipping address.')
    } finally {
      setIsSavingShipping(false)
    }
  }

  return (
    <div className='min-h-screen bg-[#f3f7fc]'>
      <div className='flex min-h-screen'>
        <AdminSidebar />

        <main className='flex-1 pb-8'>
          <AdminDesktopHeader />

          <div className='w-full py-5 sm:px-6 lg:px-7'>
            {isLoading ? (
              <div className='space-y-4 px-4 sm:px-0'>
                <div className='h-10 w-72 animate-pulse rounded-lg bg-slate-200' />
                <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]'>
                  <div className='space-y-4'>
                    <div className='h-64 animate-pulse rounded-2xl bg-slate-200' />
                    <div className='h-28 animate-pulse rounded-2xl bg-slate-200' />
                    <div className='h-44 animate-pulse rounded-2xl bg-slate-200' />
                  </div>
                  <div className='h-96 animate-pulse rounded-2xl bg-slate-200' />
                </div>
              </div>
            ) : null}

            {!isLoading && error ? (
              <div className='mx-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 sm:mx-0'>
                {error}
              </div>
            ) : null}

            {!isLoading && !error && notice ? (
              <div className='mx-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 sm:mx-0'>
                {notice}
              </div>
            ) : null}

            {!isLoading && !error && order ? (
              <div className='space-y-4'>
                <div className='flex flex-wrap items-start justify-between gap-3 px-4 sm:px-0'>
                  <div className='min-w-0'>
                    <Link
                      href='/backend/admin/orders'
                      className='inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700'
                    >
                      <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2'>
                        <path d='m12.5 4.5-5 5 5 5' strokeLinecap='round' strokeLinejoin='round' />
                      </svg>
                      Orders
                    </Link>

                    <div className='mt-1 flex flex-wrap items-center gap-2'>
                      <h1 className='break-words text-[28px] font-semibold leading-[1.02] tracking-[-0.02em] text-[#354a75] sm:text-[32px]'>
                        Order {orderNumber}
                      </h1>
                      <DetailPill
                        tone={PAYMENT_TONES[String(order.paymentStatus || '').toLowerCase()] || 'bg-slate-100 text-slate-700'}
                        label={order.paymentStatusLabel || 'Paid'}
                      />
                      <DetailPill
                        tone={STATUS_TONES[order.status] || 'bg-slate-100 text-slate-700'}
                        label={order.statusLabel || 'Awaiting Payment'}
                      />
                      <span className='inline-flex items-center gap-1 text-xs text-slate-500'>
                        <svg viewBox='0 0 20 20' className='h-3.5 w-3.5' fill='none' stroke='currentColor' strokeWidth='2'>
                          <rect x='3.5' y='4.5' width='13' height='12' rx='2' />
                          <path d='M6.5 2.5v4M13.5 2.5v4M3.5 8.5h13' />
                        </svg>
                        {order.createdAtLabel}
                      </span>
                    </div>
                  </div>

                  <div className='flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end'>
                    <button
                      type='button'
                      disabled
                      className='hidden h-8 w-8 items-center justify-center rounded-full border border-[#d9e4f3] bg-white text-slate-400 sm:inline-flex'
                      aria-label='Previous order'
                    >
                      <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2'>
                        <path d='m11.5 4.5-5 5 5 5' strokeLinecap='round' strokeLinejoin='round' />
                      </svg>
                    </button>
                    <button
                      type='button'
                      disabled
                      className='hidden h-8 w-8 items-center justify-center rounded-full border border-[#d9e4f3] bg-white text-slate-400 sm:inline-flex'
                      aria-label='Next order'
                    >
                      <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2'>
                        <path d='m8.5 4.5 5 5-5 5' strokeLinecap='round' strokeLinejoin='round' />
                      </svg>
                    </button>

                    <CustomSelect
                      value={order.status}
                      disabled={isUpdating}
                      onChange={(event) => handleStatusChange(event.target.value)}
                      className='h-9 min-w-0 flex-1 rounded-lg border border-[#d9e4f3] bg-white px-2.5 text-xs font-semibold text-slate-600 outline-none focus:border-[#9cb5f8] focus:ring-2 focus:ring-[#dce7ff] sm:w-[190px] sm:flex-none'
                      aria-label='Order status'
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </CustomSelect>

                    <button
                      type='button'
                      disabled={isUpdating || order.status === 'delivered'}
                      onClick={() => handleStatusChange('delivered')}
                      className='inline-flex h-9 items-center justify-center rounded-lg bg-[#3f6cf4] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(63,108,244,0.25)] disabled:cursor-not-allowed disabled:opacity-60'
                    >
                      Fulfill
                    </button>
                  </div>
                </div>

                <div className='grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]'>
                  <div className='space-y-4'>
                    <Card
                      title={`Unfulfilled ${Math.max(0, Number(order.unfulfilledCount || 0))}`}
                      headerAddon={<span className='inline-flex h-2.5 w-2.5 rounded-full bg-amber-400' />}
                      bodyClassName='divide-y divide-[#e9eef5]'
                    >
                      {(order.items || []).map((item) => {
                        const lineTotal = formatCurrency(item.lineTotal, order.currency)

                        return (
                          <article
                            key={item.id}
                            className='grid grid-cols-[56px_minmax(0,1fr)] items-start gap-x-3 gap-y-2 px-4 py-4 sm:grid-cols-[60px_minmax(0,1fr)_auto_auto_auto] sm:gap-3 sm:px-5'
                          >
                            <div className='relative h-[56px] w-[56px] overflow-hidden rounded-lg border border-[#dfe8f3] bg-slate-100 sm:h-[60px] sm:w-[60px]'>
                              {item.image ? (
                                <Image src={item.image} alt={item.name} fill sizes='60px' className='object-cover' />
                              ) : null}
                            </div>

                            <div className='min-w-0'>
                              <p className='line-clamp-2 text-sm font-semibold text-slate-900'>{item.name}</p>
                              <p className='mt-1 text-xs text-slate-500'>Color: {item.variation || 'Standard option'}</p>
                              <p className='text-xs text-slate-500'>Vendor: {item.vendor || 'OCPRIMES'}</p>
                            </div>

                            <div className='col-span-2 grid grid-cols-3 gap-2 text-xs sm:col-auto sm:contents sm:text-sm'>
                              <div className='pt-0.5 text-left sm:text-right'>
                                <button
                                  type='button'
                                  onClick={() => handleMessageSeller(item)}
                                  disabled={Boolean(sellerMessagingByItemId[item.id]) || !item.vendorUserId}
                                  className='inline-flex h-7 items-center justify-center rounded-md border border-[#d9e4f3] bg-white px-2 text-[11px] font-semibold text-[#3f6cf4] disabled:cursor-not-allowed disabled:opacity-50'
                                >
                                  {!item.vendorUserId
                                    ? 'Seller unavailable'
                                    : sellerMessagingByItemId[item.id]
                                      ? 'Messaging...'
                                      : 'Message Seller'}
                                </button>
                              </div>

                              <p className='min-w-10 pt-0.5 text-center font-semibold text-slate-700'>
                                <span className='mr-1 text-[11px] font-medium text-slate-500 sm:hidden'>Qty</span>
                                {item.quantity}
                              </p>

                              <p className='pt-0.5 text-right font-semibold text-slate-900'>{lineTotal}</p>
                            </div>
                          </article>
                        )
                      })}
                    </Card>

                    <Card title='Payment Summary'>
                      <div className='space-y-2 text-sm'>
                        <div className='flex items-center justify-between text-slate-600'>
                          <span>Subtotal ({Math.max(1, Number(order.itemCount || 1))} items)</span>
                          <span className='font-semibold text-slate-900'>{totals?.subtotal}</span>
                        </div>
                        <div className='flex items-center justify-between text-slate-600'>
                          <span>Delivery</span>
                          <span className='font-semibold text-slate-900'>{totals?.shipping}</span>
                        </div>
                        <div className='flex items-center justify-between text-slate-600'>
                          <span>Order Protection</span>
                          <span className='font-semibold text-slate-900'>{totals?.protection}</span>
                        </div>
                        <div className='flex items-center justify-between text-slate-600'>
                          <span>Tax (included)</span>
                          <span className='font-semibold text-slate-900'>{totals?.tax}</span>
                        </div>

                        <div className='mt-2 flex items-center justify-between border-t border-[#e9eef5] pt-3 text-sm'>
                          <span className='font-semibold text-slate-900'>Total paid by customer</span>
                          <span className='font-bold text-slate-900'>{totals?.total}</span>
                        </div>
                      </div>
                    </Card>

                    <Card title='Delivery'>
                      <div className='flex flex-wrap items-center justify-between gap-4 sm:flex-nowrap'>
                        <div className='inline-flex items-center gap-3'>
                          <span className='inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#e1e9f5] bg-[#f8fafe] text-[#4d67cc]'>
                            <svg viewBox='0 0 20 20' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='1.8'>
                              <path d='M3 6h10v8H3z' />
                              <path d='M13 8h2.5l1.5 2v4H13z' />
                              <circle cx='6' cy='15' r='1.2' />
                              <circle cx='14.7' cy='15' r='1.2' />
                            </svg>
                          </span>

                          <div>
                            <p className='text-sm font-semibold text-slate-800'>
                              {order.shippingAddress?.method || 'Standard delivery'}
                            </p>
                            <p className='text-xs text-slate-500'>Delivery option selected at checkout.</p>
                          </div>
                        </div>

                        <p className='text-sm font-semibold text-slate-900'>{totals?.shipping}</p>
                      </div>
                    </Card>

                    <Card title='Activity'>
                      <div>
                        <p className='mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500'>Today</p>
                        <div className='space-y-3'>
                          {(order.activity || []).length > 0 ? (
                            (order.activity || []).map((entry) => (
                              <div key={entry.key} className='grid grid-cols-[16px_1fr] items-start gap-2'>
                                <span
                                  className={`mt-1.5 inline-flex h-2.5 w-2.5 rounded-full ${
                                    entry.tone === 'danger'
                                      ? 'bg-rose-500'
                                      : entry.tone === 'active'
                                        ? 'bg-indigo-500'
                                        : 'bg-sky-500'
                                  }`}
                                />
                                <div>
                                  <p className='text-sm font-semibold text-slate-900'>{entry.title}</p>
                                  <p className='text-xs text-slate-500'>{entry.detail}</p>
                                  <p className='mt-0.5 text-[11px] text-slate-400'>{formatDate(entry.at)}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className='text-sm text-slate-500'>No activity yet.</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>

                  <aside className='w-full overflow-visible rounded-none border-0 bg-white shadow-none sm:overflow-hidden sm:rounded-2xl sm:border sm:border-[#e4ecf5] sm:bg-white sm:shadow-[0_1px_4px_rgba(15,23,42,0.04)]'>
                    <div className='border-b border-[#e9eef5] px-4 py-4 sm:px-5'>
                      <p className='text-lg font-semibold text-slate-800'>Customer</p>

                      <button
                        type='button'
                        onClick={() => setIsCustomerDetailsOpen((prev) => !prev)}
                        className='mt-3 flex w-full items-center justify-between gap-2 text-left'
                        aria-expanded={isCustomerDetailsOpen}
                      >
                        <span className='flex min-w-0 items-center gap-2'>
                          <span className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef3ff] text-sm font-semibold text-[#4d67cc]'>
                            {String(customerDisplayName || 'C').charAt(0).toUpperCase()}
                          </span>
                          <span className='truncate text-sm font-semibold text-slate-900'>{customerDisplayName}</span>
                        </span>
                        <svg
                          viewBox='0 0 20 20'
                          className={`h-4 w-4 text-slate-400 transition ${isCustomerDetailsOpen ? 'rotate-90' : ''}`}
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                        >
                          <path d='M8 5l5 5-5 5' strokeLinecap='round' strokeLinejoin='round' />
                        </svg>
                      </button>

                      {isCustomerDetailsOpen ? (
                        <div className='mt-3 rounded-lg border border-[#e6edf7] bg-[#f8fbff] px-3 py-2.5'>
                          <div className='grid gap-2 text-xs'>
                            <div className='flex items-center justify-between gap-2'>
                              <span className='text-slate-500'>Total orders</span>
                              <span className='font-semibold text-slate-800'>
                                {Math.max(1, Number(order.customer?.ordersCount || 1))}
                              </span>
                            </div>
                            <div className='flex items-center justify-between gap-2'>
                              <span className='text-slate-500'>Total spent</span>
                              <span className='font-semibold text-slate-800'>{customerTotalSpent}</span>
                            </div>
                            <div className='flex items-center justify-between gap-2'>
                              <span className='text-slate-500'>Last seen</span>
                              <span className='font-semibold text-slate-800'>{customerLastSeenLabel}</span>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className='mt-3 flex items-center justify-between border-t border-[#edf2f8] pt-3'>
                        <div className='inline-flex items-center gap-2'>
                          <InlineRowIcon>
                            <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8'>
                              <path d='M6 3.5h8v13H6z' />
                              <path d='M8.5 3.5v-1m3 1v-1' strokeLinecap='round' />
                            </svg>
                          </InlineRowIcon>
                          <span className='text-sm font-medium text-slate-700'>
                            {Math.max(1, Number(order.customer?.ordersCount || 1))} Orders
                          </span>
                        </div>
                        <svg viewBox='0 0 20 20' className='h-4 w-4 text-slate-400' fill='none' stroke='currentColor' strokeWidth='2'>
                          <path d='M8 5l5 5-5 5' strokeLinecap='round' strokeLinejoin='round' />
                        </svg>
                      </div>
                    </div>

                    <div className='space-y-4 px-4 py-4 sm:px-5'>
                      <section>
                        <p className='text-sm font-semibold text-slate-900'>Contact info</p>
                        <div className='mt-2 space-y-1.5 text-sm text-slate-600'>
                          <p className='inline-flex items-center gap-2'>
                            <InlineRowIcon>
                              <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8'>
                                <path d='M3 5.5h14v9H3z' />
                                <path d='m3 6 7 5 7-5' strokeLinecap='round' strokeLinejoin='round' />
                              </svg>
                            </InlineRowIcon>
                            <span className='break-all'>{order.customer?.email || 'Not provided'}</span>
                          </p>
                          <p className='inline-flex items-center gap-2'>
                            <InlineRowIcon>
                              <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8'>
                                <path d='M5 3.8h3l1.3 3.2-1.7 1.7a11 11 0 0 0 3.2 3.2l1.7-1.7L16 11.5v3a1.5 1.5 0 0 1-1.6 1.5A11.5 11.5 0 0 1 4 5.4 1.5 1.5 0 0 1 5.5 3.8Z' strokeLinecap='round' strokeLinejoin='round' />
                              </svg>
                            </InlineRowIcon>
                            <span>{order.customer?.phone || 'Not provided'}</span>
                          </p>
                        </div>
                      </section>

                      <div className='h-px bg-[#e9eef5]' />

                      <section>
                        <div className='flex items-center justify-between gap-2'>
                          <p className='text-sm font-semibold text-slate-900'>Shipping Address</p>
                          {!isEditingShipping ? (
                            <button
                              type='button'
                              onClick={() => {
                                setError('')
                                setIsEditingShipping(true)
                              }}
                              className='inline-flex h-7 items-center justify-center rounded-md border border-[#d9e4f3] bg-white px-2.5 text-xs font-semibold text-slate-600'
                            >
                              Edit
                            </button>
                          ) : null}
                        </div>

                        {!isEditingShipping ? (
                          <div className='mt-2 space-y-1 text-sm text-slate-600'>
                            <p className='font-medium text-slate-800'>{order.shippingAddress?.name || 'Customer'}</p>
                            {shippingLines.length > 0 ? (
                              shippingLines.map((line, index) => <p key={`shipping-${index}`}>{line}</p>)
                            ) : (
                              <p>Address not available</p>
                            )}
                          </div>
                        ) : (
                          <div className='mt-3 space-y-2'>
                            <input
                              value={shippingForm.fullName}
                              onChange={(event) => handleShippingInputChange('fullName', event.target.value)}
                              placeholder='Full name'
                              className='h-9 w-full rounded-md border border-[#d9e4f3] px-3 text-sm text-slate-700 outline-none focus:border-[#9cb5f8] focus:ring-2 focus:ring-[#dce7ff]'
                            />
                            <input
                              value={shippingForm.phone}
                              onChange={(event) => handleShippingInputChange('phone', event.target.value)}
                              placeholder='Phone number'
                              className='h-9 w-full rounded-md border border-[#d9e4f3] px-3 text-sm text-slate-700 outline-none focus:border-[#9cb5f8] focus:ring-2 focus:ring-[#dce7ff]'
                            />
                            <input
                              value={shippingForm.line1}
                              onChange={(event) => handleShippingInputChange('line1', event.target.value)}
                              placeholder='Address line 1'
                              className='h-9 w-full rounded-md border border-[#d9e4f3] px-3 text-sm text-slate-700 outline-none focus:border-[#9cb5f8] focus:ring-2 focus:ring-[#dce7ff]'
                            />
                            <input
                              value={shippingForm.line2}
                              onChange={(event) => handleShippingInputChange('line2', event.target.value)}
                              placeholder='Address line 2 (optional)'
                              className='h-9 w-full rounded-md border border-[#d9e4f3] px-3 text-sm text-slate-700 outline-none focus:border-[#9cb5f8] focus:ring-2 focus:ring-[#dce7ff]'
                            />
                            <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                              <input
                                value={shippingForm.city}
                                onChange={(event) => handleShippingInputChange('city', event.target.value)}
                                placeholder='City'
                                className='h-9 w-full rounded-md border border-[#d9e4f3] px-3 text-sm text-slate-700 outline-none focus:border-[#9cb5f8] focus:ring-2 focus:ring-[#dce7ff]'
                              />
                              <input
                                value={shippingForm.state}
                                onChange={(event) => handleShippingInputChange('state', event.target.value)}
                                placeholder='State'
                                className='h-9 w-full rounded-md border border-[#d9e4f3] px-3 text-sm text-slate-700 outline-none focus:border-[#9cb5f8] focus:ring-2 focus:ring-[#dce7ff]'
                              />
                            </div>
                            <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                              <input
                                value={shippingForm.postalCode}
                                onChange={(event) => handleShippingInputChange('postalCode', event.target.value)}
                                placeholder='Postal code'
                                className='h-9 w-full rounded-md border border-[#d9e4f3] px-3 text-sm text-slate-700 outline-none focus:border-[#9cb5f8] focus:ring-2 focus:ring-[#dce7ff]'
                              />
                              <input
                                value={shippingForm.country}
                                onChange={(event) => handleShippingInputChange('country', event.target.value)}
                                placeholder='Country'
                                className='h-9 w-full rounded-md border border-[#d9e4f3] px-3 text-sm text-slate-700 outline-none focus:border-[#9cb5f8] focus:ring-2 focus:ring-[#dce7ff]'
                              />
                            </div>
                            <div className='flex items-center justify-end gap-2 pt-1'>
                              <button
                                type='button'
                                disabled={isSavingShipping}
                                onClick={handleCancelShippingEdit}
                                className='inline-flex h-8 items-center justify-center rounded-md border border-[#d9e4f3] bg-white px-3 text-xs font-semibold text-slate-600 disabled:opacity-60'
                              >
                                Cancel
                              </button>
                              <button
                                type='button'
                                disabled={isSavingShipping}
                                onClick={handleSaveShippingAddress}
                                className='inline-flex h-8 items-center justify-center rounded-md bg-[#3f6cf4] px-3 text-xs font-semibold text-white disabled:opacity-60'
                              >
                                {isSavingShipping ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        )}
                      </section>

                      <div className='h-px bg-[#e9eef5]' />

                      <section>
                        <p className='text-sm font-semibold text-slate-900'>Billing Address</p>
                        <div className='mt-2 space-y-1 text-sm text-slate-600'>
                          <p className='font-medium text-slate-800'>{order.billingAddress?.name || 'Customer'}</p>
                          {billingLines.length > 0 ? (
                            billingLines.map((line, index) => <p key={`billing-${index}`}>{line}</p>)
                          ) : (
                            <p>Address not available</p>
                          )}
                        </div>
                      </section>
                    </div>
                  </aside>
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  )
}
