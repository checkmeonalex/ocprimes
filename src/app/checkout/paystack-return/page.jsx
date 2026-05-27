'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function PaystackReturnPage() {
  const searchParams = useSearchParams()
  const reference = String(searchParams?.get('reference') || searchParams?.get('trxref') || '').trim()

  useEffect(() => {
    if (!reference || typeof window === 'undefined') return

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'paystack:return', reference }, window.location.origin)
      }
    } catch {
      // ignore postMessage errors
    }

    const closeTimerId = setTimeout(() => {
      window.close()
    }, 500)
    const redirectTimerId = setTimeout(() => {
      if (!window.closed) {
        window.location.replace(`/checkout/awaiting-payment?reference=${encodeURIComponent(reference)}`)
      }
    }, 1400)

    return () => {
      clearTimeout(closeTimerId)
      clearTimeout(redirectTimerId)
    }
  }, [reference])

  return (
    <div className='flex min-h-screen items-center justify-center bg-[#f4f6fb] px-4'>
      <div className='w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center'>
        <h1 className='text-lg font-semibold text-slate-900'>Payment update received</h1>
        <p className='mt-2 text-sm text-slate-600'>
          This tab will close automatically. If it does not, you can return to your awaiting payment page.
        </p>
        <div className='mt-4'>
          <Link
            href={reference ? `/checkout/awaiting-payment?reference=${encodeURIComponent(reference)}` : '/checkout/payment'}
            className='inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700'
          >
            Return to payment status
          </Link>
        </div>
      </div>
    </div>
  )
}
