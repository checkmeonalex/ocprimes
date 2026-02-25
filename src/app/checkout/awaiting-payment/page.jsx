'use client'

import { useEffect, useMemo, useState } from 'react'
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

        setError(payload?.error || 'Unable to load payment status.')
        setStatus(String(payload?.paymentStatus || 'failed').toLowerCase())
        setOrder(payload?.order || null)
        setIsLoading(false)
      } catch {
        if (!cancelled) {
          setError('Unable to load payment status.')
          setIsLoading(false)
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
  }, [reference, refreshKey])

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

  const paymentLabel = useMemo(() => {
    const shippingAddress = order?.shippingAddress || {}
    return toPaymentMethodLabel(shippingAddress.paymentMethod, shippingAddress.paymentChannel)
  }, [order?.shippingAddress])

  const statusLabel =
    status === 'pending'
      ? 'Awaiting Payment'
      : status === 'paid'
        ? 'Payment Confirmed'
        : status === 'cancelled'
          ? 'Cancelled'
          : status

  if (isLoading) {
    return (
      <div className='min-h-screen bg-[#f4f6fb] px-4 py-10 text-slate-900 sm:px-6'>
        <div className='mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-center'>
          <p className='text-sm font-medium text-slate-600'>Preparing your payment session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-[#f4f6fb] px-4 py-6 text-slate-900 sm:px-6 sm:py-10'>
      <div className='mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[1.5fr_1fr]'>
        <section className='rounded-xl border border-slate-200 bg-white p-5 sm:p-6'>
          <p className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>Awaiting Payment</p>
          <h1 className='mt-2 text-2xl font-semibold'>Complete your payment</h1>
          <p className='mt-2 text-sm text-slate-600'>
            Your order is reserved. Complete payment within <span className='font-semibold text-slate-900'>30 minutes</span> to keep it active.
          </p>

          <div className='mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4'>
            <p className='text-xs font-semibold uppercase tracking-[0.08em] text-amber-700'>Time Left</p>
            <p className='mt-1 text-3xl font-bold text-amber-800'>{formatCountdown(remainingSeconds)}</p>
            <p className='mt-1 text-xs text-amber-700'>Status: {statusLabel}</p>
          </div>

          {status === 'paid' ? (
            <div className='mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700'>
              Payment verified successfully. You can now view your full order summary.
            </div>
          ) : null}

          {error ? (
            <div className='mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700'>
              {error}
            </div>
          ) : null}

          <div className='mt-5 flex flex-wrap gap-2'>
            {resumeUrl ? (
              <button
                type='button'
                onClick={() => window.open(resumeUrl, '_blank')}
                className='inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white'
                disabled={status === 'paid'}
              >
                Pay Now
              </button>
            ) : (
              <button
                type='button'
                onClick={() => router.push('/checkout/payment')}
                className='inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white'
                disabled={status === 'paid'}
              >
                Pay Now
              </button>
            )}
            {status === 'paid' ? (
              <Link
                href={`/checkout/review?reference=${encodeURIComponent(reference)}`}
                className='inline-flex items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700'
              >
                View Order
              </Link>
            ) : null}
            <Link
              href='/checkout/payment'
              className='inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700'
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
        </section>

        <aside className='rounded-xl border border-slate-200 bg-white p-5'>
          <p className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>Order Details</p>
          <p className='mt-1 text-sm text-slate-600'>Order {order?.orderNumber || '-'}</p>
          <p className='text-sm text-slate-600'>Reference {reference || '-'}</p>
          <p className='text-sm text-slate-600'>Payment method {paymentLabel}</p>

          <div className='mt-4 space-y-2'>
            {(Array.isArray(order?.items) ? order.items : []).slice(0, 3).map((item) => (
              <div key={item.key || item.id} className='grid grid-cols-[52px_1fr_auto] items-center gap-2'>
                <div className='relative h-[52px] w-[52px] overflow-hidden rounded border border-slate-200 bg-slate-100'>
                  {item.image ? <Image src={item.image} alt={item.name} fill sizes='52px' className='object-cover' /> : null}
                </div>
                <div className='min-w-0'>
                  <p className='line-clamp-2 text-xs font-semibold text-slate-900'>{item.name}</p>
                  <p className='text-[11px] text-slate-500'>Qty {item.quantity}</p>
                </div>
                <p className='text-xs font-semibold text-slate-900'>{formatMoney(item.lineTotal)}</p>
              </div>
            ))}
          </div>

          <div className='mt-4 space-y-1 border-t border-slate-200 pt-3 text-sm'>
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
            <div className='flex items-center justify-between font-semibold text-slate-900'>
              <span>Total</span>
              <span>{formatMoney(Number(order?.totalAmount || 0))}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
