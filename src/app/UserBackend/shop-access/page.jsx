'use client'

import { useState } from 'react'

export default function ShopAccessPage() {
  const [isRequesting, setIsRequesting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleRequestAccess = async () => {
    if (isRequesting) return
    setIsRequesting(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/auth/request-admin', { method: 'POST' })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to submit access request.')
      }
      setMessage('Access request submitted. We will review and get back to you.')
    } catch (err) {
      setError(err?.message || 'Unable to submit access request.')
    } finally {
      setIsRequesting(false)
    }
  }

  return (
    <div className='mx-auto w-full max-w-2xl'>
      <section className='rounded-2xl border border-slate-200 bg-white p-5 sm:p-6'>
        <h1 className='text-xl font-semibold text-slate-900'>Shop Access</h1>
        <p className='mt-2 text-sm leading-6 text-slate-600'>
          Shop management is available to approved vendor and admin accounts. Request access to
          start managing products and storefront tools.
        </p>

        <div className='mt-5 grid gap-3 sm:grid-cols-2'>
          <div className='rounded-xl border border-slate-200 bg-slate-50 px-4 py-3'>
            <p className='text-sm font-semibold text-slate-900'>Vendor</p>
            <p className='mt-1 text-xs text-slate-600'>Sell and manage your own catalog.</p>
          </div>
          <div className='rounded-xl border border-slate-200 bg-slate-50 px-4 py-3'>
            <p className='text-sm font-semibold text-slate-900'>Admin</p>
            <p className='mt-1 text-xs text-slate-600'>Manage platform-wide inventory and settings.</p>
          </div>
        </div>

        {error ? (
          <div className='mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700'>
            {error}
          </div>
        ) : null}
        {message ? (
          <div className='mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700'>
            {message}
          </div>
        ) : null}

        <button
          type='button'
          onClick={handleRequestAccess}
          disabled={isRequesting}
          className='mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
        >
          {isRequesting ? 'Submitting...' : 'Request shop access'}
        </button>
      </section>
    </div>
  )
}
