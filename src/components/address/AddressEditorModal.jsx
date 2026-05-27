'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import CustomSelect from '@/components/common/CustomSelect'
import LocationAutocompleteInput from '@/components/common/LocationAutocompleteInput'
import { ACCEPTED_COUNTRIES } from '@/lib/user/accepted-countries'
import {
  DEFAULT_COUNTRY,
  getNigerianCityOptions,
  NIGERIAN_STATES,
  normalizeLookupValue,
  resolveNigerianStateName,
} from '@/lib/location/nigeria-address'

const inputClassName =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition duration-200 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10'
const countrySelectInputClass =
  'h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 shadow-sm outline-none transition duration-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'
const stateSelectInputClass =
  'h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-900 shadow-sm outline-none transition duration-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'

const emptyAddressDraft = {
  id: '',
  label: '',
  isDefault: false,
  line1: '',
  line2: '',
  phone: '',
  city: '',
  state: '',
  postalCode: '',
  country: DEFAULT_COUNTRY,
}

const isMobileSheetViewport = () =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches

export default function AddressEditorModal({
  isOpen,
  addressType = 'shipping',
  editingId = '',
  draft = emptyAddressDraft,
  setDraft,
  draftLabelSuggestion = 'Eg. My home',
  isSaving = false,
  errorMessage = '',
  onClose,
  onSave,
  overlayTopClassName = 'top-[55px]',
  overlayZIndexClass = 'z-[1000]',
  closeAriaLabel = 'Close editor',
}) {
  const [editorSheetDragY, setEditorSheetDragY] = useState(0)
  const [isEditorSheetDragging, setIsEditorSheetDragging] = useState(false)
  const [shouldAdvanceToCity, setShouldAdvanceToCity] = useState(false)
  const editorSheetStartYRef = useRef(0)
  const editorSheetCurrentYRef = useRef(0)
  const cityFieldRef = useRef(null)
  const citySelectTriggerRef = useRef(null)
  const cityInputRef = useRef(null)

  const safeDraft = useMemo(() => ({ ...emptyAddressDraft, ...(draft || {}) }), [draft])

  const isDraftNigeria = normalizeLookupValue(safeDraft.country) === 'nigeria'
  const draftCityOptions = useMemo(
    () => (isDraftNigeria ? getNigerianCityOptions(safeDraft.state) : []),
    [safeDraft.state, isDraftNigeria],
  )

  const startEditorSheetDrag = (clientY) => {
    if (!isMobileSheetViewport() || !isOpen) return
    setIsEditorSheetDragging(true)
    editorSheetStartYRef.current = clientY
    editorSheetCurrentYRef.current = clientY
  }

  const moveEditorSheetDrag = (clientY) => {
    if (!isEditorSheetDragging) return
    editorSheetCurrentYRef.current = clientY
    const delta = Math.max(0, clientY - editorSheetStartYRef.current)
    setEditorSheetDragY(delta)
  }

  const endEditorSheetDrag = () => {
    if (!isEditorSheetDragging) return
    const delta = Math.max(0, editorSheetCurrentYRef.current - editorSheetStartYRef.current)
    if (delta > 110 || delta < 8) {
      onClose?.()
      return
    }
    setIsEditorSheetDragging(false)
    setEditorSheetDragY(0)
    editorSheetStartYRef.current = 0
    editorSheetCurrentYRef.current = 0
  }

  const handleEditorBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.()
    }
  }

  useEffect(() => {
    if (!isEditorSheetDragging) return undefined
    const handlePointerMove = (event) => {
      if (event.cancelable) event.preventDefault()
      moveEditorSheetDrag(event.clientY)
    }
    const handlePointerEnd = () => {
      endEditorSheetDrag()
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: false })
    window.addEventListener('pointerup', handlePointerEnd)
    window.addEventListener('pointercancel', handlePointerEnd)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerEnd)
      window.removeEventListener('pointercancel', handlePointerEnd)
    }
  }, [isEditorSheetDragging])

  useEffect(() => {
    if (!isOpen) return undefined
    const prevHtmlOverflow = document.documentElement.style.overflow
    const prevBodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow
      document.body.style.overflow = prevBodyOverflow
    }
  }, [isOpen])

  useEffect(() => {
    if (!shouldAdvanceToCity || !isOpen) return undefined

    const rafId = window.requestAnimationFrame(() => {
      cityFieldRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      if (isDraftNigeria && draftCityOptions.length > 0 && citySelectTriggerRef.current) {
        citySelectTriggerRef.current.click()
      }
    })

    setShouldAdvanceToCity(false)
    return () => {
      window.cancelAnimationFrame(rafId)
    }
  }, [draftCityOptions.length, isDraftNigeria, isOpen, shouldAdvanceToCity])

  const updateDraft = (key, value) => {
    setDraft((prev) => ({ ...emptyAddressDraft, ...(prev || {}), [key]: value }))
  }

  const updateDraftCountry = (country) => {
    setDraft((prev) => {
      const current = { ...emptyAddressDraft, ...(prev || {}) }
      const nextCountry = String(country || '')
      if (nextCountry === current.country) return current
      return {
        ...current,
        country: nextCountry,
        state: '',
        city: '',
      }
    })
  }

  const updateDraftState = (state) => {
    const resolvedNigerianState = resolveNigerianStateName(state)
    setDraft((prev) => {
      const current = { ...emptyAddressDraft, ...(prev || {}) }
      const nextState = resolvedNigerianState || String(state || '')
      const shouldSwitchToNigeria = Boolean(resolvedNigerianState)
      const isAlreadyNigeria = normalizeLookupValue(current.country) === 'nigeria'
      if (nextState === current.state && (!shouldSwitchToNigeria || isAlreadyNigeria)) return current
      return {
        ...current,
        country: shouldSwitchToNigeria ? DEFAULT_COUNTRY : current.country,
        state: nextState,
        city: '',
      }
    })
    setShouldAdvanceToCity(true)
  }

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-x-0 bottom-0 ${overlayTopClassName} ${overlayZIndexClass} overscroll-none bg-slate-900/55 backdrop-blur-sm sm:p-4`}
      onClick={handleEditorBackdropClick}
    >
      <div
        className='absolute inset-x-0 bottom-0 flex max-h-[calc(100dvh-4.25rem)] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:static sm:mx-auto sm:max-h-[calc(100vh-6rem)] sm:max-w-2xl sm:rounded-2xl'
        style={{
          transform:
            editorSheetDragY > 0 && isMobileSheetViewport()
              ? `translateY(${editorSheetDragY}px)`
              : undefined,
          transition: isEditorSheetDragging ? 'none' : 'transform 220ms ease',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className='shrink-0 border-b border-slate-200 bg-white px-4 pb-3 pt-2 sm:px-5 sm:pt-4'>
          <button
            type='button'
            className='mx-auto mb-2.5 block h-1.5 w-14 touch-none select-none rounded-full bg-slate-300 sm:hidden'
            aria-label='Drag or tap to close'
            onPointerDown={(event) => {
              startEditorSheetDrag(event.clientY)
            }}
          />
          <div className='flex items-center justify-between gap-3'>
            <h2 className='text-lg font-semibold text-slate-900'>
              {editingId
                ? addressType === 'billing'
                  ? 'Edit billing address'
                  : 'Edit address'
                : addressType === 'billing'
                  ? 'Add billing address'
                  : 'Add new address'}
            </h2>
            <button
              type='button'
              onClick={onClose}
              className='hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition duration-200 hover:bg-slate-50 sm:inline-flex'
              aria-label={closeAriaLabel}
            >
              <svg
                className='h-4 w-4'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                aria-hidden='true'
              >
                <path strokeLinecap='round' strokeLinejoin='round' d='M6 6l12 12M18 6l-12 12' />
              </svg>
            </button>
          </div>
        </div>

        <div className='address-editor-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:overflow-y-scroll sm:px-5 sm:pb-5 sm:pr-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div className='md:col-span-2'>
              <label className='text-xs font-medium text-slate-500'>Country</label>
              <div className='relative mt-1'>
                {isDraftNigeria ? (
                  <span className='pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 inline-flex h-5 w-5 overflow-hidden rounded-sm border border-slate-200'>
                    <span className='h-full w-1/3 bg-[#118647]' />
                    <span className='h-full w-1/3 bg-white' />
                    <span className='h-full w-1/3 bg-[#118647]' />
                  </span>
                ) : (
                  <span className='pointer-events-none absolute left-3 top-1/2 z-10 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center text-slate-500'>
                    <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                      <circle cx='12' cy='12' r='9' />
                      <path d='M3 12h18M12 3c2.7 2.3 4.2 5.6 4.2 9S14.7 18.7 12 21c-2.7-2.3-4.2-5.6-4.2-9S9.3 5.3 12 3Z' />
                    </svg>
                  </span>
                )}
                <CustomSelect
                  value={safeDraft.country}
                  onChange={(event) => updateDraftCountry(event.target.value)}
                  autoFlip
                  searchable
                  searchPlaceholder='Search country'
                  noResultsText='No country found'
                  className={countrySelectInputClass}
                >
                  <option value=''>Select country</option>
                  {ACCEPTED_COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country === 'International' ? 'Worldwide' : country}
                    </option>
                  ))}
                </CustomSelect>
              </div>
            </div>

            <div className='md:col-span-2'>
              <label className='text-xs font-medium text-slate-500'>Address label</label>
              <input
                type='text'
                value={safeDraft.label}
                onChange={(event) => updateDraft('label', event.target.value)}
                className={inputClassName}
                placeholder={draftLabelSuggestion}
              />
            </div>

            <div className='md:col-span-2'>
              <label className='text-xs font-medium text-slate-500'>
                Address line 1<span className='text-rose-500'>*</span>
              </label>
              <input
                type='text'
                value={safeDraft.line1}
                onChange={(event) => updateDraft('line1', event.target.value)}
                className={inputClassName}
                placeholder='Street address'
              />
            </div>

            <div>
              <label className='text-xs font-medium text-slate-500'>
                State<span className='text-rose-500'>*</span>
              </label>
              {isDraftNigeria ? (
                <div className='relative mt-1'>
                  <CustomSelect
                    value={safeDraft.state}
                    onChange={(event) => updateDraftState(event.target.value)}
                    autoFlip
                    searchable
                    autoFocusSearch={false}
                    searchPlaceholder='Search state'
                    noResultsText='No state found'
                    className={stateSelectInputClass}
                  >
                    <option value=''>Select state</option>
                    {NIGERIAN_STATES.map((stateName) => (
                      <option key={stateName} value={stateName}>
                        {stateName}
                      </option>
                    ))}
                  </CustomSelect>
                </div>
              ) : (
                <LocationAutocompleteInput
                  field='state'
                  value={safeDraft.state}
                  country={safeDraft.country}
                  placeholder='State'
                  onType={(nextValue) => {
                    const resolvedNigerianState = resolveNigerianStateName(nextValue)
                    if (resolvedNigerianState) {
                      updateDraftState(resolvedNigerianState)
                      return
                    }
                    setDraft((prev) => ({
                      ...emptyAddressDraft,
                      ...(prev || {}),
                      state: nextValue,
                      city: '',
                    }))
                  }}
                  onSelect={(nextValue) => updateDraftState(nextValue)}
                />
              )}
            </div>

            <div ref={cityFieldRef}>
              <label className='text-xs font-medium text-slate-500'>
                City<span className='text-rose-500'>*</span>
              </label>
              {isDraftNigeria && draftCityOptions.length > 0 ? (
                <div className='relative mt-1'>
                  <CustomSelect
                    triggerRef={citySelectTriggerRef}
                    value={safeDraft.city}
                    onChange={(event) => updateDraft('city', event.target.value)}
                    autoFlip
                    searchable
                    autoFocusSearch={false}
                    searchPlaceholder='Search city'
                    noResultsText='No city found'
                    className={stateSelectInputClass}
                  >
                    <option value=''>Select city</option>
                    {draftCityOptions.map((cityName) => (
                      <option key={cityName} value={cityName}>
                        {cityName}
                      </option>
                    ))}
                  </CustomSelect>
                </div>
              ) : (
                <LocationAutocompleteInput
                  field='city'
                  value={safeDraft.city}
                  country={safeDraft.country}
                  state={safeDraft.state}
                  disabled={isDraftNigeria ? false : !String(safeDraft.state || '').trim()}
                  inputRef={cityInputRef}
                  placeholder={String(safeDraft.state || '').trim() ? 'City' : 'Select state first'}
                  onType={(nextValue) => updateDraft('city', nextValue)}
                  onSelect={(nextValue) => updateDraft('city', nextValue)}
                />
              )}
            </div>

            <div>
              <label className='text-xs font-medium text-slate-500'>Postal code</label>
              <input
                type='text'
                value={safeDraft.postalCode}
                onChange={(event) => updateDraft('postalCode', event.target.value)}
                className={inputClassName}
                placeholder='Postal code'
              />
            </div>

            <div>
              <label className='text-xs font-medium text-slate-500'>
                Phone number<span className='text-rose-500'>*</span>
              </label>
              <input
                type='tel'
                inputMode='tel'
                value={safeDraft.phone}
                onChange={(event) => updateDraft('phone', event.target.value)}
                className={inputClassName}
                placeholder='Phone number'
              />
            </div>

            <label className='hidden md:col-span-2 sm:inline-flex items-center gap-2 text-sm text-slate-700'>
              <input
                type='checkbox'
                checked={Boolean(safeDraft.isDefault)}
                onChange={(event) => updateDraft('isDefault', event.target.checked)}
                className='h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500'
              />
              Use as default address
            </label>
          </div>
        </div>

        <div className='shrink-0 border-t border-slate-200 bg-white px-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-3 sm:px-5'>
          {errorMessage ? (
            <p className='mb-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700'>
              {errorMessage}
            </p>
          ) : null}
          <div className='flex flex-wrap items-center justify-between gap-2 sm:justify-end'>
            <label className='inline-flex items-center gap-2 text-sm font-medium text-slate-700 sm:hidden'>
              <input
                type='checkbox'
                checked={Boolean(safeDraft.isDefault)}
                onChange={(event) => updateDraft('isDefault', event.target.checked)}
                className='h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500'
              />
              Set as default
            </label>
            <button
              type='button'
              onClick={onClose}
              disabled={isSaving}
              className='hidden rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition duration-200 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex'
            >
              Cancel
            </button>
            <button
              type='button'
              onClick={onSave}
              disabled={isSaving}
              className='inline-flex min-w-[8.5rem] items-center justify-center rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70'
            >
              {isSaving ? (
                <span className='inline-flex items-center gap-2'>
                  <span>Saving</span>
                  <span className='inline-flex items-center gap-1' aria-hidden='true'>
                    <span className='save-dot save-dot-1' />
                    <span className='save-dot save-dot-2' />
                    <span className='save-dot save-dot-3' />
                  </span>
                </span>
              ) : editingId
                ? addressType === 'billing'
                  ? 'Update billing address'
                  : 'Update address'
                : addressType === 'billing'
                  ? 'Save billing address'
                  : 'Save address'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .save-dot {
          height: 5px;
          width: 5px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.95);
          opacity: 0.25;
          animation: saveDotPulse 1.05s ease-in-out infinite;
        }
        .save-dot-2 {
          animation-delay: 0.18s;
        }
        .save-dot-3 {
          animation-delay: 0.36s;
        }
        @keyframes saveDotPulse {
          0%,
          80%,
          100% {
            opacity: 0.25;
            transform: translateY(0);
          }
          40% {
            opacity: 1;
            transform: translateY(-1px);
          }
        }
        @media (min-width: 640px) {
          .address-editor-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(71, 85, 105, 0.88) rgba(148, 163, 184, 0.2);
            scrollbar-gutter: stable both-edges;
          }
          .address-editor-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .address-editor-scrollbar::-webkit-scrollbar-track {
            background: rgba(148, 163, 184, 0.2);
            border-radius: 9999px;
          }
          .address-editor-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(71, 85, 105, 0.88);
            border-radius: 9999px;
          }
          .address-editor-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(30, 41, 59, 0.95);
          }
        }
      `}</style>
    </div>
  )
}
