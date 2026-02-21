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
    const status = String(order?.paymentStatus || '').toLowerCase()
    if (status === 'paid') return 'bg-emerald-100 text-emerald-700'
    if (status === 'failed') return 'bg-rose-100 text-rose-700'
    if (status === 'cancelled') return 'bg-slate-200 text-slate-700'
    return 'bg-amber-100 text-amber-700'
  }, [order?.paymentStatus])

  const primaryActionLabel = useMemo(() => {
    const status = String(order?.paymentStatus || '').toLowerCase()
    if (status === 'paid') return 'Track Order'
    if (status === 'pending') return 'Proceed to Payment'
    if (status === 'failed' || status === 'cancelled') return 'Retry Payment'
    return 'Proceed to Payment'
  }, [order?.paymentStatus])

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
      router.push('/cart')
    } catch (nextError) {
      setActionMessage(nextError?.message || 'Unable to reorder.')
    } finally {
      setIsReordering(false)
    }
  }

  return (
    <section className='min-h-screen bg-[#f4f5f7]'>
      <div className='mx-auto w-full max-w-md pb-28'>
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
                        </div>
                        <p className='text-sm font-semibold text-slate-900'>{formatMoney(item.lineTotal)}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className='fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2 backdrop-blur'>
        <div className='mx-auto flex w-full max-w-md gap-2'>
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
