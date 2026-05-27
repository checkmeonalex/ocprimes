'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const PAYMENT_METHODS = [
  { key: 'visa', label: 'VISA' },
  { key: 'mastercard', label: 'Mastercard' },
  { key: 'verve', label: 'VERVE' },
  { key: 'bank_transfer', label: 'BANK' },
  { key: 'ussd', label: '*737#' },
  { key: 'amex', label: 'AMEX' },
]

const paymentMethodClassName = (key) => {
  if (key === 'visa') return 'text-[#1A1F71]'
  if (key === 'mastercard') return 'text-[#EB001B]'
  if (key === 'verve') return 'text-[#0B1D4D]'
  if (key === 'bank_transfer') return 'text-slate-700'
  if (key === 'ussd') return 'text-emerald-700'
  return 'text-[#2E77BC]'
}

const FRIENDLY_PAYMENT_FAILURE_MESSAGE =
  "We couldn't confirm your payment. Please try again or choose another payment method."
const DEFAULT_REASON_LABEL = 'Network timeout'

const normalizeFailureReason = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return DEFAULT_REASON_LABEL
  const lowered = raw.toLowerCase()
  if (
    lowered.includes('network timeout') ||
    lowered.includes('failed to fetch') ||
    lowered.includes('network or checkout confirmation failed')
  ) {
    return DEFAULT_REASON_LABEL
  }
  return raw
}

export default function CheckoutPaymentFailedPage() {
  const searchParams = useSearchParams()
  const reason = String(searchParams?.get('reason') || '').trim()
  const orderFromQuery = String(
    searchParams?.get('order') ||
      searchParams?.get('order_id') ||
      searchParams?.get('orderId') ||
      searchParams?.get('order_number') ||
      '',
  ).trim()
  const reference = String(searchParams?.get('reference') || '').trim()
  const [resolvedOrder, setResolvedOrder] = useState(orderFromQuery)

  const resolvedReason = normalizeFailureReason(reason)

  useEffect(() => {
    setResolvedOrder(orderFromQuery)
  }, [orderFromQuery])

  useEffect(() => {
    if (resolvedOrder || !reference) return
    let cancelled = false

    const resolveOrderFromReference = async () => {
      try {
        const response = await fetch('/api/payments/paystack/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference }),
        })
        const payload = await response.json().catch(() => null)
        if (cancelled) return
        const nextOrder = String(
          payload?.order?.orderNumber ||
            payload?.order?.order_number ||
            payload?.order?.displayOrderId ||
            payload?.order?.id ||
            '',
        ).trim()
        if (nextOrder) setResolvedOrder(nextOrder)
      } catch {
        // keep URL fallback value
      }
    }

    void resolveOrderFromReference()
    return () => {
      cancelled = true
    }
  }, [reference, resolvedOrder])

  return (
    <div className='min-h-screen bg-[radial-gradient(circle_at_top,#f8fafc_0%,#edf1f7_52%,#e7ebf3_100%)] px-0 py-0 text-slate-900 sm:px-6 sm:py-10'>
      <div className='mx-auto w-full max-w-6xl'>
        <div className='grid gap-0 sm:gap-5 lg:grid-cols-[1.35fr_0.65fr]'>
          <section className='order-1 overflow-hidden bg-white sm:rounded-3xl sm:border sm:border-slate-200 sm:shadow-[0_20px_55px_rgba(15,23,42,0.08)] lg:order-1'>
            <div className='border-b border-slate-100 bg-[linear-gradient(180deg,#fff5f5_0%,#fff_100%)] px-5 py-7 sm:px-8 sm:py-9'>
              <div className='mx-auto flex h-16 w-16 items-center justify-center'>
                <svg viewBox='0 0 16 16' className='h-14 w-14' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>
                  <path
                    d='M7.493 0.015 C 7.442 0.021,7.268 0.039,7.107 0.055 C 5.234 0.242,3.347 1.208,2.071 2.634 C 0.660 4.211,-0.057 6.168,0.009 8.253 C 0.124 11.854,2.599 14.903,6.110 15.771 C 8.169 16.280,10.433 15.917,12.227 14.791 C 14.017 13.666,15.270 11.933,15.771 9.887 C 15.943 9.186,15.983 8.829,15.983 8.000 C 15.983 7.171,15.943 6.814,15.771 6.113 C 14.979 2.878,12.315 0.498,9.000 0.064 C 8.716 0.027,7.683 -0.006,7.493 0.015 M8.853 1.563 C 9.967 1.707,11.010 2.136,11.944 2.834 C 12.273 3.080,12.920 3.727,13.166 4.056 C 13.727 4.807,14.142 5.690,14.330 6.535 C 14.544 7.500,14.544 8.500,14.330 9.465 C 13.916 11.326,12.605 12.978,10.867 13.828 C 10.239 14.135,9.591 14.336,8.880 14.444 C 8.456 14.509,7.544 14.509,7.120 14.444 C 5.172 14.148,3.528 13.085,2.493 11.451 C 2.279 11.114,1.999 10.526,1.859 10.119 C 1.618 9.422,1.514 8.781,1.514 8.000 C 1.514 6.961,1.715 6.075,2.160 5.160 C 2.500 4.462,2.846 3.980,3.413 3.413 C 3.980 2.846,4.462 2.500,5.160 2.160 C 6.313 1.599,7.567 1.397,8.853 1.563 M7.706 4.290 C 7.482 4.363,7.355 4.491,7.293 4.705 C 7.257 4.827,7.253 5.106,7.259 6.816 C 7.267 8.786,7.267 8.787,7.325 8.896 C 7.398 9.033,7.538 9.157,7.671 9.204 C 7.803 9.250,8.197 9.250,8.329 9.204 C 8.462 9.157,8.602 9.033,8.675 8.896 C 8.733 8.787,8.733 8.786,8.741 6.816 C 8.749 4.664,8.749 4.662,8.596 4.481 C 8.472 4.333,8.339 4.284,8.040 4.276 C 7.893 4.272,7.743 4.278,7.706 4.290 M7.786 10.530 C 7.597 10.592,7.410 10.753,7.319 10.932 C 7.249 11.072,7.237 11.325,7.294 11.495 C 7.388 11.780,7.697 12.000,8.000 12.000 C 8.303 12.000,8.612 11.780,8.706 11.495 C 8.763 11.325,8.751 11.072,8.681 10.932 C 8.616 10.804,8.460 10.646,8.333 10.580 C 8.217 10.520,7.904 10.491,7.786 10.530'
                    fill='#ea0606'
                    fillRule='evenodd'
                  />
                </svg>
              </div>
              <h1 className='mt-5 text-center text-3xl font-black tracking-tight text-slate-900 sm:text-4xl'>
                Payment not completed
              </h1>
              <p className='mt-2 text-center text-sm text-slate-700 sm:text-base'>
                {FRIENDLY_PAYMENT_FAILURE_MESSAGE}
              </p>
              <p className='mx-auto mt-1 max-w-2xl text-center text-sm text-slate-500'>{resolvedReason}</p>

              <div className='mt-6 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row'>
                <Link
                  href='/checkout/payment'
                  className='inline-flex h-11 items-center justify-center rounded-xl bg-[#111827] px-6 text-sm font-semibold text-white transition hover:bg-[#0b1220]'
                >
                  Retry payment
                </Link>
                <Link
                  href='/cart'
                  className='inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                >
                  Back to cart
                </Link>
              </div>
            </div>

            <div className='border-b border-slate-100 px-5 py-5 lg:hidden'>
              <p className='text-xs font-semibold uppercase tracking-[0.12em] text-slate-500'>Payment Session</p>

              <div className='mt-4 space-y-3'>
                <div className='rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5'>
                  <p className='text-[11px] uppercase tracking-[0.08em] text-slate-500'>Order</p>
                  <p className='mt-1 text-sm font-semibold text-slate-800'>{resolvedOrder || '-'}</p>
                </div>

                <div className='rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5'>
                  <p className='text-[11px] uppercase tracking-[0.08em] text-slate-500'>Reference</p>
                  <p className='mt-1 break-all text-sm font-semibold text-slate-800'>{reference || '-'}</p>
                </div>

                <div className='rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5'>
                  <p className='text-[11px] uppercase tracking-[0.08em] text-rose-600'>Status</p>
                  <p className='mt-1 text-sm font-semibold text-rose-700'>Failed</p>
                </div>
              </div>

              <div className='mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800'>
                Your order has not been charged. Please retry payment to continue checkout.
              </div>

              <Link
                href='/UserBackend/messages'
                className='mt-3 inline-flex items-center text-sm font-semibold text-slate-700 hover:text-slate-900'
              >
                Need help? Contact support
              </Link>
            </div>

            <div className='grid gap-0 md:grid-cols-2'>
              <div className='border-b border-slate-100 px-5 py-5 md:border-b-0 md:border-r md:px-7 md:py-7'>
                <h2 className='text-sm font-semibold uppercase tracking-[0.12em] text-slate-500'>What to do next</h2>
                <div className='mt-4 space-y-3'>
                  <div className='flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5'>
                    <span className='mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white'>1</span>
                    <p className='text-sm text-slate-700'>Retry payment with your selected method.</p>
                  </div>
                  <div className='flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5'>
                    <span className='mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white'>2</span>
                    <p className='text-sm text-slate-700'>If it fails again, switch payment method and continue.</p>
                  </div>
                  <div className='flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5'>
                    <span className='mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white'>3</span>
                    <p className='text-sm text-slate-700'>No completed charge was captured for this failed session.</p>
                  </div>
                </div>
              </div>

              <div className='px-5 py-5 md:px-7 md:py-7'>
                <h2 className='text-sm font-semibold uppercase tracking-[0.12em] text-slate-500'>Accepted payment methods</h2>
                <div className='mt-4 flex flex-wrap gap-2'>
                  {PAYMENT_METHODS.map((method) => (
                    <span
                      key={method.key}
                      className={`inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold tracking-[0.06em] ${paymentMethodClassName(method.key)}`}
                    >
                      {method.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside className='order-2 hidden bg-white px-5 py-5 sm:rounded-3xl sm:border sm:border-slate-200 sm:p-5 sm:shadow-[0_20px_55px_rgba(15,23,42,0.08)] lg:order-2 lg:sticky lg:top-6 lg:block lg:h-fit'>
            <p className='text-xs font-semibold uppercase tracking-[0.12em] text-slate-500'>Payment Session</p>

            <div className='mt-4 space-y-3'>
              <div className='rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5'>
                <p className='text-[11px] uppercase tracking-[0.08em] text-slate-500'>Order</p>
                <p className='mt-1 text-sm font-semibold text-slate-800'>{resolvedOrder || '-'}</p>
              </div>

              <div className='rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5'>
                <p className='text-[11px] uppercase tracking-[0.08em] text-slate-500'>Reference</p>
                <p className='mt-1 break-all text-sm font-semibold text-slate-800'>{reference || '-'}</p>
              </div>

              <div className='rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5'>
                <p className='text-[11px] uppercase tracking-[0.08em] text-rose-600'>Status</p>
                <p className='mt-1 text-sm font-semibold text-rose-700'>Failed</p>
              </div>
            </div>

            <div className='mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800'>
              Your order has not been charged. Please retry payment to continue checkout.
            </div>

            <Link
              href='/UserBackend/messages'
              className='mt-3 inline-flex items-center text-sm font-semibold text-slate-700 hover:text-slate-900'
            >
              Need help? Contact support
            </Link>
          </aside>
        </div>
      </div>
    </div>
  )
}
