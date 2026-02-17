'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

const CartSummaryPanel = ({ summary, formatMoney }) => {
  const router = useRouter()
  const [insuranceEnabled, setInsuranceEnabled] = useState(true)

  const amounts = useMemo(() => {
    const shipping = summary.itemCount > 0 ? 10 : 0
    const tax = Math.round(summary.subtotal * 0.1 * 100) / 100
    const insurance = insuranceEnabled && summary.itemCount > 0 ? 15 : 0
    const total = summary.subtotal + shipping + tax + insurance

    return {
      shipping,
      tax,
      insurance,
      total,
    }
  }, [insuranceEnabled, summary.itemCount, summary.subtotal])

  return (
    <div className='space-y-3'>
      <section className='rounded-xl border border-[#b8d4cd] bg-[#edf7f4] p-3'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <p className='text-sm font-semibold text-slate-900'>Shipping Insurance</p>
            <p className='mt-1 text-[11px] leading-4 text-slate-600'>
              Against loss, theft, or damage in transit and instant resolution.
            </p>
            <Link href='/' className='text-[11px] font-semibold text-slate-700 underline'>
              Learn More
            </Link>
          </div>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              role='switch'
              aria-checked={insuranceEnabled}
              onClick={() => setInsuranceEnabled((value) => !value)}
              className={`relative inline-flex h-5 w-10 rounded-full transition ${
                insuranceEnabled ? 'bg-[#0f172a]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  insuranceEnabled ? 'translate-x-5' : 'translate-x-0.5'
                } mt-0.5`}
              />
            </button>
            <span className='text-sm font-semibold text-slate-900'>
              {formatMoney(amounts.insurance || 15)}
            </span>
          </div>
        </div>
      </section>

      <section className='rounded-xl border border-slate-200 bg-white p-4'>
        <h3 className='text-base font-semibold text-slate-900'>Order Summary</h3>

        <div className='mt-3 space-y-2 border-b border-slate-200 pb-3 text-sm'>
          <div className='flex items-center justify-between'>
            <span className='text-slate-600'>Sub Total :</span>
            <span className='font-semibold text-slate-900'>{formatMoney(summary.subtotal)}</span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-slate-600'>Shipping :</span>
            <span className='font-semibold text-slate-900'>{formatMoney(amounts.shipping)}</span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-slate-600'>Tax :</span>
            <span className='font-semibold text-slate-900'>{formatMoney(amounts.tax)}</span>
          </div>
        </div>

        <div className='mt-3 flex items-center justify-between'>
          <span className='text-sm text-slate-600'>Total Payable</span>
          <span className='text-xl font-semibold text-slate-900'>{formatMoney(amounts.total)}</span>
        </div>

        <button
          type='button'
          onClick={() => router.push('/checkout/shipping')}
          disabled={summary.itemCount <= 0}
          className='mt-4 w-full rounded-md bg-[#0f172a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#020617] disabled:cursor-not-allowed disabled:opacity-50'
        >
          Proceed to Secure Checkout
        </button>

        <div className='mt-3 rounded-md border border-slate-200 bg-slate-50 p-2'>
          <div className='flex flex-wrap items-center justify-center gap-2 text-[10px] font-semibold text-slate-500'>
            <span>FDA</span>
            <span>SSL</span>
            <span>VISA</span>
            <span>Razorpay</span>
            <span>PayPal</span>
          </div>
        </div>
      </section>

      <section className='rounded-xl border border-slate-200 bg-white p-4'>
        <h4 className='text-sm font-semibold uppercase tracking-wide text-slate-900'>
          Your Satisfaction Is Guaranteed
        </h4>
        <p className='mt-2 text-xs leading-5 text-slate-600'>
          We&apos;re confident we design and sell the very best Red Light equipment available at an affordable
          price, and we want you to share our confidence. That&apos;s why we back every sale with a 60-day money
          back guarantee.
        </p>
      </section>
    </div>
  )
}

export default CartSummaryPanel
