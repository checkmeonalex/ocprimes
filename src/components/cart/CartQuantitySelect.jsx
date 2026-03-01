'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const CartQuantitySelect = ({
  quantity,
  onChange,
  isLoading = false,
  maxQuantity = 10,
  size = 'sm',
  preferTop = false,
}) => {
  const [open, setOpen] = useState(false)
  const [panelMaxHeight, setPanelMaxHeight] = useState(220)
  const [panelStyle, setPanelStyle] = useState({ left: 0, top: 0, width: 0 })
  const rootRef = useRef(null)
  const panelRef = useRef(null)
  const listRef = useRef(null)
  const safeMax = Math.max(1, Math.min(99, Number(maxQuantity) || 10))
  const selectedQuantity = Math.max(0, Number(quantity) || 0)

  const options = useMemo(
    () => Array.from({ length: Math.max(safeMax, selectedQuantity) + 1 }, (_, index) => index),
    [safeMax, selectedQuantity],
  )
  const sizePreset =
    size === 'md'
      ? {
          trigger: 'h-11 min-w-[124px] px-4',
          label: 'text-base',
          listItem: 'px-4 py-2.5 text-sm',
        }
      : {
          trigger: 'h-8 min-w-[96px] px-3',
          label: 'text-sm',
          listItem: 'px-4 py-2 text-base',
        }

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current) return
      const clickedInsideTrigger = rootRef.current.contains(event.target)
      const clickedInsidePanel =
        panelRef.current && panelRef.current.contains(event.target)
      if (!clickedInsideTrigger && !clickedInsidePanel) {
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

    const updatePanelPosition = () => {
      if (!rootRef.current) return
      const gap = 6
      const viewportPadding = 12
      const minPanelHeight = 120
      const isMobileViewport = window.matchMedia('(max-width: 640px)').matches
      const estimatedOptionHeight = 36
      const desiredPanelHeight = Math.min(
        260,
        Math.max(minPanelHeight, options.length * estimatedOptionHeight),
      )
      const mobileBottomReserve = isMobileViewport ? 96 : 0
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth
      const triggerRect = rootRef.current.getBoundingClientRect()
      const spaceBelow =
        viewportHeight - triggerRect.bottom - viewportPadding - gap - mobileBottomReserve
      const spaceAbove = triggerRect.top - viewportPadding - gap

      const shouldPlaceTop =
        preferTop || (spaceBelow < desiredPanelHeight && spaceAbove > spaceBelow)
      const nextPlacement = shouldPlaceTop ? 'top' : 'bottom'
      const availableSpace = Math.max(
        shouldPlaceTop ? spaceAbove : spaceBelow,
        minPanelHeight,
      )
      const maxAllowedHeight = size === 'md' ? 240 : 260
      const resolvedHeight = Math.min(maxAllowedHeight, Math.floor(availableSpace))
      const desiredWidth = Math.max(102, Math.round(triggerRect.width))
      const maxLeft = Math.max(viewportPadding, viewportWidth - desiredWidth - viewportPadding)
      const left = Math.min(
        maxLeft,
        Math.max(viewportPadding, Math.round(triggerRect.left)),
      )
      const top = nextPlacement === 'top'
        ? Math.max(viewportPadding, Math.round(triggerRect.top - resolvedHeight - gap))
        : Math.min(
            Math.max(viewportPadding, viewportHeight - viewportPadding - minPanelHeight),
            Math.round(triggerRect.bottom + gap),
          )

      setPanelMaxHeight(resolvedHeight)
      setPanelStyle({ left, top, width: desiredWidth })

      if (
        triggerRect.top < viewportPadding ||
        triggerRect.bottom > viewportHeight - viewportPadding
      ) {
        rootRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      }
    }

    updatePanelPosition()
    window.addEventListener('resize', updatePanelPosition, { passive: true })
    window.addEventListener('scroll', updatePanelPosition, true)

    const rafId = window.requestAnimationFrame(() => {
      if (!listRef.current) return
      const selectedOption = listRef.current.querySelector('[aria-selected="true"]')
      if (selectedOption) {
        selectedOption.scrollIntoView({ block: 'nearest' })
      }
    })

    return () => {
      window.removeEventListener('resize', updatePanelPosition)
      window.removeEventListener('scroll', updatePanelPosition, true)
      window.cancelAnimationFrame(rafId)
    }
  }, [open, selectedQuantity, options.length, preferTop, size])

  return (
    <div ref={rootRef} className='relative inline-flex z-[1]'>
      <button
        type='button'
        disabled={isLoading}
        aria-haspopup='listbox'
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center justify-between rounded-full border border-slate-700 bg-white font-medium text-slate-800 disabled:cursor-not-allowed disabled:opacity-70 ${sizePreset.trigger}`}
      >
        <span className={sizePreset.label}>{`Qty ${selectedQuantity}`}</span>
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

      {open && typeof document !== 'undefined'
        ? createPortal(
        <div
          ref={(node) => {
            panelRef.current = node
            listRef.current = node
          }}
          role='listbox'
          className='quantity-select-scroll fixed z-[100000] min-w-[102px] overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-md'
          style={{
            left: `${panelStyle.left}px`,
            top: `${panelStyle.top}px`,
            width: `${panelStyle.width}px`,
            maxHeight: `${panelMaxHeight}px`,
          }}
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
              className={`flex w-full items-center justify-between text-left text-slate-800 hover:bg-slate-100 ${sizePreset.listItem}`}
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
        , document.body)
        : null}
    </div>
  )
}

export default CartQuantitySelect
