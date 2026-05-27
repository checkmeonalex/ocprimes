'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
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

export const EMPTY_SHIPPING_ADDRESS_DRAFT = {
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

const fieldClassName =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition duration-200 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10'
const countrySelectClassName =
  'w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 shadow-sm outline-none transition duration-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'
const pickerSelectClassName =
  'w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 px-3 pr-10 text-sm text-slate-900 shadow-sm outline-none transition duration-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'

const TOTAL_STEPS = 4
const STEP_COPY = {
  1: {
    title: 'Address basics',
    subtitle: 'Start with your country and street address details.',
  },
  2: {
    title: 'Location details',
    subtitle: 'Choose the state and city for this delivery address.',
  },
  3: {
    title: 'Postal code (Optional)',
    subtitle: 'Add a postal code if available, or skip this step.',
  },
  4: {
    title: 'Contact details',
    subtitle: 'Add a phone number so delivery updates can reach you.',
  },
}

const StepProgress = ({ step }) => (
  <div className='mb-4 grid grid-cols-4 gap-1.5' aria-hidden='true'>
    {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
      <span
        key={`shipping-onboarding-step-${index + 1}`}
        className={`h-1.5 rounded-full ${
          index + 1 <= step ? 'bg-slate-900' : 'bg-slate-200'
        }`}
      />
    ))}
  </div>
)

export default function ShippingAddressOnboardingModal({
  isOpen,
  draft,
  setDraft,
  isSaving = false,
  errorMessage = '',
  onClose,
  onSave,
}) {
  const [isMounted, setIsMounted] = useState(false)
  const [step, setStep] = useState(1)
  const [stepError, setStepError] = useState('')

  const safeDraft = useMemo(
    () => ({ ...EMPTY_SHIPPING_ADDRESS_DRAFT, ...(draft || {}) }),
    [draft],
  )
  const isDraftNigeria = normalizeLookupValue(safeDraft.country) === 'nigeria'
  const cityOptions = useMemo(
    () => (isDraftNigeria ? getNigerianCityOptions(safeDraft.state) : []),
    [isDraftNigeria, safeDraft.state],
  )
  const currentStepCopy = STEP_COPY[step] || STEP_COPY[1]

  useEffect(() => {
    if (!isOpen) return
    setStep(1)
    setStepError('')
  }, [isOpen])

  useEffect(() => {
    setIsMounted(true)
    return () => {
      setIsMounted(false)
    }
  }, [])

  const updateDraft = (key, value) => {
    setDraft((prev) => ({
      ...EMPTY_SHIPPING_ADDRESS_DRAFT,
      ...(prev || {}),
      [key]: value,
    }))
  }

  const updateDraftCountry = (country) => {
    setDraft((prev) => {
      const current = { ...EMPTY_SHIPPING_ADDRESS_DRAFT, ...(prev || {}) }
      const nextCountry = String(country || '')
      if (nextCountry === current.country) return current
      return {
        ...current,
        country: nextCountry || DEFAULT_COUNTRY,
        state: '',
        city: '',
      }
    })
  }

  const updateDraftState = (value) => {
    const resolvedNigerianState = resolveNigerianStateName(value)
    setDraft((prev) => {
      const current = { ...EMPTY_SHIPPING_ADDRESS_DRAFT, ...(prev || {}) }
      const nextState = resolvedNigerianState || String(value || '')
      const shouldSwitchToNigeria = Boolean(resolvedNigerianState)
      const isAlreadyNigeria = normalizeLookupValue(current.country) === 'nigeria'
      return {
        ...current,
        country: shouldSwitchToNigeria
          ? DEFAULT_COUNTRY
          : current.country || DEFAULT_COUNTRY,
        state: nextState,
        city: '',
        ...(isAlreadyNigeria && !nextState ? { city: '' } : {}),
      }
    })
  }

  const validateStep = (stepIndex) => {
    if (stepIndex === 1) {
      if (!String(safeDraft.country || '').trim()) return 'Country is required.'
      if (!String(safeDraft.line1 || '').trim()) return 'Address line is required.'
      return ''
    }
    if (stepIndex === 2) {
      if (!String(safeDraft.state || '').trim()) return 'State is required.'
      if (!String(safeDraft.city || '').trim()) return 'City is required.'
      return ''
    }
    if (stepIndex === 4) {
      if (!String(safeDraft.phone || '').trim()) return 'Phone number is required.'
      return ''
    }
    return ''
  }

  const goNext = () => {
    const message = validateStep(step)
    if (message) {
      setStepError(message)
      return
    }
    setStepError('')
    setStep((prev) => Math.min(TOTAL_STEPS, prev + 1))
  }

  const goBack = () => {
    setStepError('')
    setStep((prev) => Math.max(1, prev - 1))
  }

  const skipPostalStep = () => {
    updateDraft('postalCode', '')
    setStepError('')
    setStep(4)
  }

  const handleSave = () => {
    const firstInvalidStep =
      [1, 2, 4].find((stepIndex) => Boolean(validateStep(stepIndex))) || null
    if (firstInvalidStep) {
      setStep(firstInvalidStep)
      setStepError(validateStep(firstInvalidStep))
      return
    }
    setStepError('')
    onSave?.()
  }

  if (!isOpen || !isMounted) return null

  return createPortal(
    <>
      <div
        className='shipping-onboarding-overlay fixed inset-0 z-[2147483647] flex items-stretch justify-end bg-slate-900/55'
        onClick={(event) => {
          if (event.target === event.currentTarget && !isSaving) onClose?.()
        }}
      >
        <div className='shipping-onboarding-drawer flex h-full w-full max-w-[620px] flex-col overflow-hidden bg-white shadow-2xl sm:border-l sm:border-slate-200'>
        <div className='border-b border-slate-200 px-4 py-4 sm:px-5'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <p className='text-lg font-semibold text-slate-900'>Where are you shipping to?</p>
              <p className='text-xs text-slate-600'>
                Step {step} of {TOTAL_STEPS}
              </p>
            </div>
            <button
              type='button'
              onClick={onClose}
              disabled={isSaving}
              className='inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-60'
              aria-label='Close onboarding modal'
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
          <StepProgress step={step} />
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5'>
          <div className='mb-4'>
            <p className='text-sm font-semibold text-slate-900'>{currentStepCopy.title}</p>
            <p className='mt-0.5 text-xs text-slate-600'>{currentStepCopy.subtitle}</p>
          </div>

          {step === 1 ? (
            <div className='space-y-4'>
              <div>
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
                      <svg
                        viewBox='0 0 24 24'
                        className='h-4 w-4'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='1.8'
                        aria-hidden='true'
                      >
                        <circle cx='12' cy='12' r='9' />
                        <path d='M3 12h18M12 3c2.7 2.3 4.2 5.6 4.2 9S14.7 18.7 12 21c-2.7-2.3-4.2-5.6-4.2-9S9.3 5.3 12 3Z' />
                      </svg>
                    </span>
                  )}
                  <CustomSelect
                    value={safeDraft.country}
                    onChange={(event) => updateDraftCountry(event.target.value)}
                    searchable
                    maxMenuHeight={420}
                    searchPlaceholder='Search country'
                    noResultsText='No country found'
                    className={countrySelectClassName}
                  >
                    <option value=''>Select country</option>
                    {ACCEPTED_COUNTRIES.map((countryName) => (
                      <option key={countryName} value={countryName}>
                        {countryName === 'International' ? 'Worldwide' : countryName}
                      </option>
                    ))}
                  </CustomSelect>
                </div>
              </div>

              <div>
                <label className='text-xs font-medium text-slate-500'>Address label</label>
                <input
                  type='text'
                  value={safeDraft.label}
                  onChange={(event) => updateDraft('label', event.target.value)}
                  className={fieldClassName}
                  placeholder='My home'
                />
              </div>

              <div>
                <label className='text-xs font-medium text-slate-500'>
                  Address line<span className='text-rose-500'>*</span>
                </label>
                <input
                  type='text'
                  value={safeDraft.line1}
                  onChange={(event) => updateDraft('line1', event.target.value)}
                  className={fieldClassName}
                  placeholder='Street address'
                />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className='space-y-4'>
              <div>
                <label className='text-xs font-medium text-slate-500'>
                  State<span className='text-rose-500'>*</span>
                </label>
                {isDraftNigeria ? (
                  <div className='mt-1'>
                    <CustomSelect
                      value={safeDraft.state}
                      onChange={(event) => updateDraftState(event.target.value)}
                      searchable
                      maxMenuHeight={420}
                      autoFocusSearch={false}
                      searchPlaceholder='Search state'
                      noResultsText='No state found'
                      className={pickerSelectClassName}
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
                      updateDraftState(nextValue)
                    }}
                    onSelect={(nextValue) => updateDraftState(nextValue)}
                  />
                )}
              </div>

              <div>
                <label className='text-xs font-medium text-slate-500'>
                  City<span className='text-rose-500'>*</span>
                </label>
                {isDraftNigeria && cityOptions.length > 0 ? (
                  <div className='mt-1'>
                    <CustomSelect
                      value={safeDraft.city}
                      onChange={(event) => updateDraft('city', event.target.value)}
                      searchable
                      maxMenuHeight={420}
                      autoFocusSearch={false}
                      searchPlaceholder='Search city'
                      noResultsText='No city found'
                      className={pickerSelectClassName}
                    >
                      <option value=''>Select city</option>
                      {cityOptions.map((cityName) => (
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
                    disabled={!String(safeDraft.state || '').trim()}
                    placeholder={String(safeDraft.state || '').trim() ? 'City' : 'Select state first'}
                    onType={(nextValue) => updateDraft('city', nextValue)}
                    onSelect={(nextValue) => updateDraft('city', nextValue)}
                  />
                )}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className='space-y-4'>
              <div>
                <label className='text-xs font-medium text-slate-500'>Postal code (optional)</label>
                <input
                  type='text'
                  value={safeDraft.postalCode}
                  onChange={(event) => updateDraft('postalCode', event.target.value)}
                  className={fieldClassName}
                  placeholder='Postal code'
                />
              </div>
              <p className='text-xs text-slate-500'>
                You can skip this and continue.
              </p>
            </div>
          ) : null}

          {step === 4 ? (
            <div className='space-y-4'>
              <div>
                <label className='text-xs font-medium text-slate-500'>
                  Phone number<span className='text-rose-500'>*</span>
                </label>
                <input
                  type='tel'
                  inputMode='tel'
                  value={safeDraft.phone}
                  onChange={(event) => updateDraft('phone', event.target.value)}
                  className={fieldClassName}
                  placeholder='Phone number'
                />
              </div>

              <label className='inline-flex items-center gap-2 text-sm text-slate-700'>
                <input
                  type='checkbox'
                  checked={Boolean(safeDraft.isDefault)}
                  onChange={(event) => updateDraft('isDefault', event.target.checked)}
                  className='h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500'
                />
                Use as default address
              </label>
            </div>
          ) : null}

          {errorMessage || stepError ? (
            <p className='mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700'>
              {errorMessage || stepError}
            </p>
          ) : null}
        </div>

        <div className='border-t border-slate-200 px-4 py-3 sm:px-5'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <button
              type='button'
              onClick={step === 1 ? onClose : goBack}
              disabled={isSaving}
              className='rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60'
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </button>

            <div className='flex items-center gap-2'>
              {step === 3 ? (
                <button
                  type='button'
                  onClick={skipPostalStep}
                  disabled={isSaving}
                  className='rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60'
                >
                  Skip
                </button>
              ) : null}

              {step < TOTAL_STEPS ? (
                <button
                  type='button'
                  onClick={goNext}
                  disabled={isSaving}
                  className='rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70'
                >
                  Next
                </button>
              ) : (
                <button
                  type='button'
                  onClick={handleSave}
                  disabled={isSaving}
                  className='rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70'
                >
                  {isSaving ? 'Saving...' : 'Save address'}
                </button>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shippingOnboardingOverlayIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        @keyframes shippingOnboardingDrawerIn {
          0% {
            opacity: 0.2;
            transform: translateX(112%) scale(0.965);
            filter: blur(2px);
          }
          58% {
            opacity: 1;
            transform: translateX(-1.8%) scale(1.005);
            filter: blur(0);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
            filter: blur(0);
          }
        }

        .shipping-onboarding-overlay {
          animation: shippingOnboardingOverlayIn 240ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .shipping-onboarding-drawer {
          transform-origin: right center;
          will-change: transform, opacity, filter;
          animation: shippingOnboardingDrawerIn 460ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @media (prefers-reduced-motion: reduce) {
          .shipping-onboarding-overlay,
          .shipping-onboarding-drawer {
            animation: none !important;
          }
        }
      `}</style>
    </>,
    document.body,
  )
}
