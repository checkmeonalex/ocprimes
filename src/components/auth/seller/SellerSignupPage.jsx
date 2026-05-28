'use client'

import { useState } from 'react'
import VendorSignupForm from '@/components/auth/VendorSignupForm'
import SellerSignupShell from './SellerSignupShell'

export default function SellerSignupPage() {
  const [backFn, setBackFn] = useState(null)

  return (
    <SellerSignupShell onBack={backFn}>
      <div className='mt-6 text-center'>
        <div className='flex items-center justify-center gap-1.5 text-sm font-medium text-emerald-700'>
          <svg aria-hidden='true' viewBox='0 0 20 20' fill='none' className='h-4 w-4'>
            <circle cx='10' cy='10' r='8' stroke='currentColor' strokeWidth='1.8' />
            <path
              d='M6.5 10.2 8.8 12.5 13.5 7.8'
              stroke='currentColor'
              strokeWidth='1.8'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
          <span>Secure seller access</span>
        </div>
      </div>

      <VendorSignupForm
        signInHref='/vendor/login'
        variant='seller-clean'
        onBackChange={setBackFn}
      />
    </SellerSignupShell>
  )
}
