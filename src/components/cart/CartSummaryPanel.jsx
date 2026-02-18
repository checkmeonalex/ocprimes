'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import OrderProtectionInfoButton from '@/components/cart/OrderProtectionInfoButton'

const CartSummaryPanel = ({ summary, formatMoney, setAllProtection }) => {
  const router = useRouter()

  const amounts = useMemo(() => {
    const shipping = 0
    const tax = Math.round(summary.subtotal * 0.1 * 100) / 100
    const protection = Number(summary.protectionFee || 0)
    const total = summary.subtotal + shipping + tax + protection

    return {
      shipping,
      tax,
      protection,
      total,
    }
  }, [summary.itemCount, summary.protectionFee, summary.subtotal])

  return (
    <div className='space-y-3'>
      <section className='rounded-xl border border-[#b8d4cd] bg-[#edf7f4] p-3'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <p className='flex items-center gap-1 text-sm font-semibold text-slate-900'>
              Order Protection
              <OrderProtectionInfoButton className='text-slate-500 hover:text-slate-700' />
            </p>
            <p className='mt-1 text-[11px] leading-5 text-slate-600'>
              Protect selected items against damage, defects, or items not as described. Claim
              requests are reviewed within the policy window.
            </p>
            <button type='button' className='mt-1 text-[11px] font-semibold text-slate-700'>
              Learn more
              <span className='ml-1' aria-hidden='true'>
                ›
              </span>
            </button>
          </div>
          <span className='text-sm font-semibold text-slate-900'>
            {amounts.protection > 0 ? formatMoney(amounts.protection) : formatMoney(0)}
          </span>
        </div>
        <div className='mt-2 flex items-center justify-between gap-3'>
          <span className='text-[11px] text-slate-600'>Protect all eligible items</span>
          <button
            type='button'
            role='switch'
            aria-checked={Boolean(summary.protectionBulkEnabled)}
            disabled={Number(summary.protectedEligibleLineCount || 0) <= 0}
            onClick={() => setAllProtection(!summary.protectionBulkEnabled)}
            className={`relative inline-flex h-5 w-10 rounded-full transition ${
              summary.protectionBulkEnabled ? 'bg-[#0f172a]' : 'bg-slate-300'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <span
              className={`mt-0.5 inline-block h-4 w-4 rounded-full bg-white transition ${
                summary.protectionBulkEnabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
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
            <span className='font-semibold text-slate-500'>Calculated at checkout</span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-slate-600'>Tax :</span>
            <span className='font-semibold text-slate-900'>{formatMoney(amounts.tax)}</span>
          </div>
          {amounts.protection > 0 ? (
            <div className='flex items-center justify-between'>
              <span className='text-slate-600'>Order Protection :</span>
              <span className='font-semibold text-slate-900'>{formatMoney(amounts.protection)}</span>
            </div>
          ) : null}
        </div>

        <div className='mt-3 flex items-center justify-between'>
          <span className='text-sm text-slate-600'>Estimated Total Payable</span>
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

      </section>

      <section className='rounded-xl border border-slate-200 bg-white p-4'>
        <p className='text-lg font-semibold text-slate-900'>We Accept</p>
        <div className='mt-3 flex flex-wrap items-center gap-3'>
          <span className='text-2xl font-extrabold tracking-tight text-[#1A1F71]'>VISA</span>
          <svg
            viewBox='0 -222 2000 2000'
            className='h-10 w-16'
            xmlns='http://www.w3.org/2000/svg'
            aria-label='Mastercard'
            role='img'
          >
            <path fill='#ff5f00' d='M1270.57 1104.15H729.71v-972h540.87Z' />
            <path
              fill='#eb001b'
              d='M764 618.17c0-197.17 92.32-372.81 236.08-486A615.46 615.46 0 0 0 618.09 0C276.72 0 0 276.76 0 618.17s276.72 618.17 618.09 618.17a615.46 615.46 0 0 0 382-132.17C856.34 991 764 815.35 764 618.17'
            />
            <path
              fill='#f79e1b'
              d='M2000.25 618.17c0 341.41-276.72 618.17-618.09 618.17a615.65 615.65 0 0 1-382.05-132.17c143.8-113.19 236.12-288.82 236.12-486s-92.32-372.81-236.12-486A615.65 615.65 0 0 1 1382.15 0c341.37 0 618.09 276.76 618.09 618.17'
            />
          </svg>
          <span className='rounded bg-[#2E77BC] px-2.5 py-1.5 text-xs font-bold text-white'>AMEX</span>
          <span className='rounded bg-[#0b1d4d] px-2.5 py-1.5 text-xs font-bold text-white'>VERVE</span>
          <span className='inline-flex h-8 items-center justify-center rounded border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700'>
            BANK
          </span>
          <span className='inline-flex h-8 items-center justify-center rounded border border-emerald-300 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-700'>
            *737#
          </span>
          <span className='inline-flex h-8 items-center justify-center rounded border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700'>
            BANK TRANSFER
          </span>
        </div>
      </section>

    </div>
  )
}

export default CartSummaryPanel
