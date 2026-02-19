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
          <span className='inline-flex items-center gap-0.5 whitespace-nowrap'>
            <span>{label}</span>
            <svg viewBox='0 0 20 20' className='h-3.5 w-3.5' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M8 5l5 5-5 5' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </span>
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
        <div className='fixed inset-0 z-[80] md:flex md:items-center md:justify-center md:p-4'>
          <button
            type='button'
            onClick={() => setOpen(false)}
            className='absolute inset-0 bg-black/45'
            aria-label='Close order protection details'
          />

          <section className='modal-scroll absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white [animation:order-sheet-up_220ms_ease-out] md:relative md:inset-auto md:max-h-[75vh] md:w-full md:max-w-[520px] md:rounded-none md:border md:border-slate-200 md:[animation:none]'>
            <div className='sticky top-0 z-10 mb-3 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 md:px-6 md:py-4'>
              <h2 className='text-lg font-semibold text-slate-900'>Order Protection Policy</h2>
              <button
                type='button'
                onClick={() => setOpen(false)}
                className='inline-flex items-center justify-center text-2xl font-bold leading-none text-slate-600 transition hover:text-slate-900'
                aria-label='Close'
              >
                <span aria-hidden='true'>×</span>
              </button>
            </div>

            <div className='space-y-4 px-5 pb-5 text-sm text-slate-700 md:px-6 md:pb-6'>
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
          <style jsx>{`
            @keyframes order-sheet-up {
              from {
                transform: translateY(28px);
                opacity: 0.96;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }
            .modal-scroll {
              scrollbar-width: thin;
              scrollbar-color: rgba(148, 163, 184, 0.35) transparent;
            }
            .modal-scroll::-webkit-scrollbar {
              width: 4px;
              height: 4px;
            }
            .modal-scroll::-webkit-scrollbar-track {
              background: transparent;
            }
            .modal-scroll::-webkit-scrollbar-thumb {
              background: rgba(148, 163, 184, 0.35);
              border-radius: 9999px;
            }
          `}</style>
        </div>
      ) : null}
    </>
  )
}

export default OrderProtectionInfoButton
