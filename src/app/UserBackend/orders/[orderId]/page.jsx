'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUserI18n } from '@/lib/i18n/useUserI18n'

const formatDate = (value) => {
  const timestamp = new Date(value || '').getTime()
  if (Number.isNaN(timestamp)) return ''
  return new Date(timestamp).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

const formatDateTimeLabel = (value) => {
  const timestamp = new Date(value || '').getTime()
  if (Number.isNaN(timestamp)) return ''
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const buildTrackingSteps = (statusKey) => {
  const status = String(statusKey || '').toLowerCase()
  const steps = [
    'Order accepted',
    'Order picked up',
    'Order packed',
    'Order currently in your country/location',
    'Order enroute for delivery',
    'Order delivered',
  ]

  let activeCount = 2
  if (status === 'delivered' || status === 'completed') activeCount = steps.length
  if (status === 'out_for_delivery') activeCount = 5
  if (status === 'processing') activeCount = 4
  if (status === 'pending') activeCount = 3
  if (status === 'failed' || status === 'cancelled') activeCount = 1

  return steps.map((label, index) => ({
    label,
    isActive: index < activeCount,
  }))
}

export default function OrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { formatMoney } = useUserI18n()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [order, setOrder] = useState(null)
  const [isReordering, setIsReordering] = useState(false)
  const [actionMessage, setActionMessage] = useState('')

  const orderId = String(params?.orderId || '').trim()

  useEffect(() => {
    let active = true
    const load = async () => {
      setIsLoading(true)
      setError('')
      try {
        const response = await fetch(`/api/user/orders/${orderId}`, {
          method: 'GET',
          cache: 'no-store',
        })
        const payload = await response.json().catch(() => null)
        if (!active) return
        if (response.status === 401) {
          router.push(`/login?next=/UserBackend/orders/${orderId}`)
          return
        }
        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to load order details.')
        }
        setOrder(payload?.order || null)
      } catch (nextError) {
        if (!active) return
        setOrder(null)
        setError(nextError?.message || 'Unable to load order details.')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    if (orderId) {
      void load()
    }

    return () => {
      active = false
    }
  }, [orderId, router])

  const statusTone = useMemo(() => {
    const status = String(order?.statusKey || '').toLowerCase()
    if (status === 'delivered') return 'bg-emerald-100 text-emerald-700'
    if (status === 'out_for_delivery') return 'bg-indigo-100 text-indigo-700'
    if (status === 'processing' || status === 'pending') return 'bg-amber-100 text-amber-700'
    if (status === 'failed') return 'bg-rose-100 text-rose-700'
    if (status === 'cancelled') return 'bg-slate-200 text-slate-700'
    return 'bg-amber-100 text-amber-700'
  }, [order?.statusKey])

  const primaryActionLabel = useMemo(() => {
    const status = String(order?.paymentStatus || '').toLowerCase()
    if (status === 'paid') return 'Track Order'
    if (status === 'pending') return 'Proceed to Payment'
    if (status === 'failed' || status === 'cancelled') return 'Retry Payment'
    return 'Proceed to Payment'
  }, [order?.paymentStatus])

  const canReviewOrder = useMemo(() => {
    const status = String(order?.paymentStatus || '').toLowerCase()
    return (
      status === 'paid' ||
      String(order?.status || '').toLowerCase() === 'completed' ||
      String(order?.statusKey || '').toLowerCase() === 'delivered'
    )
  }, [order?.paymentStatus, order?.status, order?.statusKey])

  const hasOrderProtection = useMemo(() => Number(order?.protectionFee || 0) > 0, [order?.protectionFee])

  const handlePrimaryAction = () => {
    const status = String(order?.paymentStatus || '').toLowerCase()
    if (status === 'paid') {
      router.push('/UserBackend/orders')
      return
    }
    router.push('/checkout/payment')
  }

  const handleReorder = async () => {
    if (!order?.id || isReordering) return
    setIsReordering(true)
    setActionMessage('')
    try {
      const response = await fetch('/api/user/orders/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to reorder.')
      }
      const addedQuantity = Math.max(0, Number(payload?.addedQuantity || 0))
      const missingItems = Array.isArray(payload?.missingItems) ? payload.missingItems : []
      const status = missingItems.length > 0 ? 'warning' : 'success'
      const message =
        addedQuantity > 0
          ? `Added ${addedQuantity} item${addedQuantity === 1 ? '' : 's'} to your cart.`
          : 'No items were added to your cart.'

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(
          'oc_reorder_notice',
          JSON.stringify({
            status,
            message,
            missingItems,
          }),
        )
      }
      router.push('/cart')
    } catch (nextError) {
      setActionMessage(nextError?.message || 'Unable to reorder.')
    } finally {
      setIsReordering(false)
    }
  }

  const handleReturnItem = (itemName) => {
    setActionMessage(`Return request for "${itemName}" will be processed by support.`)
  }

  const trackingSteps = buildTrackingSteps(order?.statusKey)

  return (
    <section className='min-h-screen bg-[#f4f5f7]'>
      <div className='mx-auto hidden w-full max-w-7xl px-4 pb-10 pt-4 min-[641px]:block'>
        <div className='mb-3 flex items-center justify-between'>
          <div className='flex items-center gap-2 text-sm text-slate-700'>
            <Link href='/UserBackend/orders' className='inline-flex items-center gap-1 hover:text-slate-900'>
              <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2'>
                <path d='m12.5 4.5-5 5 5 5' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
              <span>Back</span>
            </Link>
            <span className='text-slate-400'>|</span>
            <p className='font-medium text-slate-900'>Order details</p>
          </div>
          <button
            type='button'
            className='inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700'
          >
            Contact Support
          </button>
        </div>

        {error ? (
          <div className='mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>{error}</div>
        ) : null}
        {actionMessage ? (
          <div className='mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>{actionMessage}</div>
        ) : null}

        {isLoading ? (
          <div className='grid grid-cols-[1.35fr_1fr] gap-3'>
            <div className='rounded-xl border border-slate-200 bg-white p-4'>
              <div className='h-5 w-1/3 animate-pulse rounded bg-slate-200' />
              <div className='mt-3 h-36 animate-pulse rounded bg-slate-100' />
            </div>
            <div className='rounded-xl border border-slate-200 bg-white p-4'>
              <div className='h-5 w-1/3 animate-pulse rounded bg-slate-200' />
              <div className='mt-3 h-64 animate-pulse rounded bg-slate-100' />
            </div>
          </div>
        ) : null}

        {!isLoading && order ? (
          <div className='grid grid-cols-[1.35fr_1fr] gap-3'>
            <div className='overflow-hidden rounded-xl border border-slate-200 bg-white'>
              <div className='flex items-center justify-between border-b border-slate-200 px-4 py-3'>
                <div>
                  <p className='text-sm font-semibold text-slate-900'>Order ID: {order.orderNumber}</p>
                  <p className='mt-0.5 text-xs text-slate-500'>{formatDateTimeLabel(order.createdAt)}</p>
                </div>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone}`}>
                  {order.status}
                </span>
              </div>

              <div className='border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500'>Order info</div>
              <div>
                {(order.items || []).map((item) => (
                  <article key={item.id} className='grid grid-cols-[58px_1fr_auto_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0'>
                    <div className='relative h-14 w-14 overflow-hidden rounded-md border border-slate-200 bg-slate-100'>
                      {item.image ? (
                        <Image src={item.image} alt={item.name || 'Product'} fill sizes='56px' className='object-cover' />
                      ) : null}
                    </div>
                    <div className='min-w-0'>
                      <p className='line-clamp-1 text-sm font-semibold text-slate-900'>{item.name}</p>
                      <p className='line-clamp-1 text-xs text-slate-500'>{item.variation || 'Standard option'}</p>
                      {Number(order.protectionFee || 0) > 0 ? (
                        <p className='mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-700'>
                          <svg viewBox='0 0 24 24' className='h-3.5 w-3.5' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>
                            <path fillRule='evenodd' clipRule='evenodd' d='M12.4472 1.10557C12.1657 0.964809 11.8343 0.964809 11.5528 1.10557L3.55279 5.10557C3.214 5.27496 3 5.62123 3 6V12C3 14.6622 3.86054 16.8913 5.40294 18.7161C6.92926 20.5218 9.08471 21.8878 11.6214 22.9255C11.864 23.0248 12.136 23.0248 12.3786 22.9255C14.9153 21.8878 17.0707 20.5218 18.5971 18.7161C20.1395 16.8913 21 14.6622 21 12V6C21 5.62123 20.786 5.27496 20.4472 5.10557L12.4472 1.10557ZM5 12V6.61803L12 3.11803L19 6.61803V12C19 14.1925 18.305 15.9635 17.0696 17.425C15.8861 18.8252 14.1721 19.9803 12 20.9156C9.82786 19.9803 8.11391 18.8252 6.93039 17.425C5.69502 15.9635 5 14.1925 5 12ZM16.7572 9.65323C17.1179 9.23507 17.0714 8.60361 16.6532 8.24284C16.2351 7.88207 15.6036 7.9286 15.2428 8.34677L10.7627 13.5396L8.70022 11.5168C8.30592 11.1301 7.67279 11.1362 7.28607 11.5305C6.89935 11.9248 6.90549 12.5579 7.29978 12.9446L10.1233 15.7139C10.3206 15.9074 10.5891 16.0106 10.8651 15.9991C11.1412 15.9876 11.4002 15.8624 11.5807 15.6532L16.7572 9.65323Z' fill='currentColor'></path>
                          </svg>
                          <span>Order protected</span>
                        </p>
                      ) : null}
                    </div>
                    <div className='flex items-center gap-1.5'>
                      {item.isReturnable ? (
                        <button
                          type='button'
                          onClick={() => handleReturnItem(item.name)}
                          className='inline-flex h-7 items-center justify-center rounded border border-slate-300 px-2.5 text-xs font-semibold text-slate-700'
                        >
                          Return
                        </button>
                      ) : null}
                      {canReviewOrder ? (
                        <Link
                          href='/UserBackend/reviews'
                          className='inline-flex h-7 items-center justify-center rounded border border-slate-300 px-2.5 text-xs font-semibold text-slate-700'
                        >
                          Add review
                        </Link>
                      ) : (
                        <span className='inline-flex h-7 items-center justify-center rounded border border-slate-200 px-2.5 text-xs font-semibold text-slate-400'>
                          Add review
                        </span>
                      )}
                    </div>
                    <div className='text-right'>
                      <p className='text-sm font-semibold text-slate-900'>{formatMoney(item.lineTotal)}</p>
                      <p className='text-xs text-slate-500'>Qty: {item.quantity}</p>
                    </div>
                  </article>
                ))}
              </div>

              <div className='border-y border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500'>Delivery info</div>
              <div className='grid grid-cols-1 gap-3 border-b border-slate-200 px-4 py-3 text-sm sm:grid-cols-3'>
                <div className='min-w-0'>
                  <p className='text-xs font-semibold uppercase tracking-[0.04em] text-slate-500'>Address</p>
                  <p className='mt-1 whitespace-normal break-words text-slate-800'>{order.addressLabel || 'Address not available'}</p>
                </div>
                <div className='min-w-0'>
                  <p className='text-xs font-semibold uppercase tracking-[0.04em] text-slate-500'>Contact</p>
                  <p className='mt-1 whitespace-normal break-words text-slate-800'>{order.contactPhone || '-'}</p>
                </div>
                <div className='min-w-0'>
                  <p className='text-xs font-semibold uppercase tracking-[0.04em] text-slate-500'>Delivery method</p>
                  <p className='mt-1 whitespace-normal break-words text-slate-800'>{order.deliveryMethod || 'Standard delivery'}</p>
                </div>
              </div>

              <div className='border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500'>Order summary</div>
              <div
                className={`grid grid-cols-2 gap-3 px-4 py-3 text-sm text-slate-700 sm:grid-cols-3 ${
                  hasOrderProtection ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
                }`}
              >
                <div className='min-w-0'>
                  <p className='text-xs font-semibold uppercase tracking-[0.04em] text-slate-500'>Payment type</p>
                  <p className='mt-1 whitespace-normal break-words font-semibold text-slate-900'>{order.paymentMode}</p>
                </div>
                <div className='min-w-0'>
                  <p className='text-xs font-semibold uppercase tracking-[0.04em] text-slate-500'>Subtotal</p>
                  <p className='mt-1 whitespace-normal break-words font-semibold text-slate-900'>{formatMoney(order.subtotal)}</p>
                </div>
                <div className='min-w-0'>
                  <p className='text-xs font-semibold uppercase tracking-[0.04em] text-slate-500'>Shipping</p>
                  <p className='mt-1 whitespace-normal break-words font-semibold text-slate-900'>{Number(order.shippingFee || 0) > 0 ? formatMoney(order.shippingFee) : 'FREE'}</p>
                </div>
                {hasOrderProtection ? (
                  <div className='min-w-0'>
                    <p className='text-xs font-semibold uppercase tracking-[0.04em] text-slate-500'>Order protection</p>
                    <p className='mt-1 whitespace-normal break-words font-semibold text-slate-900'>{formatMoney(order.protectionFee)}</p>
                  </div>
                ) : null}
                <div className='min-w-0'>
                  <p className='text-xs font-semibold uppercase tracking-[0.04em] text-slate-500'>Total</p>
                  <p className='mt-1 whitespace-normal break-words text-base font-bold text-slate-900'>{formatMoney(order.totalAmount)}</p>
                </div>
              </div>
            </div>

            <div className='overflow-hidden rounded-xl border border-slate-200 bg-white'>
              <div className='flex items-center justify-between border-b border-slate-200 px-4 py-3'>
                <div>
                  <p className='text-sm font-semibold text-slate-900'>Track Order</p>
                  <p className='mt-0.5 text-xs text-slate-500'>Tracking No: {order.trackId}</p>
                </div>
                <button
                  type='button'
                  className='inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700'
                >
                  Cancel order
                </button>
              </div>
              <div className='border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500'>Order Activity</div>
              <div className='px-4 py-3'>
                {trackingSteps.map((step, index) => (
                  <div key={`${step.label}-${index}`} className='relative pl-6'>
                    {index < trackingSteps.length - 1 ? (
                      <span className='absolute left-[7px] top-4 h-[calc(100%-4px)] w-[2px] bg-slate-200' aria-hidden='true' />
                    ) : null}
                    <span
                      className={`absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 ${
                        step.isActive ? 'border-sky-500 bg-sky-500' : 'border-slate-300 bg-white'
                      }`}
                      aria-hidden='true'
                    />
                    <div className='pb-5'>
                      <p className={`text-sm font-semibold ${step.isActive ? 'text-slate-900' : 'text-slate-500'}`}>{step.label}</p>
                      <p className='text-xs text-slate-500'>Order is being processed.</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className='flex items-center gap-2 border-t border-slate-200 px-4 py-3'>
                <button
                  type='button'
                  onClick={handlePrimaryAction}
                  className='inline-flex h-10 flex-1 items-center justify-center rounded-md bg-[#1d4ed8] text-sm font-semibold text-white'
                >
                  {primaryActionLabel}
                </button>
                <button
                  type='button'
                  onClick={handleReorder}
                  disabled={isReordering}
                  className='inline-flex h-10 flex-1 items-center justify-center rounded-md border border-slate-300 text-sm font-semibold text-slate-700'
                >
                  {isReordering ? 'Reordering...' : 'Reorder'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className='w-full pb-28 min-[641px]:hidden'>
        <div className='space-y-3 px-3 pt-3'>
          {error ? (
            <div className='rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>{error}</div>
          ) : null}
          {actionMessage ? (
            <div className='rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>{actionMessage}</div>
          ) : null}

          {isLoading ? (
            <div className='rounded-xl border border-slate-200 bg-white p-3'>
              <div className='h-4 w-1/2 animate-pulse rounded bg-slate-200' />
              <div className='mt-2 h-3 w-2/3 animate-pulse rounded bg-slate-100' />
              <div className='mt-2 h-3 w-1/3 animate-pulse rounded bg-slate-100' />
            </div>
          ) : null}

          {!isLoading && order ? (
            <>
              <div className='flex items-start gap-2 px-1'>
                <Link
                  href='/UserBackend/orders'
                  className='mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e9edf1] text-slate-700'
                  aria-label='Back to orders'
                >
                  <span className='text-[11px] font-semibold'>ID</span>
                </Link>
                <div className='min-w-0'>
                  <p className='line-clamp-1 text-base font-semibold text-slate-900'>{order.orderNumber}</p>
                  <p className='text-sm text-slate-500'>{formatDate(order.createdAt)}</p>
                </div>
              </div>

              <article className='rounded-xl border border-slate-200 bg-white p-3'>
                <div className='text-sm'>
                  <div className='flex items-center justify-between'>
                    <p className='text-slate-500'>Status:</p>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone}`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className='mt-1 space-y-1 text-sm'>
                  <div className='flex items-center justify-between gap-3'>
                    <p className='text-slate-500'>Seller:</p>
                    <p className='text-right font-medium text-sky-700'>{order.seller}</p>
                  </div>
                  <div className='flex items-center justify-between gap-3'>
                    <p className='text-slate-500'>Track Id:</p>
                    <p className='text-right font-medium text-sky-700'>{order.trackId}</p>
                  </div>
                </div>

                <div className='mt-3 border-t border-slate-200 pt-3'>
                  <div className='flex items-start gap-2'>
                    <svg viewBox='0 0 32 32' className='mt-0.5 h-5 w-5 text-slate-500' fill='currentColor' aria-hidden='true'>
                      <path d='M 0 6 L 0 8 L 19 8 L 19 23 L 12.84375 23 C 12.398438 21.28125 10.851563 20 9 20 C 7.148438 20 5.601563 21.28125 5.15625 23 L 4 23 L 4 18 L 2 18 L 2 25 L 5.15625 25 C 5.601563 26.71875 7.148438 28 9 28 C 10.851563 28 12.398438 26.71875 12.84375 25 L 21.15625 25 C 21.601563 26.71875 23.148438 28 25 28 C 26.851563 28 28.398438 26.71875 28.84375 25 L 32 25 L 32 16.84375 L 31.9375 16.6875 L 29.9375 10.6875 L 29.71875 10 L 21 10 L 21 6 Z M 1 10 L 1 12 L 10 12 L 10 10 Z M 21 12 L 28.28125 12 L 30 17.125 L 30 23 L 28.84375 23 C 28.398438 21.28125 26.851563 20 25 20 C 23.148438 20 21.601563 21.28125 21.15625 23 L 21 23 Z M 2 14 L 2 16 L 8 16 L 8 14 Z M 9 22 C 10.117188 22 11 22.882813 11 24 C 11 25.117188 10.117188 26 9 26 C 7.882813 26 7 25.117188 7 24 C 7 22.882813 7.882813 22 9 22 Z M 25 22 C 26.117188 22 27 22.882813 27 24 C 27 25.117188 26.117188 26 25 26 C 23.882813 26 23 25.117188 23 24 C 23 22.882813 23.882813 22 25 22 Z' />
                    </svg>
                    <div>
                      <p className='text-sm font-semibold text-slate-900'>Delivery Address</p>
                      <p className='mt-0.5 text-sm text-slate-700'>{order.addressLabel || 'Address not available'}</p>
                    </div>
                  </div>
                </div>

                <div className='mt-3 border-t border-slate-200 pt-3'>
                  <div className='flex items-start gap-2'>
                    <svg viewBox='0 0 24 24' className='mt-0.5 h-5 w-5 text-slate-500' fill='currentColor' aria-hidden='true'>
                      <path d='M20 15C20.5523 15 21 14.5523 21 14C21 13.4477 20.5523 13 20 13C19.4477 13 19 13.4477 19 14C19 14.5523 19.4477 15 20 15Z' />
                      <path
                        fillRule='evenodd'
                        clipRule='evenodd'
                        d='M16.775 0.985398C18.4919 0.460783 20.2821 1.55148 20.6033 3.3178L20.9362 5.14896C22.1346 5.54225 23 6.67006 23 8V10.7639C23.6137 11.3132 24 12.1115 24 13V15C24 15.8885 23.6137 16.6868 23 17.2361V20C23 21.6569 21.6569 23 20 23H4C2.34315 23 1 21.6569 1 20V8C1 6.51309 2.08174 5.27884 3.50118 5.04128L16.775 0.985398ZM21 16C21.5523 16 22 15.5523 22 15V13C22 12.4477 21.5523 12 21 12H18C17.4477 12 17 12.4477 17 13V15C17 15.5523 17.4477 16 18 16H21ZM21 18V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V8C3 7.44772 3.44772 7 4 7H20C20.55 7 20.9962 7.44396 21 7.99303L21 10H18C16.3431 10 15 11.3431 15 13V15C15 16.6569 16.3431 18 18 18H21ZM18.6954 3.60705L18.9412 5H10L17.4232 2.82301C17.9965 2.65104 18.5914 3.01769 18.6954 3.60705Z'
                      />
                    </svg>
                    <div>
                      <p className='text-sm font-semibold text-slate-900'>Payment Mode</p>
                      <p className='mt-0.5 text-sm text-slate-700'>{order.paymentMode}</p>
                    </div>
                  </div>
                </div>

                <div className='mt-3 border-t border-slate-200 pt-3'>
                  <div className='flex items-start gap-2'>
                    <svg viewBox='0 0 20 20' className='mt-0.5 h-5 w-5 text-slate-500' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                      <path d='M3.5 6.5h13v7h-13z' />
                      <path d='M9.5 6.5V4.8a2.5 2.5 0 1 1 5 0v1.7' />
                    </svg>
                    <div>
                      <p className='text-sm font-semibold text-slate-900'>Delivery method</p>
                      <p className='mt-0.5 text-sm text-slate-700'>{order.deliveryMethod || 'Standard delivery'}</p>
                    </div>
                  </div>
                </div>
              </article>

              <div>
                <p className='px-1 text-lg font-semibold text-slate-900'>Products In Order</p>
                <div className='mt-2 space-y-2'>
                  {(order.items || []).map((item) => (
                    <article key={item.id} className='rounded-xl border border-slate-200 bg-white p-3'>
                      <div className='grid grid-cols-[96px_1fr_auto] gap-2.5'>
                        <div className='relative h-24 w-24 overflow-hidden rounded-md border border-slate-200 bg-slate-100'>
                          {item.image ? (
                            <Image src={item.image} alt={item.name || 'Product'} fill sizes='96px' className='object-cover' />
                          ) : null}
                        </div>
                        <div className='min-w-0'>
                          <p className='line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500'>
                            {item.vendor || 'OCPRIMES'}
                          </p>
                          <p className='line-clamp-2 text-sm font-semibold text-slate-900'>{item.name}</p>
                          {item.variation ? <p className='text-xs text-slate-500'>{item.variation}</p> : null}
                          <p className='text-xs text-slate-500'>Qty {item.quantity}</p>
                          {Number(order.protectionFee || 0) > 0 ? (
                            <p className='mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-700'>
                              <svg viewBox='0 0 24 24' className='h-3.5 w-3.5' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>
                                <path fillRule='evenodd' clipRule='evenodd' d='M12.4472 1.10557C12.1657 0.964809 11.8343 0.964809 11.5528 1.10557L3.55279 5.10557C3.214 5.27496 3 5.62123 3 6V12C3 14.6622 3.86054 16.8913 5.40294 18.7161C6.92926 20.5218 9.08471 21.8878 11.6214 22.9255C11.864 23.0248 12.136 23.0248 12.3786 22.9255C14.9153 21.8878 17.0707 20.5218 18.5971 18.7161C20.1395 16.8913 21 14.6622 21 12V6C21 5.62123 20.786 5.27496 20.4472 5.10557L12.4472 1.10557ZM5 12V6.61803L12 3.11803L19 6.61803V12C19 14.1925 18.305 15.9635 17.0696 17.425C15.8861 18.8252 14.1721 19.9803 12 20.9156C9.82786 19.9803 8.11391 18.8252 6.93039 17.425C5.69502 15.9635 5 14.1925 5 12ZM16.7572 9.65323C17.1179 9.23507 17.0714 8.60361 16.6532 8.24284C16.2351 7.88207 15.6036 7.9286 15.2428 8.34677L10.7627 13.5396L8.70022 11.5168C8.30592 11.1301 7.67279 11.1362 7.28607 11.5305C6.89935 11.9248 6.90549 12.5579 7.29978 12.9446L10.1233 15.7139C10.3206 15.9074 10.5891 16.0106 10.8651 15.9991C11.1412 15.9876 11.4002 15.8624 11.5807 15.6532L16.7572 9.65323Z' fill='currentColor'></path>
                              </svg>
                              <span>Order protected</span>
                            </p>
                          ) : null}
                        </div>
                        <div className='flex h-full min-h-[96px] flex-col items-end justify-between text-right'>
                          <p className='text-sm font-semibold text-slate-900'>{formatMoney(item.lineTotal)}</p>
                          <div className='flex items-center gap-2'>
                            {item.isReturnable ? (
                              <button
                                type='button'
                                onClick={() => handleReturnItem(item.name)}
                                className='inline-flex text-xs font-semibold text-slate-700 underline underline-offset-2'
                              >
                                Return
                              </button>
                            ) : null}
                            {canReviewOrder ? (
                              <Link
                                href='/UserBackend/reviews'
                                className='inline-flex text-xs font-semibold text-slate-700 underline underline-offset-2'
                              >
                                Add review
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className='fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2 backdrop-blur min-[641px]:hidden'>
        <div className='flex w-full gap-2'>
          <button
            type='button'
            onClick={handlePrimaryAction}
            className='inline-flex h-11 flex-1 items-center justify-center rounded-md bg-[#1d4ed8] text-sm font-semibold text-white'
          >
            {primaryActionLabel}
          </button>
          <button
            type='button'
            onClick={handleReorder}
            disabled={isReordering}
            className='inline-flex h-11 flex-1 items-center justify-center rounded-md border border-slate-300 text-sm font-semibold text-slate-700'
          >
            {isReordering ? 'Reordering...' : 'Reorder'}
          </button>
        </div>
      </div>
    </section>
  )
}
