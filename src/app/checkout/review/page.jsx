'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { useUserI18n } from '@/lib/i18n/useUserI18n'

const formatShipRange = (createdAt) => {
  const base = createdAt ? new Date(createdAt) : new Date()
  if (Number.isNaN(base.getTime())) return '5-7 business days'
  const minDate = new Date(base)
  minDate.setDate(minDate.getDate() + 5)
  const maxDate = new Date(base)
  maxDate.setDate(maxDate.getDate() + 7)
  const startLabel = minDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const endLabel = maxDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  return `${startLabel} - ${endLabel}, ${maxDate.getFullYear()}`
}

export default function CheckoutReviewPage() {
  const searchParams = useSearchParams()
  const { formatMoney } = useUserI18n()
  const reference = String(
    searchParams?.get('reference') || searchParams?.get('payment_reference') || '',
  ).trim()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [order, setOrder] = useState(null)
  const [isMobileQuickViewOpen, setIsMobileQuickViewOpen] = useState(false)

  useEffect(() => {
    if (!reference) {
      setError('Missing payment reference. Complete payment to continue.')
      setIsLoading(false)
      return
    }

    let cancelled = false
    const verifyAndLoadOrder = async () => {
      setIsLoading(true)
      setError('')
      const runVerifyAttempt = async () => {
        const response = await fetch('/api/payments/paystack/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference }),
        })
        const payload = await response.json().catch(() => null)
        if (cancelled) return

        if (response.status === 202 || payload?.awaitingConfirmation) {
          setTimeout(() => {
            void runVerifyAttempt()
          }, 1500)
          return
        }

        if (!response.ok || !payload?.order) {
          setError(payload?.error || 'Unable to confirm payment.')
          setOrder(null)
          setIsLoading(false)
          return
        }

        setOrder(payload.order)
        setIsLoading(false)
      }

      try {
        await runVerifyAttempt()
      } catch {
        if (!cancelled) {
          setError('Unable to confirm payment.')
          setOrder(null)
          setIsLoading(false)
        }
      }
    }

    void verifyAndLoadOrder()
    return () => {
      cancelled = true
    }
  }, [reference])

  const shippingWindow = useMemo(() => formatShipRange(order?.createdAt), [order?.createdAt])
  const shippingAddressLine = useMemo(() => {
    if (!order?.shippingAddress) return ''
    const shipping = order.shippingAddress
    return [
      shipping.line1,
      shipping.line2,
      [shipping.city, shipping.state].filter(Boolean).join(', '),
      [shipping.postalCode, shipping.country].filter(Boolean).join(', '),
    ]
      .filter(Boolean)
      .join(', ')
  }, [order?.shippingAddress])
  const orderItems = Array.isArray(order?.items) ? order.items : []
  const savedAmount = useMemo(
    () =>
      orderItems.reduce((sum, item) => {
        const original = Number(item?.originalUnitPrice ?? 0)
        const current = Number(item?.unitPrice ?? 0)
        const qty = Number(item?.quantity ?? 0)
        if (!Number.isFinite(original) || !Number.isFinite(current) || !Number.isFinite(qty)) return sum
        if (original <= current || qty <= 0) return sum
        return sum + (original - current) * qty
      }, 0),
    [orderItems],
  )
  const leadItem = orderItems.length > 0 ? orderItems[0] : null
  const mobilePreviewItems = orderItems.slice(0, 3)
  const desktopPreviewItems = orderItems.slice(0, 5)
  const hasMoreMobileItems = orderItems.length > 3
  const hasMoreDesktopItems = orderItems.length > 5
  const supportPolicyText = Number(order?.protectionFee || 0) > 0
    ? 'Order protection active'
    : '30-day return policy'

  if (isLoading) {
    return (
      <div className='min-h-screen bg-[#f3f4f6] text-slate-900'>
        <div className='mx-auto w-full max-w-5xl px-4 py-8 sm:px-6'>
          <div className='rounded-xl border border-slate-200 bg-white p-8 text-center'>
            <p className='text-sm font-medium text-slate-600'>Confirming your payment...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className='min-h-screen bg-[#f3f4f6] text-slate-900'>
        <div className='mx-auto w-full max-w-5xl px-4 py-8 sm:px-6'>
          <div className='rounded-xl border border-slate-200 bg-white p-6 text-center sm:p-8'>
            <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-rose-300 bg-rose-50 text-rose-600'>
              <svg viewBox='0 0 20 20' className='h-8 w-8' fill='none' stroke='currentColor' strokeWidth='2.2'>
                <path d='M6 6l8 8M14 6l-8 8' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
            </div>
            <h1 className='mt-4 text-2xl font-semibold text-slate-900'>Payment not confirmed</h1>
            <p className='mt-2 text-sm text-slate-600'>{error || 'Unable to confirm payment.'}</p>
            <div className='mt-5 flex justify-center gap-2'>
              <Link
                href='/checkout/payment'
                className='inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white'
              >
                Back to Payment
              </Link>
              <Link
                href='/cart'
                className='inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700'
              >
                Back to Cart
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-[#f3f4f6] text-slate-900'>
      <div className='mx-auto w-full max-w-5xl px-0 py-0 sm:px-6 sm:py-8'>
        <section className='sm:hidden'>
          <div className='min-h-screen w-full bg-white px-4 py-4'>
            <div className='text-center'>
              <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-emerald-700 text-emerald-700'>
                <svg viewBox='0 0 20 20' className='h-7 w-7' fill='none' stroke='currentColor' strokeWidth='2.2'>
                  <path d='M4.8 10.5 8.1 13.8l7-7' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
              </div>
              <h1 className='mt-3 text-xl font-semibold text-slate-900'>Order successful</h1>
              <p className='mt-1 text-xs text-slate-500'>Your order was placed successfully.</p>
              <p className='mt-0.5 text-xs font-semibold text-slate-700'>Your order number is {order.orderNumber}</p>
            </div>

            {orderItems.length > 0 ? (
              <div className='mt-4 rounded-lg border border-slate-200 p-2.5'>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isMobileQuickViewOpen ? 'max-h-0 opacity-0' : 'max-h-[420px] opacity-100'
                  }`}
                  aria-hidden={isMobileQuickViewOpen}
                >
                  <div className='rounded-md'>
                    {mobilePreviewItems.map((item) => (
                      <div
                        key={item.key || `${item.id}-${item.quantity}`}
                        className='grid grid-cols-[60px_1fr_auto] items-center gap-2 px-1.5 py-1.5'
                      >
                        <div className='relative h-[60px] w-[60px] overflow-hidden rounded border border-slate-200 bg-slate-100'>
                          {item.image ? (
                            <Image src={item.image} alt={item.name} fill sizes='60px' className='object-cover' />
                          ) : null}
                        </div>
                        <div className='min-w-0'>
                          <p className='line-clamp-2 text-[11px] font-semibold text-slate-900'>{item.name}</p>
                          <p className='text-[10px] text-slate-500'>
                            {item.selectedVariationLabel ? `${item.selectedVariationLabel} · ` : ''}
                            Qty {item.quantity}
                          </p>
                          {Number(order?.protectionFee || 0) > 0 ? (
                            <p className='mt-0.5 inline-flex items-center gap-1 text-[10px] text-slate-500'>
                              <svg viewBox='0 0 24 24' className='h-3.5 w-3.5' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>
                                <path
                                  fillRule='evenodd'
                                  clipRule='evenodd'
                                  d='M12.4472 1.10557C12.1657 0.964809 11.8343 0.964809 11.5528 1.10557L3.55279 5.10557C3.214 5.27496 3 5.62123 3 6V12C3 14.6622 3.86054 16.8913 5.40294 18.7161C6.92926 20.5218 9.08471 21.8878 11.6214 22.9255C11.864 23.0248 12.136 23.0248 12.3786 22.9255C14.9153 21.8878 17.0707 20.5218 18.5971 18.7161C20.1395 16.8913 21 14.6622 21 12V6C21 5.62123 20.786 5.27496 20.4472 5.10557L12.4472 1.10557ZM5 12V6.61803L12 3.11803L19 6.61803V12C19 14.1925 18.305 15.9635 17.0696 17.425C15.8861 18.8252 14.1721 19.9803 12 20.9156C9.82786 19.9803 8.11391 18.8252 6.93039 17.425C5.69502 15.9635 5 14.1925 5 12ZM16.7572 9.65323C17.1179 9.23507 17.0714 8.60361 16.6532 8.24284C16.2351 7.88207 15.6036 7.9286 15.2428 8.34677L10.7627 13.5396L8.70022 11.5168C8.30592 11.1301 7.67279 11.1362 7.28607 11.5305C6.89935 11.9248 6.90549 12.5579 7.29978 12.9446L10.1233 15.7139C10.3206 15.9074 10.5891 16.0106 10.8651 15.9991C11.1412 15.9876 11.4002 15.8624 11.5807 15.6532L16.7572 9.65323Z'
                                  fill='#00ff04'
                                />
                              </svg>
                              <span>Order protection</span>
                            </p>
                          ) : null}
                        </div>
                        <div className='text-right'>
                          <p className='text-xs font-semibold text-slate-900'>{formatMoney(item.lineTotal)}</p>
                          {Number(item?.originalUnitPrice ?? 0) > Number(item?.unitPrice ?? 0) ? (
                            <p className='mt-0.5 text-[10px] text-slate-400 line-through'>
                              {formatMoney(Number(item.originalUnitPrice || 0) * Number(item.quantity || 0))}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  {hasMoreMobileItems ? (
                    <button
                      type='button'
                      onClick={() => setIsMobileQuickViewOpen(true)}
                      className='mt-2 inline-flex w-full items-center justify-between text-[11px] font-semibold text-slate-600'
                    >
                      <span>View More</span>
                      <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2'>
                        <path d='M8 5l5 5-5 5' strokeLinecap='round' strokeLinejoin='round' />
                      </svg>
                    </button>
                  ) : null}
                </div>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isMobileQuickViewOpen ? 'mt-2 max-h-[900px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                  aria-hidden={!isMobileQuickViewOpen}
                >
                  <div className='space-y-2'>
                    <div className='rounded-md'>
                      {orderItems.map((item) => (
                        <div
                          key={item.key || `${item.id}-${item.quantity}`}
                          className='grid grid-cols-[60px_1fr_auto] items-center gap-2 px-1.5 py-1.5'
                        >
                          <div className='relative h-[60px] w-[60px] overflow-hidden rounded border border-slate-200 bg-slate-100'>
                            {item.image ? (
                              <Image src={item.image} alt={item.name} fill sizes='60px' className='object-cover' />
                            ) : null}
                          </div>
                          <div className='min-w-0'>
                            <p className='line-clamp-2 text-[11px] font-semibold text-slate-900'>{item.name}</p>
                            <p className='text-[10px] text-slate-500'>
                              {item.selectedVariationLabel ? `${item.selectedVariationLabel} · ` : ''}
                              Qty {item.quantity}
                            </p>
                            {Number(order?.protectionFee || 0) > 0 ? (
                              <p className='mt-0.5 inline-flex items-center gap-1 text-[10px] text-slate-500'>
                                <svg viewBox='0 0 24 24' className='h-3.5 w-3.5' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>
                                  <path
                                    fillRule='evenodd'
                                    clipRule='evenodd'
                                    d='M12.4472 1.10557C12.1657 0.964809 11.8343 0.964809 11.5528 1.10557L3.55279 5.10557C3.214 5.27496 3 5.62123 3 6V12C3 14.6622 3.86054 16.8913 5.40294 18.7161C6.92926 20.5218 9.08471 21.8878 11.6214 22.9255C11.864 23.0248 12.136 23.0248 12.3786 22.9255C14.9153 21.8878 17.0707 20.5218 18.5971 18.7161C20.1395 16.8913 21 14.6622 21 12V6C21 5.62123 20.786 5.27496 20.4472 5.10557L12.4472 1.10557ZM5 12V6.61803L12 3.11803L19 6.61803V12C19 14.1925 18.305 15.9635 17.0696 17.425C15.8861 18.8252 14.1721 19.9803 12 20.9156C9.82786 19.9803 8.11391 18.8252 6.93039 17.425C5.69502 15.9635 5 14.1925 5 12ZM16.7572 9.65323C17.1179 9.23507 17.0714 8.60361 16.6532 8.24284C16.2351 7.88207 15.6036 7.9286 15.2428 8.34677L10.7627 13.5396L8.70022 11.5168C8.30592 11.1301 7.67279 11.1362 7.28607 11.5305C6.89935 11.9248 6.90549 12.5579 7.29978 12.9446L10.1233 15.7139C10.3206 15.9074 10.5891 16.0106 10.8651 15.9991C11.1412 15.9876 11.4002 15.8624 11.5807 15.6532L16.7572 9.65323Z'
                                    fill='#00ff04'
                                  />
                                </svg>
                                <span>Order protection</span>
                              </p>
                            ) : null}
                          </div>
                          <div className='text-right'>
                            <p className='text-xs font-semibold text-slate-900'>{formatMoney(item.lineTotal)}</p>
                            {Number(item?.originalUnitPrice ?? 0) > Number(item?.unitPrice ?? 0) ? (
                              <p className='mt-0.5 text-[10px] text-slate-400 line-through'>
                                {formatMoney(Number(item.originalUnitPrice || 0) * Number(item.quantity || 0))}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                    {hasMoreMobileItems ? (
                      <button
                        type='button'
                        onClick={() => setIsMobileQuickViewOpen(false)}
                        className='inline-flex w-full items-center justify-between text-[11px] font-semibold text-slate-600'
                      >
                        <span>See less</span>
                        <svg viewBox='0 0 20 20' className='h-4 w-4 rotate-90' fill='none' stroke='currentColor' strokeWidth='2'>
                          <path d='M8 5l5 5-5 5' strokeLinecap='round' strokeLinejoin='round' />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <div className='mt-3 border-t border-slate-200 pt-3'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500'>Deliver to</p>
              <p className='mt-1 text-xs text-slate-700'>{shippingAddressLine || 'Address will be confirmed by support.'}</p>
              <div className='mt-2 space-y-1.5'>
                <div className='flex items-center gap-2 text-xs text-slate-600'>
                  <svg viewBox='0 0 32 32' className='h-4 w-4 text-slate-500 fill-current' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>
                    <path d='M 0 6 L 0 8 L 19 8 L 19 23 L 12.84375 23 C 12.398438 21.28125 10.851563 20 9 20 C 7.148438 20 5.601563 21.28125 5.15625 23 L 4 23 L 4 18 L 2 18 L 2 25 L 5.15625 25 C 5.601563 26.71875 7.148438 28 9 28 C 10.851563 28 12.398438 26.71875 12.84375 25 L 21.15625 25 C 21.601563 26.71875 23.148438 28 25 28 C 26.851563 28 28.398438 26.71875 28.84375 25 L 32 25 L 32 16.84375 L 31.9375 16.6875 L 29.9375 10.6875 L 29.71875 10 L 21 10 L 21 6 Z M 1 10 L 1 12 L 10 12 L 10 10 Z M 21 12 L 28.28125 12 L 30 17.125 L 30 23 L 28.84375 23 C 28.398438 21.28125 26.851563 20 25 20 C 23.148438 20 21.601563 21.28125 21.15625 23 L 21 23 Z M 2 14 L 2 16 L 8 16 L 8 14 Z M 9 22 C 10.117188 22 11 22.882813 11 24 C 11 25.117188 10.117188 26 9 26 C 7.882813 26 7 25.117188 7 24 C 7 22.882813 7.882813 22 9 22 Z M 25 22 C 26.117188 22 27 22.882813 27 24 C 27 25.117188 26.117188 26 25 26 C 23.882813 26 23 25.117188 23 24 C 23 22.882813 23.882813 22 25 22 Z' />
                  </svg>
                  <span>Delivery by {shippingWindow}</span>
                </div>
                <div className='flex items-center gap-2 text-xs text-slate-600'>
                  <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>
                    <path
                      fillRule='evenodd'
                      clipRule='evenodd'
                      d='M12.4472 1.10557C12.1657 0.964809 11.8343 0.964809 11.5528 1.10557L3.55279 5.10557C3.214 5.27496 3 5.62123 3 6V12C3 14.6622 3.86054 16.8913 5.40294 18.7161C6.92926 20.5218 9.08471 21.8878 11.6214 22.9255C11.864 23.0248 12.136 23.0248 12.3786 22.9255C14.9153 21.8878 17.0707 20.5218 18.5971 18.7161C20.1395 16.8913 21 14.6622 21 12V6C21 5.62123 20.786 5.27496 20.4472 5.10557L12.4472 1.10557ZM5 12V6.61803L12 3.11803L19 6.61803V12C19 14.1925 18.305 15.9635 17.0696 17.425C15.8861 18.8252 14.1721 19.9803 12 20.9156C9.82786 19.9803 8.11391 18.8252 6.93039 17.425C5.69502 15.9635 5 14.1925 5 12ZM16.7572 9.65323C17.1179 9.23507 17.0714 8.60361 16.6532 8.24284C16.2351 7.88207 15.6036 7.9286 15.2428 8.34677L10.7627 13.5396L8.70022 11.5168C8.30592 11.1301 7.67279 11.1362 7.28607 11.5305C6.89935 11.9248 6.90549 12.5579 7.29978 12.9446L10.1233 15.7139C10.3206 15.9074 10.5891 16.0106 10.8651 15.9991C11.1412 15.9876 11.4002 15.8624 11.5807 15.6532L16.7572 9.65323Z'
                      fill='#00ff04'
                    />
                  </svg>
                  <span>{supportPolicyText}</span>
                </div>
              </div>
            </div>

            <div className='mt-4 flex items-center justify-between border-t border-slate-200 pt-3'>
              <span className='text-sm font-semibold text-slate-900'>Total price</span>
              <span className='text-base font-bold text-slate-900'>{formatMoney(order.totalAmount)}</span>
            </div>
            {savedAmount > 0 ? (
              <p className='mt-1 text-xs font-semibold text-emerald-700'>You save {formatMoney(savedAmount)}</p>
            ) : null}

            <div className='mt-4 space-y-2'>
              <Link
                href='/UserBackend/orders'
                className='inline-flex h-11 w-full items-center justify-center rounded-md bg-black text-sm font-semibold text-white'
              >
                Track order
              </Link>
              <Link
                href='/'
                className='inline-flex h-11 w-full items-center justify-center rounded-md border border-black bg-white text-sm font-semibold text-black'
              >
                Continue shopping
              </Link>
            </div>
          </div>
        </section>

        <section className='hidden min-h-screen w-full bg-white p-0 sm:block sm:p-8'>
          <div className='mx-auto max-w-2xl text-center'>
            <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-700 text-emerald-700'>
              <svg viewBox='0 0 20 20' className='h-9 w-9' fill='none' stroke='currentColor' strokeWidth='2.2'>
                <path d='M4.8 10.5 8.1 13.8l7-7' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
            </div>
            <h1 className='mt-4 text-3xl font-semibold text-slate-900'>Order successful</h1>
            <p className='mt-2 text-sm text-slate-600'>Your order was placed successfully.</p>
            <p className='text-sm text-slate-600'>Your order number is {order.orderNumber}.</p>

            <div className='mx-auto mt-5 w-full max-w-xl rounded-xl border border-slate-200 bg-white p-4 text-left sm:p-5'>
              <h2 className='text-2xl font-semibold text-slate-900'>Order Summary</h2>
              <div className='mt-3 rounded-md'>
                {(isMobileQuickViewOpen ? orderItems : desktopPreviewItems).map((item) => (
                  <div
                    key={item.key || `${item.id}-${item.quantity}`}
                    className='grid grid-cols-[60px_1fr_auto] items-center gap-2 px-1.5 py-1.5'
                  >
                    <div className='relative h-[60px] w-[60px] overflow-hidden rounded border border-slate-200 bg-slate-100'>
                      {item.image ? (
                        <Image src={item.image} alt={item.name} fill sizes='60px' className='object-cover' />
                      ) : null}
                    </div>
                    <div className='min-w-0'>
                      <p className='line-clamp-2 text-sm font-semibold text-slate-900'>{item.name}</p>
                      <p className='text-xs text-slate-500'>
                        {item.selectedVariationLabel ? `${item.selectedVariationLabel} · ` : ''}
                        Qty {item.quantity}
                      </p>
                      {Number(order?.protectionFee || 0) > 0 ? (
                        <p className='mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500'>
                          <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>
                            <path
                              fillRule='evenodd'
                              clipRule='evenodd'
                              d='M12.4472 1.10557C12.1657 0.964809 11.8343 0.964809 11.5528 1.10557L3.55279 5.10557C3.214 5.27496 3 5.62123 3 6V12C3 14.6622 3.86054 16.8913 5.40294 18.7161C6.92926 20.5218 9.08471 21.8878 11.6214 22.9255C11.864 23.0248 12.136 23.0248 12.3786 22.9255C14.9153 21.8878 17.0707 20.5218 18.5971 18.7161C20.1395 16.8913 21 14.6622 21 12V6C21 5.62123 20.786 5.27496 20.4472 5.10557L12.4472 1.10557ZM5 12V6.61803L12 3.11803L19 6.61803V12C19 14.1925 18.305 15.9635 17.0696 17.425C15.8861 18.8252 14.1721 19.9803 12 20.9156C9.82786 19.9803 8.11391 18.8252 6.93039 17.425C5.69502 15.9635 5 14.1925 5 12ZM16.7572 9.65323C17.1179 9.23507 17.0714 8.60361 16.6532 8.24284C16.2351 7.88207 15.6036 7.9286 15.2428 8.34677L10.7627 13.5396L8.70022 11.5168C8.30592 11.1301 7.67279 11.1362 7.28607 11.5305C6.89935 11.9248 6.90549 12.5579 7.29978 12.9446L10.1233 15.7139C10.3206 15.9074 10.5891 16.0106 10.8651 15.9991C11.1412 15.9876 11.4002 15.8624 11.5807 15.6532L16.7572 9.65323Z'
                              fill='#00ff04'
                            />
                          </svg>
                          <span>Order protection</span>
                        </p>
                      ) : null}
                    </div>
                    <div className='text-right'>
                      <p className='text-sm font-semibold text-slate-900'>{formatMoney(item.lineTotal)}</p>
                      {Number(item?.originalUnitPrice ?? 0) > Number(item?.unitPrice ?? 0) ? (
                        <p className='mt-0.5 text-xs text-slate-400 line-through'>
                          {formatMoney(Number(item.originalUnitPrice || 0) * Number(item.quantity || 0))}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              {hasMoreDesktopItems ? (
                <button
                  type='button'
                  onClick={() => setIsMobileQuickViewOpen((prev) => !prev)}
                  className='mt-2 inline-flex w-full items-center justify-between text-sm font-semibold text-slate-600'
                >
                  <span>{isMobileQuickViewOpen ? 'See less' : 'View More'}</span>
                  <svg
                    viewBox='0 0 20 20'
                    className={`h-4 w-4 transition-transform ${isMobileQuickViewOpen ? 'rotate-90' : ''}`}
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <path d='M8 5l5 5-5 5' strokeLinecap='round' strokeLinejoin='round' />
                  </svg>
                </button>
              ) : null}

              <div className='mt-3 border-t border-slate-200 pt-3'>
                <p className='text-xs font-semibold uppercase tracking-[0.06em] text-slate-500'>Deliver to</p>
                <p className='mt-1 text-sm text-slate-700'>{shippingAddressLine || 'Address will be confirmed by support.'}</p>
                <div className='mt-2 space-y-1.5'>
                  <div className='flex items-center gap-2 text-sm text-slate-600'>
                    <svg viewBox='0 0 32 32' className='h-4 w-4 text-slate-500 fill-current' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>
                      <path d='M 0 6 L 0 8 L 19 8 L 19 23 L 12.84375 23 C 12.398438 21.28125 10.851563 20 9 20 C 7.148438 20 5.601563 21.28125 5.15625 23 L 4 23 L 4 18 L 2 18 L 2 25 L 5.15625 25 C 5.601563 26.71875 7.148438 28 9 28 C 10.851563 28 12.398438 26.71875 12.84375 25 L 21.15625 25 C 21.601563 26.71875 23.148438 28 25 28 C 26.851563 28 28.398438 26.71875 28.84375 25 L 32 25 L 32 16.84375 L 31.9375 16.6875 L 29.9375 10.6875 L 29.71875 10 L 21 10 L 21 6 Z M 1 10 L 1 12 L 10 12 L 10 10 Z M 21 12 L 28.28125 12 L 30 17.125 L 30 23 L 28.84375 23 C 28.398438 21.28125 26.851563 20 25 20 C 23.148438 20 21.601563 21.28125 21.15625 23 L 21 23 Z M 2 14 L 2 16 L 8 16 L 8 14 Z M 9 22 C 10.117188 22 11 22.882813 11 24 C 11 25.117188 10.117188 26 9 26 C 7.882813 26 7 25.117188 7 24 C 7 22.882813 7.882813 22 9 22 Z M 25 22 C 26.117188 22 27 22.882813 27 24 C 27 25.117188 26.117188 26 25 26 C 23.882813 26 23 25.117188 23 24 C 23 22.882813 23.882813 22 25 22 Z' />
                    </svg>
                    <span>Delivery by {shippingWindow}</span>
                  </div>
                  <div className='flex items-center gap-2 text-sm text-slate-600'>
                    <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>
                      <path
                        fillRule='evenodd'
                        clipRule='evenodd'
                        d='M12.4472 1.10557C12.1657 0.964809 11.8343 0.964809 11.5528 1.10557L3.55279 5.10557C3.214 5.27496 3 5.62123 3 6V12C3 14.6622 3.86054 16.8913 5.40294 18.7161C6.92926 20.5218 9.08471 21.8878 11.6214 22.9255C11.864 23.0248 12.136 23.0248 12.3786 22.9255C14.9153 21.8878 17.0707 20.5218 18.5971 18.7161C20.1395 16.8913 21 14.6622 21 12V6C21 5.62123 20.786 5.27496 20.4472 5.10557L12.4472 1.10557ZM5 12V6.61803L12 3.11803L19 6.61803V12C19 14.1925 18.305 15.9635 17.0696 17.425C15.8861 18.8252 14.1721 19.9803 12 20.9156C9.82786 19.9803 8.11391 18.8252 6.93039 17.425C5.69502 15.9635 5 14.1925 5 12ZM16.7572 9.65323C17.1179 9.23507 17.0714 8.60361 16.6532 8.24284C16.2351 7.88207 15.6036 7.9286 15.2428 8.34677L10.7627 13.5396L8.70022 11.5168C8.30592 11.1301 7.67279 11.1362 7.28607 11.5305C6.89935 11.9248 6.90549 12.5579 7.29978 12.9446L10.1233 15.7139C10.3206 15.9074 10.5891 16.0106 10.8651 15.9991C11.1412 15.9876 11.4002 15.8624 11.5807 15.6532L16.7572 9.65323Z'
                        fill='#00ff04'
                      />
                    </svg>
                    <span>{supportPolicyText}</span>
                  </div>
                </div>
              </div>

              <div className='mt-3 border-t border-slate-200 pt-3'>
                <div className='flex items-center justify-between text-sm text-slate-600'>
                  <span>Subtotal</span>
                  <span className='font-semibold text-slate-900'>{formatMoney(order.subtotal)}</span>
                </div>
                <div className='mt-1 flex items-center justify-between text-sm text-slate-600'>
                  <span>Shipping</span>
                  <span className='font-semibold text-slate-900'>
                    {Number(order.shippingFee || 0) > 0 ? formatMoney(order.shippingFee) : 'FREE'}
                  </span>
                </div>
                <div className='mt-1 flex items-center justify-between text-sm text-slate-600'>
                  <span>Tax</span>
                  <span className='font-semibold text-slate-900'>
                    {Number(order.taxAmount || 0) > 0 ? formatMoney(order.taxAmount) : 'FREE'}
                  </span>
                </div>
                {Number(order.protectionFee || 0) > 0 ? (
                  <div className='mt-1 flex items-center justify-between text-sm text-slate-600'>
                    <span>Order Protection</span>
                    <span className='font-semibold text-slate-900'>{formatMoney(order.protectionFee)}</span>
                  </div>
                ) : null}
                <div className='mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900'>
                  <span>Total</span>
                  <span>{formatMoney(order.totalAmount)}</span>
                </div>
                {savedAmount > 0 ? (
                  <p className='mt-1 text-sm font-semibold text-emerald-700'>You save {formatMoney(savedAmount)}</p>
                ) : null}
              </div>
            </div>

            <div className='mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row'>
              <Link
                href='/UserBackend/orders'
                className='inline-flex h-11 min-w-[180px] items-center justify-center rounded-md bg-black px-5 text-sm font-semibold text-white'
              >
                Track order
              </Link>
              <Link
                href='/UserBackend/orders'
                className='inline-flex h-11 min-w-[180px] items-center justify-center rounded-md border border-black bg-white px-5 text-sm font-semibold text-black'
              >
                View order
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
