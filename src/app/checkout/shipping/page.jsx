import { Suspense } from 'react'

import ShippingDetailsPage from '@/components/checkout/ShippingDetailsPage'

function ShippingPageFallback() {
  return (
    <div className='min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8'>
      <div className='mx-auto w-full max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500'>
        Loading shipping details...
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
