import { Suspense } from 'react'

import ShippingDetailsPage from '@/components/checkout/ShippingDetailsPage'

function ShippingPageFallback() {
  return (
    <div className='min-h-screen bg-white px-4 py-4 sm:px-6 sm:py-6'>
      <div className='mx-auto w-full max-w-7xl space-y-4'>
        <div className='h-10 w-48 animate-pulse rounded-md bg-slate-200' />
        <div className='grid gap-4 lg:grid-cols-2'>
          <div className='space-y-3 rounded-xl border border-slate-200 bg-white p-4'>
            <div className='h-6 w-56 animate-pulse rounded bg-slate-200' />
            <div className='h-4 w-72 animate-pulse rounded bg-slate-100' />
            <div className='h-24 animate-pulse rounded-lg bg-slate-100' />
            <div className='h-24 animate-pulse rounded-lg bg-slate-100' />
            <div className='h-12 animate-pulse rounded-full bg-slate-200' />
          </div>
          <div className='space-y-3 rounded-xl border border-slate-200 bg-white p-4'>
            <div className='h-6 w-40 animate-pulse rounded bg-slate-200' />
            <div className='h-16 animate-pulse rounded-lg bg-slate-100' />
            <div className='h-16 animate-pulse rounded-lg bg-slate-100' />
            <div className='h-20 animate-pulse rounded-lg bg-slate-100' />
            <div className='h-28 animate-pulse rounded-lg bg-slate-100' />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutShippingPage() {
  return (
    <Suspense fallback={<ShippingPageFallback />}>
      <ShippingDetailsPage />
    </Suspense>
  )
}
