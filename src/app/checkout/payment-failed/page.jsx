'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const PAYMENT_METHODS = [
  { key: 'credit_card', label: 'Credit Card' },
  { key: 'debit_card', label: 'Debit Card', highlighted: true },
  { key: 'upi', label: 'UPI' },
  { key: 'bank_transfer', label: 'Bank Transfer' },
  { key: 'cash_on_delivery', label: 'Cash on Delivery' },
]

const methodIcon = (key) => {
  if (key === 'credit_card' || key === 'debit_card') {
    return (
      <svg viewBox='0 0 24 24' className='h-4 w-4 text-slate-700' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
        <rect x='2.5' y='5' width='19' height='14' rx='2.5' />
        <path d='M3 9h18' />
      </svg>
    )
  }
  if (key === 'upi') {
    return <span className='text-[10px] font-black tracking-[0.08em] text-slate-600'>UPI</span>
  }
  if (key === 'bank_transfer') {
    return <span className='text-[10px] font-black tracking-[0.08em] text-slate-600'>BANK</span>
  }
  return (
    <svg viewBox='0 0 24 24' className='h-4 w-4 text-slate-700' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
      <path d='M6.5 9h11M6.5 13h7M8.5 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z' />
      <path d='M3 10h3M3 14h3' />
    </svg>
  )
}

export default function CheckoutPaymentFailedPage() {
  const searchParams = useSearchParams()
  const reason = String(searchParams?.get('reason') || '').trim()
  const order = String(searchParams?.get('order') || '').trim()
  const reference = String(searchParams?.get('reference') || '').trim()

  return (
    <div className='min-h-screen bg-[linear-gradient(180deg,#f6f7fb_0%,#eceff6_100%)] px-6 py-10 text-slate-900'>
      <div className='mx-auto w-full max-w-5xl'>
        <div className='grid gap-6 lg:grid-cols-[1.25fr_0.75fr]'>
          <section className='overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.08)]'>
            <div className='bg-[linear-gradient(180deg,#fff3f4_0%,#ffffff_100%)] px-10 py-9'>
              <div className='mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#e11111] shadow-[0_14px_28px_rgba(225,17,17,0.35)]'>
                <svg viewBox='0 0 24 24' className='h-12 w-12 text-white' fill='none' stroke='currentColor' strokeWidth='2.8' aria-hidden='true'>
                  <path d='M7 7l10 10M17 7L7 17' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
              </div>
              <h1 className='mt-6 text-center text-[42px] font-black leading-none tracking-tight text-[#9f0d0d]'>Payment Error</h1>
              <p className='mt-3 text-center text-base text-slate-700'>
                Oops. Network or checkout confirmation failed.
              </p>
              <p className='mt-1 text-center text-sm text-slate-500'>
                {reason || 'Your payment could not be verified in time. Please retry securely.'}
              </p>

              <div className='mt-7 flex items-center justify-center gap-3'>
                <Link
                  href='/checkout/payment'
                  className='inline-flex h-10 items-center justify-center rounded-xl bg-[#e11111] px-5 text-sm font-bold text-white transition hover:bg-[#c90f0f]'
                >
                  Retry payment
                </Link>
                <Link
                  href='/cart'
                  className='inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                >
                  Back to cart
                </Link>
              </div>
            </div>

            <div className='border-t border-slate-100 px-10 py-7'>
              <h2 className='text-sm font-semibold uppercase tracking-[0.12em] text-slate-500'>Try other payment methods</h2>
              <div className='mt-4 space-y-2.5'>
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.key}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 transition ${
                      method.highlighted
                        ? 'border-[#7ba7f3] bg-[#f8fbff]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className='flex items-center gap-3'>
                      <span
                        className={`h-4 w-4 rounded-full border ${
                          method.highlighted ? 'border-[#2e6be4]' : 'border-slate-300'
                        }`}
                        aria-hidden='true'
                      />
                      <span className='text-sm font-medium text-slate-800'>{method.label}</span>
                    </span>
                    {methodIcon(method.key)}
                  </label>
                ))}
              </div>
            </div>
          </section>

          <aside className='rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)]'>
            <p className='text-xs font-semibold uppercase tracking-[0.12em] text-slate-500'>Payment Session</p>
            <div className='mt-4 space-y-2 text-sm text-slate-700'>
              <p>
                <span className='text-slate-500'>Order</span>{' '}
                {order || '-'}
              </p>
              <p className='break-all'>
                <span className='text-slate-500'>Reference</span>{' '}
                {reference || '-'}
              </p>
              <p>
                <span className='text-slate-500'>Status</span>{' '}
                Failed
              </p>
            </div>
            <div className='mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
              Your order was not charged as completed. Retry payment to continue checkout.
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
