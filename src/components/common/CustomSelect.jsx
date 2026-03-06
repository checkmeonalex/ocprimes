'use client'

import { Children, isValidElement, useEffect, useMemo, useRef, useState } from 'react'

const baseTriggerClassName =
  'w-full max-w-full overflow-hidden rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60'

const optionListClassName =
  'absolute z-40 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg'

const optionItemClassName =
  'w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50'

const stringifyValue = (value) => String(value ?? '')

const isScrollableOverflow = (value) =>
  value === 'auto' || value === 'scroll' || value === 'overlay'

const isClippingOverflow = (value) =>
  Boolean(value) && value !== 'visible'

const findScrollBoundaryRect = (element) => {
  if (!element || typeof window === 'undefined') return null
  let current = element.parentElement
  let clippingBoundaryRect = null
  while (current) {
    const style = window.getComputedStyle(current)
    const overflowY = style.overflowY || style.overflow
    if (isScrollableOverflow(overflowY)) {
      return current.getBoundingClientRect()
    }
    if (isClippingOverflow(overflowY) && !clippingBoundaryRect) {
      clippingBoundaryRect = current.getBoundingClientRect()
    }
    current = current.parentElement
  }
  return clippingBoundaryRect
}

const toLabelText = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => toLabelText(entry)).join('')
  }
  if (value === null || value === undefined || value === false) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (isValidElement(value)) {
    return toLabelText(value.props?.children)
  }
  return ''
}

const flattenOptionNodes = (nodes, next = []) => {
  Children.forEach(nodes, (child) => {
    if (!child) return
    if (Array.isArray(child)) {
      flattenOptionNodes(child, next)
      return
    }
    if (!isValidElement(child)) return
    if (String(child.type || '').toLowerCase() === 'option') {
      const rawValue = child.props?.value ?? child.props?.children ?? ''
      const label = toLabelText(child.props?.children)
      next.push({
        value: stringifyValue(rawValue),
        label: label || toLabelText(rawValue),
        disabled: Boolean(child.props?.disabled),
      })
      return
    }
    if (child.props?.children) {
      flattenOptionNodes(child.props.children, next)
    }
  })
  return next
}

export default function CustomSelect({
  value = undefined,
  defaultValue = undefined,
  onChange = undefined,
  children,
  className = '',
  disabled = false,
  name = undefined,
  id = undefined,
  'aria-label': ariaLabel = undefined,
  autoFlip = false,
  searchable = false,
  autoFocusSearch = true,
  searchPlaceholder = 'Search...',
  noResultsText = 'No result found',
  triggerRef = undefined,
  maxMenuHeight = 256,
}) {
  const rootRef = useRef(null)
  const optionListRef = useRef(null)
  const searchInputRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [placement, setPlacement] = useState('bottom')
  const [menuMaxHeight, setMenuMaxHeight] = useState(256)
  const [searchTerm, setSearchTerm] = useState('')
  const options = useMemo(() => flattenOptionNodes(children, []), [children])
  const fallbackOption = useMemo(
    () => options.find((option) => !option.disabled) || options[0] || null,
    [options],
  )
  const isControlled = value !== undefined
  const controlledValue = stringifyValue(value)
  const [internalValue, setInternalValue] = useState(
    stringifyValue(defaultValue) || fallbackOption?.value || '',
  )
  const selectedValue = isControlled ? controlledValue : internalValue
  const selectedOption = options.find((option) => option.value === selectedValue) || fallbackOption
  const normalizedSearch = String(searchTerm || '').trim().toLowerCase()
  const filteredOptions = useMemo(() => {
    if (!searchable || !normalizedSearch) return options
    return options.filter((option) => {
      const optionLabel = String(option.label || '').toLowerCase()
      const optionValue = String(option.value || '').toLowerCase()
      return optionLabel.includes(normalizedSearch) || optionValue.includes(normalizedSearch)
    })
  }, [normalizedSearch, options, searchable])
  const searchHeaderHeight = searchable ? 48 : 0
  const normalizedMaxMenuHeight = Math.max(180, Number(maxMenuHeight) || 256)

  useEffect(() => {
    if (isControlled) return
    if (!selectedOption) return
    if (internalValue) return
    setInternalValue(selectedOption.value)
  }, [fallbackOption?.value, internalValue, isControlled, selectedOption])

  useEffect(() => {
    if (!isOpen || !autoFlip) return undefined

    const viewportPadding = 12
    const gap = 6
    const minPanelHeight = 132
    const estimatedOptionHeight = 36

    const updateMenuPlacement = () => {
      if (!rootRef.current) return
      const triggerRect = rootRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0
      if (!viewportHeight) return
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0
      if (!viewportWidth) return

      const boundaryRect = findScrollBoundaryRect(rootRef.current)
      const boundaryTop = Math.max(
        viewportPadding,
        Math.floor(boundaryRect?.top ?? viewportPadding),
      )
      const boundaryBottom = Math.min(
        viewportHeight - viewportPadding,
        Math.floor(boundaryRect?.bottom ?? viewportHeight - viewportPadding),
      )

      const spaceBelow = Math.max(
        0,
        boundaryBottom - triggerRect.bottom - gap,
      )
      const spaceAbove = Math.max(0, triggerRect.top - boundaryTop - gap)
      const desiredPanelHeight = Math.min(
        normalizedMaxMenuHeight,
        Math.max(minPanelHeight, options.length * estimatedOptionHeight),
      )

      const shouldPlaceTop = spaceBelow < desiredPanelHeight && spaceAbove > spaceBelow
      const nextPlacement = shouldPlaceTop ? 'top' : 'bottom'
      const availableSpace = Math.max(
        shouldPlaceTop ? spaceAbove : spaceBelow,
        minPanelHeight,
      )
      const nextMaxHeight = Math.max(
        108,
        Math.min(normalizedMaxMenuHeight, Math.floor(availableSpace)),
      )

      setPlacement(nextPlacement)
      setMenuMaxHeight(nextMaxHeight)
    }

    updateMenuPlacement()
    const rafId = window.requestAnimationFrame(updateMenuPlacement)
    window.addEventListener('resize', updateMenuPlacement)
    window.addEventListener('scroll', updateMenuPlacement, true)
    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('resize', updateMenuPlacement)
      window.removeEventListener('scroll', updateMenuPlacement, true)
    }
  }, [autoFlip, isOpen, normalizedMaxMenuHeight, options.length])

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('')
      return undefined
    }
    if (!searchable || !autoFocusSearch) return undefined
    const rafId = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus()
    })
    return () => {
      window.cancelAnimationFrame(rafId)
    }
  }, [autoFocusSearch, isOpen, searchable])

  useEffect(() => {
    if (!isOpen) return undefined
    const handlePointerDown = (event) => {
      if (!rootRef.current) return
      if (rootRef.current.contains(event.target)) return
      setIsOpen(false)
    }
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('touchstart', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('touchstart', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const emitChange = (nextValue) => {
    if (!isControlled) setInternalValue(nextValue)
    if (typeof onChange === 'function') {
      onChange({
        target: { value: nextValue, name },
        currentTarget: { value: nextValue, name },
      })
    }
  }

  return (
    <div className='relative w-full min-w-0 max-w-full' ref={rootRef}>
      {name ? <input type='hidden' name={name} value={selectedOption?.value || ''} /> : null}
      <button
        ref={triggerRef}
        type='button'
        id={id}
        aria-label={ariaLabel}
        aria-haspopup='listbox'
        aria-expanded={isOpen}
        disabled={disabled || options.length === 0}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`${baseTriggerClassName} ${className}`.trim()}
      >
        <span className='block truncate pr-6'>{selectedOption?.label || 'Select'}</span>
        <svg
          viewBox='0 0 20 20'
          className={`pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill='none'
          stroke='currentColor'
          strokeWidth='1.8'
        >
          <path d='M6 8l4 4 4-4' strokeLinecap='round' strokeLinejoin='round' />
        </svg>
      </button>

      {isOpen ? (
        <div
          ref={optionListRef}
          className={`${optionListClassName} ${
            autoFlip
              ? placement === 'top'
                ? 'bottom-full mb-1 mt-0'
                : 'top-full mt-1 mb-0'
              : ''
          }`}
          role='listbox'
          style={autoFlip ? { maxHeight: `${menuMaxHeight}px` } : undefined}
        >
          {searchable ? (
            <div className='border-b border-slate-200 bg-white px-2 py-1.5'>
              <div className='relative'>
                <svg
                  className='pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400'
                  viewBox='0 0 20 20'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.8'
                  aria-hidden='true'
                >
                  <circle cx='9' cy='9' r='5.5' />
                  <path d='M13.5 13.5 17 17' strokeLinecap='round' />
                </svg>
                <input
                  ref={searchInputRef}
                  type='text'
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={searchPlaceholder}
                  className='h-8 w-full rounded-md border border-slate-200 bg-slate-50 pl-8 pr-2 text-xs text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-1 focus:ring-slate-300'
                />
              </div>
            </div>
          ) : null}

          <div
            className='custom-select-scrollbar max-h-64 overflow-y-auto py-1'
            style={{
              maxHeight: `${Math.max(
                96,
                (autoFlip ? menuMaxHeight : normalizedMaxMenuHeight) - searchHeaderHeight,
              )}px`,
            }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={`${option.value}-${option.label}`}
                  type='button'
                  role='option'
                  disabled={option.disabled}
                  aria-selected={selectedOption?.value === option.value}
                  className={`${optionItemClassName} ${
                    selectedOption?.value === option.value ? 'bg-slate-100 font-semibold text-slate-900' : ''
                  }`}
                  onClick={() => {
                    if (option.disabled) return
                    emitChange(option.value)
                    setIsOpen(false)
                  }}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <p className='px-3 py-2 text-xs text-slate-500'>{noResultsText}</p>
            )}
          </div>
        </div>
      ) : null}
      <style jsx global>{`
        .custom-select-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(71, 85, 105, 0.82) rgba(148, 163, 184, 0.16);
        }
        .custom-select-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-select-scrollbar::-webkit-scrollbar-track {
          background: rgba(148, 163, 184, 0.14);
          border-radius: 999px;
        }
        .custom-select-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.82);
          border-radius: 999px;
        }
        .custom-select-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(51, 65, 85, 0.92);
        }
      `}</style>
    </div>
  )
}
