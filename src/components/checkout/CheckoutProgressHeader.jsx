'use client'

import Link from 'next/link'

const STEPS = [
  { key: 'account', label: 'Cart', number: 1 },
  { key: 'delivery', label: 'Shipping', number: 2 },
  { key: 'payment', label: 'Pay', number: 3 },
  { key: 'review', label: 'Review', number: 4 },
]

const CheckoutProgressHeader = ({ currentStep = 'delivery', backHref = '/cart' }) => {
  const currentIndex = Math.max(
    0,
    STEPS.findIndex((step) => step.key === currentStep),
  )

  return (
    <header className='rounded-xl border border-slate-200 bg-[#f3f4f6] px-3 py-2 sm:px-4'>
      <div className='flex items-center gap-3'>
        <Link
          href={backHref}
          className='inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-[#eef0f2] px-3 py-1.5 text-xs font-medium text-slate-900 transition hover:bg-[#e6e8ea]'
        >
          <svg
            viewBox='0 0 20 20'
            className='h-4 w-4'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            aria-hidden='true'
          >
            <path d='m12.5 4.5-5 5 5 5' strokeLinecap='round' strokeLinejoin='round' />
          </svg>
          Back
        </Link>

        <ol className='flex min-w-0 flex-1 items-center justify-center overflow-x-auto py-1'>
          {STEPS.map((step, index) => {
            const isCompleted = index < currentIndex
            const isCurrent = index === currentIndex
            return (
              <li key={step.key} className='flex items-center'>
                <span className='sr-only'>{step.label}</span>
                <span
                  className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-semibold ${
                    isCompleted
                      ? 'border-white/70 bg-white/45 text-slate-700 backdrop-blur'
                      : isCurrent
                        ? 'border-white/80 bg-white/60 text-slate-900 shadow-[0_0_0_1px_rgba(15,23,42,0.12)] backdrop-blur'
                        : 'border-slate-500/70 bg-white/30 text-slate-700 backdrop-blur'
                  }`}
                >
                  {isCompleted ? (
                    <svg
                      viewBox='0 0 20 20'
                      className='h-2.5 w-2.5'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2.2'
                      aria-hidden='true'
                    >
                      <path d='M5 10.5 8 13.5l7-7' strokeLinecap='round' strokeLinejoin='round' />
                    </svg>
                  ) : (
                    step.number
                  )}
                </span>
                {index < STEPS.length - 1 ? (
                  <span className='mx-1 h-px w-7 bg-slate-500/60 sm:w-10' aria-hidden='true' />
                ) : null}
              </li>
            )
          })}
        </ol>
      </div>
    </header>
  )
}

export default CheckoutProgressHeader
