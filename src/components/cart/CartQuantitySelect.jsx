'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

const CartQuantitySelect = ({
  quantity,
  onChange,
  isLoading = false,
  maxQuantity = 10,
}) => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const safeMax = Math.max(1, Math.min(99, Number(maxQuantity) || 10))
  const selectedQuantity = Math.max(0, Number(quantity) || 0)

  const options = useMemo(
    () => Array.from({ length: Math.max(safeMax, selectedQuantity) + 1 }, (_, index) => index),
    [safeMax, selectedQuantity],
  )

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [])

  return (
    <div ref={rootRef} className='relative inline-flex'>
      <button
        type='button'
        disabled={isLoading}
        aria-haspopup='listbox'
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className='inline-flex h-8 min-w-[96px] items-center justify-between rounded-full border border-slate-700 bg-white px-3 font-medium text-slate-800 disabled:cursor-not-allowed disabled:opacity-70'
      >
        <span className='text-sm'>{`Qty ${selectedQuantity}`}</span>
        <svg
          viewBox='0 0 20 20'
          className={`h-4 w-4 text-slate-700 transition-transform ${open ? 'rotate-180' : ''}`}
          fill='none'
          stroke='currentColor'
          strokeWidth='1.8'
          aria-hidden='true'
        >
          <path d='M6 8l4 4 4-4' strokeLinecap='round' strokeLinejoin='round' />
        </svg>
      </button>

      {open ? (
        <div
          role='listbox'
          className='absolute left-0 top-[calc(100%+6px)] z-20 w-[102px] rounded-md border border-slate-200 bg-white py-1 shadow-md'
        >
          {options.map((value) => (
            <button
              key={value}
              type='button'
              role='option'
              aria-selected={value === selectedQuantity}
              onClick={() => {
                setOpen(false)
                onChange(value)
              }}
              className='flex w-full items-center justify-between px-4 py-2 text-left text-base text-slate-800 hover:bg-slate-100'
            >
              <span>{value}</span>
              {value === selectedQuantity ? (
                <svg
                  viewBox='0 0 20 20'
                  className='h-4 w-4 text-slate-800'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  aria-hidden='true'
                >
                  <path d='M4.5 10.5l3.2 3.2 7.8-7.8' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default CartQuantitySelect
