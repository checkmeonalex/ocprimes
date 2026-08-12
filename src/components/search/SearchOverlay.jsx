'use client'

import { useEffect, useRef } from 'react'

// Full-screen search popup shell, matching the main site's mobile search
// overlay (fixed backdrop, back/close button, big rounded input, submit
// button) — reused by vendor storefront headers instead of their old inline
// expanding-input search, so the interaction feels consistent site-wide.
// Deliberately shell-only (no suggestions/popular-searches panel): those are
// backed by a platform-wide, non-vendor-scoped API, so wiring them in here
// would surface results outside the current vendor's store.
export default function SearchOverlay({
  isOpen,
  onClose,
  value,
  onChange,
  onSubmit,
  placeholder = 'Search',
  theme = 'light',
}) {
  const inputRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined
    const raf = requestAnimationFrame(() => inputRef.current?.focus())
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isDark = theme === 'dark'

  const handleSubmit = () => {
    onSubmit?.(value)
  }

  return (
    <div
      className={`fixed inset-0 z-[2147483100] ${isDark ? 'bg-black/70' : 'bg-black/50'}`}
      onClick={onClose}
    >
      <div
        className={isDark ? 'bg-[#0a0a0a]' : 'bg-white'}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`border-b px-4 py-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className='flex items-center gap-3'>
            <button
              type='button'
              onClick={onClose}
              className={`p-1 transition ${isDark ? 'text-white/60 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
              aria-label='Close search'
            >
              <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24' strokeWidth={2}>
                <path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
            <div className='relative flex-1'>
              <input
                ref={inputRef}
                type='text'
                placeholder={placeholder}
                className={`h-12 w-full rounded-xl border-2 pl-4 pr-24 text-base focus:outline-none ${
                  isDark
                    ? 'border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-white'
                    : 'border-gray-900 bg-white text-gray-800 placeholder:text-gray-400 focus:border-black'
                }`}
                value={value}
                onChange={(event) => onChange?.(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleSubmit()
                  }
                }}
              />
              {value?.trim() ? (
                <button
                  type='button'
                  className={`absolute right-12 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition ${
                    isDark ? 'text-white/50 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                  onClick={() => onChange?.('')}
                  aria-label='Clear search'
                >
                  <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24' strokeWidth={2} aria-hidden='true'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M6 6l12 12M18 6 6 18' />
                  </svg>
                </button>
              ) : null}
              <button
                type='button'
                className={`absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full ${
                  isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'
                }`}
                onClick={handleSubmit}
                aria-label='Search'
              >
                <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24' strokeWidth={2}>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
