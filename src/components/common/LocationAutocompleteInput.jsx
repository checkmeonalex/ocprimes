'use client'

import { useEffect, useRef, useState } from 'react'

const inputClassName =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition duration-200 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400'

export default function LocationAutocompleteInput({
  field = 'state',
  value = '',
  country = '',
  state = '',
  placeholder = '',
  onType = undefined,
  onSelect = undefined,
  disabled = false,
  inputRef = undefined,
}) {
  const rootRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])

  const normalizedValue = String(value || '').trim()
  const normalizedState = String(state || '').trim()
  const canSearch =
    !disabled &&
    normalizedValue.length >= 2 &&
    (field === 'state' || normalizedState.length > 0)

  useEffect(() => {
    if (!isOpen) return undefined
    const handlePointerDown = (event) => {
      if (!rootRef.current) return
      if (rootRef.current.contains(event.target)) return
      setIsOpen(false)
    }
    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('touchstart', handlePointerDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('touchstart', handlePointerDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !canSearch) {
      setIsLoading(false)
      setSuggestions([])
      return undefined
    }

    const abortController = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          field,
          q: normalizedValue,
          country: String(country || ''),
          state: String(state || ''),
          limit: '5',
        })
        const response = await fetch(
          `/api/location/openstreet/suggest?${params.toString()}`,
          { signal: abortController.signal },
        )
        const payload = await response.json().catch(() => ({ suggestions: [] }))
        const next = Array.isArray(payload?.suggestions) ? payload.suggestions : []
        setSuggestions(next)
      } catch {
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, 650)

    return () => {
      clearTimeout(timeoutId)
      abortController.abort()
    }
  }, [canSearch, country, field, isOpen, normalizedValue, state])

  return (
    <div className='relative' ref={rootRef}>
      <input
        ref={inputRef}
        type='text'
        value={value}
        disabled={disabled}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          onType?.(event.target.value)
          setIsOpen(true)
        }}
        className={inputClassName}
        placeholder={placeholder}
      />

      {isOpen ? (
        <div className='absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg'>
          <div className='custom-select-scrollbar max-h-56 overflow-y-auto py-1'>
            {isLoading ? (
              <p className='px-3 py-2 text-xs text-slate-500'>Loading suggestions...</p>
            ) : suggestions.length > 0 ? (
              suggestions.map((entry) => (
                <button
                  key={entry}
                  type='button'
                  className='w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100'
                  onClick={() => {
                    onSelect?.(entry)
                    setIsOpen(false)
                  }}
                >
                  {entry}
                </button>
              ))
            ) : canSearch ? (
              <p className='px-3 py-2 text-xs text-slate-500'>No suggestion found.</p>
            ) : (
              <p className='px-3 py-2 text-xs text-slate-500'>
                {field === 'city'
                  ? 'Select state and type at least 2 letters.'
                  : 'Type at least 2 letters.'}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
