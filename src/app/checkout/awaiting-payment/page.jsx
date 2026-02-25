'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUserI18n } from '@/lib/i18n/useUserI18n'

const toPaymentMethodLabel = (methodId, channel) => {
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
  return 'Online Payment'
}

const toPaymentMethodKey = (methodId, channel) => {
  const id = String(methodId || '').trim().toLowerCase()
  const ch = String(channel || '').trim().toLowerCase()
  if (id === 'visa') return 'visa'
  if (id === 'mastercard') return 'mastercard'
  if (id === 'verve') return 'verve'
  if (id === 'amex') return 'amex'
  if (id === 'bank-transfer' || ch === 'bank_transfer') return 'bank_transfer'
  if (id === 'ussd' || ch === 'ussd') return 'ussd'
  if (ch === 'card') return 'card'
  return 'generic'
}

const PaymentMethodIcon = ({ methodKey }) => {
  if (methodKey === 'visa') {
    return <span className='text-[11px] font-black tracking-tight text-[#1A1F71]'>VISA</span>
  }
  if (methodKey === 'mastercard') {
    return (
      <svg viewBox='0 0 36 24' className='h-4 w-6' aria-hidden='true'>
        <circle cx='14' cy='12' r='7' fill='#eb001b' />
        <circle cx='22' cy='12' r='7' fill='#f79e1b' />
        <rect x='15.3' y='6' width='5.4' height='12' fill='#ff5f00' />
      </svg>
    )
  }
  if (methodKey === 'verve') {
    return (
      <svg viewBox='0 0 50 20' className='h-4 w-8' aria-hidden='true'>
        <rect x='0' y='0' width='50' height='20' rx='5' fill='#ffffff' />
        <path d='M5 14c5 0 7-8 12-8h8c5 0 5 8 10 8' fill='none' stroke='#0d7d3e' strokeWidth='3' />
      </svg>
    )
  }
  if (methodKey === 'amex') {
    return <span className='text-[10px] font-bold tracking-wide text-[#016FD0]'>AMEX</span>
  }
  if (methodKey === 'bank_transfer') {
    return <span className='text-[10px] font-bold tracking-wide text-slate-700'>BANK</span>
  }
  if (methodKey === 'ussd') {
    return <span className='text-[10px] font-bold tracking-wide text-emerald-700'>USSD</span>
  }
  if (methodKey === 'card') {
    return (
      <svg viewBox='0 0 24 24' className='h-4 w-4 text-slate-700' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
        <rect x='2.5' y='5' width='19' height='14' rx='2.5' />
        <path d='M3 9h18' />
      </svg>
    )
  }
  return (
    <svg viewBox='0 0 24 24' className='h-4 w-4 text-slate-700' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
      <circle cx='12' cy='12' r='9' />
      <path d='M8 12h8M12 8v8' />
    </svg>
  )
}

const formatCountdown = (secondsLeft) => {
  const safe = Math.max(0, Number(secondsLeft || 0))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function AwaitingPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { formatMoney } = useUserI18n()
  const reference = String(searchParams?.get('reference') || '').trim()
  const redirectUrl = String(searchParams?.get('redirect') || '').trim()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('pending')
  const [order, setOrder] = useState(null)
  const [expiresAt, setExpiresAt] = useState('')
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [resumeUrl, setResumeUrl] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const redirectToFailed = useCallback((message, source = 'awaiting_payment') => {
    const failedParams = new URLSearchParams()
    failedParams.set('source', source)
    failedParams.set('reason', String(message || 'Payment could not be confirmed.'))
    if (reference) failedParams.set('reference', reference)
    router.replace(`/checkout/payment-failed?${failedParams.toString()}`)
  }, [reference, router])

  useEffect(() => {
    if (!reference || typeof window === 'undefined') return
    const storageKey = `paystack_redirect_${reference}`
    const incomingUrl = redirectUrl ? decodeURIComponent(redirectUrl) : ''
    if (incomingUrl) {
      setResumeUrl(incomingUrl)
      try {
        window.localStorage.setItem(storageKey, incomingUrl)
      } catch {
        // ignore storage errors
      }
      return
    }
    try {
      const savedUrl = String(window.localStorage.getItem(storageKey) || '').trim()
      if (savedUrl) {
        setResumeUrl(savedUrl)
      }
    } catch {
      // ignore storage errors
    }
  }, [reference, redirectUrl])

  useEffect(() => {
    if (!reference) {
      setError('Missing payment reference.')
      setIsLoading(false)
      return
    }

    let cancelled = false

    const loadStatus = async () => {
      try {
        const response = await fetch('/api/payments/paystack/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference }),
        })
        const payload = await response.json().catch(() => null)
        if (cancelled) return

        if (response.ok && payload?.order && !payload?.awaitingConfirmation) {
          router.replace(`/checkout/review?reference=${encodeURIComponent(reference)}`)
          return
        }

        if (response.status === 202 || payload?.awaitingConfirmation) {
          setStatus(String(payload?.paymentStatus || 'pending').toLowerCase())
          setOrder(payload?.order || null)
          setExpiresAt(String(payload?.expiresAt || ''))
          setRemainingSeconds(Number(payload?.remainingSeconds || 0))
          setError('')
          setIsLoading(false)
          return
        }

        redirectToFailed(payload?.error || 'Unable to load payment status.')
      } catch {
        if (!cancelled) {
          redirectToFailed('Unable to load payment status.')
        }
      }
    }

    void loadStatus()
    const pollId = setInterval(() => {
      void loadStatus()
    }, 5000)

    return () => {
      cancelled = true
      clearInterval(pollId)
    }
  }, [reference, refreshKey, redirectToFailed])

  useEffect(() => {
    if (!expiresAt) return
    const tickId = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
      setRemainingSeconds(remaining)
    }, 1000)
    return () => clearInterval(tickId)
  }, [expiresAt])

  useEffect(() => {
    if (!reference || typeof window === 'undefined') return
    const handler = (event) => {
      const data = event?.data && typeof event.data === 'object' ? event.data : {}
      if (String(data?.type || '') !== 'paystack:return') return
      if (String(data?.reference || '') !== reference) return
      setRefreshKey((value) => value + 1)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [reference])

  const paymentMeta = useMemo(() => {
    const shippingAddress = order?.shippingAddress || {}
    return {
      label: toPaymentMethodLabel(shippingAddress.paymentMethod, shippingAddress.paymentChannel),
      key: toPaymentMethodKey(shippingAddress.paymentMethod, shippingAddress.paymentChannel),
    }
  }, [order?.shippingAddress])

  const statusLabel =
    status === 'pending'
      ? 'Awaiting Payment'
      : status === 'paid'
        ? 'Payment Confirmed'
        : status === 'cancelled'
          ? 'Cancelled'
          : status
  const isAwaiting = status === 'pending'
  const isPaid = status === 'paid'
  const isStopped = status === 'failed' || status === 'cancelled'
  const canResumePayment = !isPaid && !isStopped
  const countdownLabel = formatCountdown(remainingSeconds)

  if (isLoading) {
    return (
      <div className='min-h-screen bg-[radial-gradient(circle_at_top,#e8f0ff_0%,#f4f6fb_45%,#f8fafc_100%)] px-4 py-10 text-slate-900 sm:px-6'>
        <div className='mx-auto max-w-3xl rounded-2xl border border-[#d9e4f3] bg-white/95 p-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur'>
          <div className='mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-[#c8d7f3] border-t-[#1d4ed8]' />
          <p className='text-base font-semibold text-slate-800'>Preparing your secure payment session...</p>
          <p className='mt-1 text-sm text-slate-500'>This can take a few seconds.</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-[radial-gradient(circle_at_top,#e8f0ff_0%,#f4f6fb_45%,#f8fafc_100%)] px-0 py-4 text-slate-900 sm:px-6 sm:py-10'>
      <div className='mx-auto w-full max-w-6xl'>
        <section className='pb-4 sm:hidden'>
          <header className='flex items-center justify-between py-2'>
            <button
              type='button'
              onClick={() => router.back()}
              className='inline-flex h-8 w-8 items-center justify-center text-slate-700'
              aria-label='Go back'
            >
              <svg viewBox='0 0 20 20' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='2'>
                <path d='M12.5 4.5L7 10l5.5 5.5' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
            </button>
            <h1 className='text-sm font-bold tracking-[0.08em] text-slate-900'>CHECKOUT</h1>
            <span className='h-8 w-8' />
          </header>

          <div className='mt-2 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm'>
            <div className='grid grid-cols-3 gap-1 text-center text-[10px] leading-tight'>
              <div className='text-slate-900'>
                <div className='mx-auto mb-1 inline-flex items-center justify-center text-slate-900'>
                  <svg viewBox='0 0 256 256' className='h-6 w-6' fill='currentColor' aria-hidden='true'>
                    <polygon points='256,80.7 211.6,36.9 142,36.9 142,80.7' />
                    <polygon points='118,36.9 48.1,36.9 4,80.7 118,80.7' />
                    <path d='M142,93.9v44.4H118V93.9H4v169.2h252V93.9H142z M176.1,180.1l16.6,16.6h-7.2V225h-18.9v-28.3h-7.2L176.1,180.1z M238.8,245.9h-79.3V233h79.3V245.9z M231.7,196.7V225h-18.9v-28.3h-7.2l16.6-16.6l16.6,16.6H231.7z' />
                  </svg>
                </div>
                <p className='font-semibold'>Shipping</p>
              </div>
              <div className='relative text-slate-900'>
                <span className='pointer-events-none absolute -left-[35%] top-2.5 z-0 h-0 w-[70%] border-t-2 border-dotted border-slate-300' aria-hidden='true' />
                <div className='relative z-10 mx-auto mb-1 inline-flex items-center justify-center bg-white px-0.5'>
                  <svg viewBox='0 0 24 24' className='h-7 w-7' fill='none' stroke='currentColor' aria-hidden='true'>
                    <rect x='3' y='6' width='18' height='13' rx='2' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' />
                    <path d='M3 10H20.5' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' />
                    <path d='M7 15H9' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' />
                  </svg>
                </div>
                <p className='font-semibold'>Pay</p>
              </div>
              <div className='relative text-slate-900'>
                <span className='pointer-events-none absolute -left-[35%] top-2.5 z-0 h-0 w-[70%] border-t-2 border-dotted border-slate-300' aria-hidden='true' />
                <div className='relative z-10 mx-auto mb-1 inline-flex items-center justify-center bg-white px-0.5'>
                  <svg viewBox='0 0 24 24' className='h-7 w-7' fill='none' stroke='currentColor' aria-hidden='true'>
                    <rect x='5' y='4' width='14' height='17' rx='2' strokeWidth='2.2' />
                    <path d='M9 9H15' strokeWidth='2.2' strokeLinecap='round' />
                    <path d='M9 13H15' strokeWidth='2.2' strokeLinecap='round' />
                    <path d='M9 17H13' strokeWidth='2.2' strokeLinecap='round' />
                  </svg>
                </div>
                <p className='font-semibold'>Checkout</p>
              </div>
            </div>
            <div className='mt-2 grid grid-cols-3'>
              <span className='mx-auto h-0.5 w-14 rounded-full bg-slate-900' />
              <span className='mx-auto h-0.5 w-14 rounded-full bg-slate-900' />
              <span className='mx-auto h-0.5 w-14 rounded-full bg-slate-900' />
            </div>
          </div>
        </section>

        <header className='mb-4 hidden flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d9e4f3] bg-white/95 px-4 py-3 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:flex sm:px-6'>
          <div>
            <p className='text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500'>OCPRIMES Checkout</p>
            <p className='text-sm text-slate-600'>Checkout Section • Awaiting Payment</p>
          </div>
          <div className='inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700'>
            <span className='inline-block h-2 w-2 rounded-full bg-emerald-500' />
            Secure session active
          </div>
        </header>

        <div className='grid gap-2 lg:grid-cols-[1.6fr_1fr]'>
          <section className='border-y border-[#d9e4f3] bg-white/95 p-4 shadow-none backdrop-blur sm:rounded-2xl sm:border sm:p-6 sm:shadow-[0_24px_60px_rgba(15,23,42,0.08)]'>
            <p className='text-xs font-semibold uppercase tracking-[0.1em] text-slate-500'>Payment Status</p>
            <h1 className='mt-2 text-3xl font-bold tracking-tight text-slate-900'>Complete your payment</h1>
            <p className='mt-2 text-sm text-slate-600'>
              We&apos;ve prepared your order. Please complete payment within <span className='font-semibold text-slate-900'>2 minutes</span> to proceed.
            </p>

            <div className='mt-5 rounded-xl border border-[#e2e8f5] bg-[linear-gradient(135deg,#f8fbff_0%,#eef5ff_100%)] p-4'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500'>Time Remaining</p>
              <p className='mt-1 text-4xl font-bold tracking-tight text-slate-900'>{countdownLabel}</p>
              <p className='mt-2 text-xs font-semibold text-slate-700'>Status: {statusLabel}</p>
            </div>
            <p
              className={`mt-3 text-sm font-semibold ${
                isPaid ? 'text-emerald-700' : isAwaiting ? 'text-amber-700' : 'text-rose-700'
              }`}
            >
              {isPaid
                ? 'Payment verified successfully by Paystack.'
                : isAwaiting
                  ? 'Waiting for confirmation from Paystack.'
                  : 'Payment session is no longer active.'}
            </p>

            {error ? (
              <div className='mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
                {error}
              </div>
            ) : null}

            <div className='mt-6 flex flex-wrap gap-2.5'>
              {resumeUrl ? (
                <button
                  type='button'
                  onClick={() => window.open(resumeUrl, '_blank')}
                  className='inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-4 text-[13px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50'
                  disabled={!canResumePayment}
                >
                  Pay Now
                </button>
              ) : (
                <button
                  type='button'
                  onClick={() => router.push('/checkout/payment')}
                  className='inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-4 text-[13px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50'
                  disabled={!canResumePayment}
                >
                  Pay Now
                </button>
              )}
              <Link
                href='/cart'
                className='inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50'
              >
                Back to Cart
              </Link>
            </div>

            <div className='mt-6 grid gap-2 text-xs text-slate-500 sm:grid-cols-3'>
              <div className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2'>Order held while payment is pending</div>
              <div className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2'>Status updates every few seconds</div>
              <div className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2'>Payment updates continue even if checkout tab is closed</div>
            </div>
          </section>

          <aside className='border-y border-[#d9e4f3] bg-white/95 p-4 shadow-none backdrop-blur sm:rounded-2xl sm:border sm:p-5 sm:shadow-[0_24px_60px_rgba(15,23,42,0.08)]'>
            <p className='text-xs font-semibold uppercase tracking-[0.1em] text-slate-500'>Order Details</p>
            <div className='mt-2 space-y-1 text-sm text-slate-700'>
              <p><span className='text-slate-500'>Order</span> {order?.orderNumber || '-'}</p>
              <p className='break-all'><span className='text-slate-500'>Reference</span> {reference || '-'}</p>
              <div className='flex items-center gap-2'>
                <span className='text-slate-500'>Payment method</span>
                <span className='inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700'>
                  <PaymentMethodIcon methodKey={paymentMeta.key} />
                  <span>{paymentMeta.label}</span>
                </span>
              </div>
            </div>

            <div className='mt-4 space-y-2.5'>
              {(Array.isArray(order?.items) ? order.items : []).slice(0, 3).map((item) => (
                <div key={item.key || item.id} className='grid grid-cols-[56px_1fr_auto] items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50/70 p-2'>
                  <div className='relative h-[56px] w-[56px] overflow-hidden rounded-md border border-slate-200 bg-white'>
                    {item.image ? <Image src={item.image} alt={item.name} fill sizes='56px' className='object-cover' /> : null}
                  </div>
                  <div className='min-w-0'>
                    <p className='line-clamp-2 text-[13px] font-semibold text-slate-900'>{item.name}</p>
                    <p className='text-[11px] text-slate-500'>Qty {item.quantity}</p>
                  </div>
                  <p className='text-[13px] font-bold text-slate-900'>{formatMoney(item.lineTotal)}</p>
                </div>
              ))}
            </div>

            <div className='mt-4 space-y-1.5 border-t border-slate-200 pt-3 text-sm'>
              <div className='flex items-center justify-between text-slate-600'>
                <span>Subtotal</span>
                <span>{formatMoney(Number(order?.subtotal || 0))}</span>
              </div>
              <div className='flex items-center justify-between text-slate-600'>
                <span>Shipping</span>
                <span>{Number(order?.shippingFee || 0) > 0 ? formatMoney(Number(order?.shippingFee || 0)) : 'FREE'}</span>
              </div>
              <div className='flex items-center justify-between text-slate-600'>
                <span>Tax</span>
                <span>{formatMoney(Number(order?.taxAmount || 0))}</span>
              </div>
              <div className='mt-1 flex items-center justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900'>
                <span>Total</span>
                <span>{formatMoney(Number(order?.totalAmount || 0))}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
