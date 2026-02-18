'use client'

import { useEffect, useState } from 'react'

const OrderProtectionInfoButton = ({ className = '', label = '' }) => {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const onEsc = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [open])

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className={className || 'text-slate-500 hover:text-slate-700'}
        aria-label='Order protection details'
      >
        {label ? (
          <span>{label}</span>
        ) : (
          <svg
            viewBox='0 0 20 20'
            className='h-4 w-4'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.8'
            aria-hidden='true'
          >
            <circle cx='10' cy='10' r='7.25' />
            <path d='M10 8v5' strokeLinecap='round' />
            <circle cx='10' cy='6' r='0.7' fill='currentColor' stroke='none' />
          </svg>
        )}
      </button>

      {open ? (
        <div className='fixed inset-0 z-[80]'>
          <button
            type='button'
            onClick={() => setOpen(false)}
            className='absolute inset-0 bg-black/45'
            aria-label='Close order protection details'
          />

          <section className='absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5 sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[min(92vw,620px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl'>
            <div className='mb-3 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>Order Protection Policy</h2>
              <button
                type='button'
                onClick={() => setOpen(false)}
                className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500'
                aria-label='Close'
              >
                <span aria-hidden='true'>×</span>
              </button>
            </div>

            <div className='space-y-4 text-sm text-slate-700'>
              <div>
                <h3 className='font-semibold text-slate-900'>What&apos;s Covered</h3>
                <ul className='mt-1 list-disc space-y-1 pl-5'>
                  <li>Item arrives damaged</li>
                  <li>Item is defective</li>
                  <li>Item significantly differs from description</li>
                </ul>
              </div>

              <div>
                <h3 className='font-semibold text-slate-900'>What&apos;s Not Covered</h3>
                <ul className='mt-1 list-disc space-y-1 pl-5'>
                  <li>Change of mind</li>
                  <li>Wrong size selected by buyer</li>
                  <li>Minor cosmetic issues</li>
                  <li>Normal wear and tear</li>
                </ul>
              </div>

              <div>
                <h3 className='font-semibold text-slate-900'>Claim Rules</h3>
                <ul className='mt-1 list-disc space-y-1 pl-5'>
                  <li>Submit claim within 48 hours of delivery</li>
                  <li>Upload photo/video evidence</li>
                  <li>OCPRIMES reviews each claim before approval</li>
                </ul>
              </div>

              <p className='rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs'>
                Order Protection overrides no-return policy only for covered issues.
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}

export default OrderProtectionInfoButton
