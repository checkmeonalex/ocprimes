'use client'

import Link from 'next/link'

export default function CheckoutReviewPage() {
  return (
    <div className='min-h-screen bg-[#f3f4f6] text-slate-900'>
      <div className='mx-auto w-full max-w-7xl px-4 pb-8 pt-2 sm:px-6'>
        <div className='mx-auto max-w-4xl'>
          <div className='rounded-xl border border-slate-200 bg-white p-6 text-center'>
            <h1 className='text-xl font-semibold text-slate-900'>Review Order</h1>
            <p className='mt-2 text-sm text-slate-600'>
              Review step is ready for integration.
            </p>
            <Link
              href='/checkout/payment'
              className='mt-5 inline-flex rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white'
            >
              Back to Payment
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
