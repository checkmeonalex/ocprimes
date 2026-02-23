'use client'

import { Children, isValidElement, useEffect, useMemo, useRef, useState } from 'react'

const baseTriggerClassName =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60'

const optionListClassName =
  'absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg'

const optionItemClassName =
  'w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50'

const stringifyValue = (value) => String(value ?? '')

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
}) {
  const rootRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
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

  useEffect(() => {
    if (isControlled) return
    if (!selectedOption) return
    if (internalValue) return
    setInternalValue(selectedOption.value)
  }, [fallbackOption?.value, internalValue, isControlled, selectedOption])

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
    <div className='relative' ref={rootRef}>
      {name ? <input type='hidden' name={name} value={selectedOption?.value || ''} /> : null}
      <button
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
        <div className={optionListClassName} role='listbox'>
          {options.map((option) => (
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
          ))}
        </div>
      ) : null}
    </div>
  )
}
