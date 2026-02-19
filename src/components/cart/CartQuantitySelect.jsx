'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

const CartQuantitySelect = ({
  quantity,
  onChange,
  isLoading = false,
  maxQuantity = 10,
}) => {
  const [open, setOpen] = useState(false)
  const [panelPlacement, setPanelPlacement] = useState('bottom')
  const [panelMaxHeight, setPanelMaxHeight] = useState(220)
  const rootRef = useRef(null)
  const listRef = useRef(null)
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
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [])

  useEffect(() => {
    if (!open || !rootRef.current) return

    const gap = 6
    const viewportPadding = 12
    const minPanelHeight = 120
    const isMobileViewport = window.matchMedia('(max-width: 640px)').matches
    const estimatedOptionHeight = 36
    const desiredPanelHeight = Math.min(260, Math.max(minPanelHeight, options.length * estimatedOptionHeight))
    const mobileBottomReserve = isMobileViewport ? 96 : 0
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight
    const triggerRect = rootRef.current.getBoundingClientRect()
    const spaceBelow =
      viewportHeight - triggerRect.bottom - viewportPadding - gap - mobileBottomReserve
    const spaceAbove = triggerRect.top - viewportPadding - gap

    const preferTop = spaceBelow < desiredPanelHeight && spaceAbove > spaceBelow
    const nextPlacement = preferTop ? 'top' : 'bottom'
    const availableSpace = Math.max(preferTop ? spaceAbove : spaceBelow, minPanelHeight)

    setPanelPlacement(nextPlacement)
    setPanelMaxHeight(Math.min(260, Math.floor(availableSpace)))

    if (triggerRect.top < viewportPadding || triggerRect.bottom > viewportHeight - viewportPadding) {
      rootRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }

    requestAnimationFrame(() => {
      if (!listRef.current) return
      const selectedOption = listRef.current.querySelector('[aria-selected="true"]')
      if (selectedOption) {
        selectedOption.scrollIntoView({ block: 'nearest' })
      }
    })
  }, [open, selectedQuantity, options.length])

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
          ref={listRef}
          role='listbox'
          className={`absolute left-0 z-20 w-[102px] overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-md ${
            panelPlacement === 'top' ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]'
          }`}
          style={{ maxHeight: `${panelMaxHeight}px` }}
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
