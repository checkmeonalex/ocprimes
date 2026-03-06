'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminSidebar from '@/components/AdminSidebar'
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader'
import CustomSelect from '@/components/common/CustomSelect'
import PickupLocationsEditor from '@/components/admin/logistics/PickupLocationsEditor'
import { DEFAULT_WORLDWIDE_ETA_KEY } from '@/lib/logistics/worldwide'

const DEFAULT_STATE = 'Lagos'

const formatCurrency = (value) => {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount)) return '₦0'
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `₦${Math.round(amount)}`
  }
}

const LogisticsSkeleton = () => (
  <div className='space-y-2'>
    {Array.from({ length: 10 }).map((_, index) => (
      <div
        key={`logistics-skeleton-${index}`}
        className='grid grid-cols-[1.15fr_0.55fr_0.75fr_0.55fr_0.75fr] gap-2 rounded-xl border border-slate-200 bg-white p-3'
      >
        <span className='h-4 animate-pulse rounded bg-slate-200/85' />
        <span className='h-10 animate-pulse rounded-xl bg-slate-200/80' />
        <span className='h-10 animate-pulse rounded-xl bg-slate-200/80' />
        <span className='h-10 animate-pulse rounded-xl bg-slate-200/80' />
        <span className='h-10 animate-pulse rounded-xl bg-slate-200/80' />
      </div>
    ))}
  </div>
)

export default function LogisticsPage() {
  const [scope, setScope] = useState('nigeria')
  const [states, setStates] = useState([])
  const [selectedState, setSelectedState] = useState(DEFAULT_STATE)
  const [rates, setRates] = useState([])
  const [etaPresets, setEtaPresets] = useState([])
  const [worldwideSettings, setWorldwideSettings] = useState({
    fixedPriceUsd: 15,
    etaKey: DEFAULT_WORLDWIDE_ETA_KEY,
  })
  const [pickupLocations, setPickupLocations] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadStateRates = async (stateName) => {
    const targetState = String(stateName || '').trim() || DEFAULT_STATE
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch(
        `/api/admin/logistics-settings?state=${encodeURIComponent(targetState)}`,
        {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        },
      )
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to load logistics settings.')
      }
      const nextStates = Array.isArray(payload?.states) ? payload.states : []
      const nextSelectedState = String(payload?.state || targetState || DEFAULT_STATE).trim()
      const nextRates = Array.isArray(payload?.rates) ? payload.rates : []
      const nextEtaPresets = Array.isArray(payload?.etaPresets) ? payload.etaPresets : []
      const nextWorldwideSettings =
        payload?.worldwideSettings && typeof payload.worldwideSettings === 'object'
          ? payload.worldwideSettings
          : { fixedPriceUsd: 15, etaKey: DEFAULT_WORLDWIDE_ETA_KEY }
      const nextPickupLocations = Array.isArray(payload?.pickupLocations)
        ? payload.pickupLocations
        : []

      setStates(nextStates)
      setSelectedState(nextSelectedState)
      setRates(nextRates)
      setEtaPresets(nextEtaPresets)
      setWorldwideSettings({
        fixedPriceUsd: Number(nextWorldwideSettings?.fixedPriceUsd || 0),
        etaKey: String(nextWorldwideSettings?.etaKey || DEFAULT_WORLDWIDE_ETA_KEY),
      })
      setPickupLocations(nextPickupLocations)
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load logistics settings.')
      setRates([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadStateRates(DEFAULT_STATE)
  }, [])

  const filteredRates = useMemo(() => {
    const query = String(searchTerm || '').trim().toLowerCase()
    if (!query) return rates
    return rates.filter((entry) => String(entry.city || '').toLowerCase().includes(query))
  }, [rates, searchTerm])

  const handleRateChange = (city, field, value) => {
    setSuccess('')
    setRates((prev) =>
      prev.map((entry) => {
        if (entry.city !== city) return entry
        if (field === 'standardPrice' || field === 'expressPrice') {
          const numeric = Number(value)
          return {
            ...entry,
            [field]: Number.isFinite(numeric) && numeric >= 0 ? numeric : 0,
          }
        }
        if (field === 'standardEtaKey' || field === 'expressEtaKey') {
          const nextKey = String(value || '').trim()
          const matched = etaPresets.find((preset) => preset.key === nextKey)
          return {
            ...entry,
            [field]: nextKey,
            ...(field === 'standardEtaKey'
              ? {
                  standardEtaHours: Number(matched?.etaHours || entry.standardEtaHours || 48),
                  standardCheckoutEstimate: String(
                    matched?.checkoutEstimate || entry.standardCheckoutEstimate || '',
                  ),
                }
              : {
                  expressEtaHours: Number(matched?.etaHours || entry.expressEtaHours || 12),
                  expressCheckoutEstimate: String(
                    matched?.checkoutEstimate || entry.expressCheckoutEstimate || '',
                  ),
                }),
          }
        }
        return entry
      }),
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError('')
    setSuccess('')
    try {
      let response
      if (scope === 'worldwide') {
        response = await fetch('/api/admin/logistics-settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            scope: 'worldwide',
            fixedPriceUsd: Number(worldwideSettings.fixedPriceUsd || 0),
            etaKey: String(worldwideSettings.etaKey || DEFAULT_WORLDWIDE_ETA_KEY),
          }),
        })
      } else if (scope === 'pickup') {
        response = await fetch('/api/admin/logistics-settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            scope: 'pickup',
            locations: pickupLocations.map((entry, index) => ({
              id: String(entry.id || ''),
              label: String(entry.label || ''),
              line1: String(entry.line1 || ''),
              line2: String(entry.line2 || ''),
              city: String(entry.city || ''),
              state: String(entry.state || ''),
              postalCode: String(entry.postalCode || ''),
              country: String(entry.country || ''),
              hours: String(entry.hours || ''),
              note: String(entry.note || ''),
              phone: String(entry.phone || ''),
              isActive: entry.isActive !== false,
              sortOrder: index,
            })),
          }),
        })
      } else {
        if (!selectedState || rates.length === 0) {
          setError('Select a state with available city rows before saving.')
          setIsSaving(false)
          return
        }
        response = await fetch('/api/admin/logistics-settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            scope: 'nigeria',
            state: selectedState,
            rates: rates.map((entry) => ({
              city: String(entry.city || ''),
              standardPrice: Number(entry.standardPrice || 0),
              expressPrice: Number(entry.expressPrice || 0),
              standardEtaKey: String(entry.standardEtaKey || 'standard_1_3_days'),
              expressEtaKey: String(entry.expressEtaKey || 'express_2_24_hours'),
            })),
          }),
        })
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save logistics settings.')
      }
      if (scope === 'worldwide') {
        setWorldwideSettings({
          fixedPriceUsd: Number(payload?.worldwideSettings?.fixedPriceUsd || 0),
          etaKey: String(payload?.worldwideSettings?.etaKey || DEFAULT_WORLDWIDE_ETA_KEY),
        })
        setSuccess('Worldwide logistics saved.')
      } else if (scope === 'pickup') {
        setPickupLocations(Array.isArray(payload?.pickupLocations) ? payload.pickupLocations : pickupLocations)
        setSuccess('Pickup locations saved.')
      } else {
        setRates(Array.isArray(payload?.rates) ? payload.rates : rates)
        setSuccess(`Logistics for ${selectedState} saved.`)
      }
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save logistics settings.')
    } finally {
      setIsSaving(false)
    }
  }

  const totalActiveRates = useMemo(() => {
    return rates.filter(
      (entry) => Number(entry.standardPrice || 0) > 0 || Number(entry.expressPrice || 0) > 0,
    ).length
  }, [rates])
  const standardEtaPresets = useMemo(
    () => etaPresets.filter((preset) => preset?.deliveryType === 'standard'),
    [etaPresets],
  )
  const expressEtaPresets = useMemo(
    () => etaPresets.filter((preset) => preset?.deliveryType === 'express'),
    [etaPresets],
  )
  const hasValidPickupLocations = useMemo(
    () =>
      pickupLocations.some(
        (entry) =>
          String(entry?.label || '').trim() &&
          String(entry?.line1 || '').trim() &&
          String(entry?.city || '').trim() &&
          String(entry?.state || '').trim() &&
          String(entry?.country || '').trim(),
      ),
    [pickupLocations],
  )
  const canSave =
    scope === 'worldwide'
      ? Number(worldwideSettings?.fixedPriceUsd || 0) >= 0
      : scope === 'pickup'
        ? hasValidPickupLocations
        : rates.length > 0

  return (
    <div className='min-h-screen bg-[#f4f7f9] text-slate-900 lg:bg-white'>
      <div className='flex min-h-screen'>
        <AdminSidebar />

        <main className='flex-1 pb-8'>
          <AdminDesktopHeader noMargin noBleed />
          <section className='w-full bg-transparent p-0 lg:bg-white lg:px-4 xl:px-5'>
            <div className='pb-24 pt-0 lg:pb-10'>
              <section className='bg-transparent'>
          <div className='px-4 py-4 sm:px-5'>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
              <div>
                <h2 className='text-xl font-semibold text-slate-900'>Delivery logistics</h2>
                <p className='mt-1 text-sm text-slate-500'>
                  Set Standard/Express delivery price and ETA by city for each Nigerian state.
                </p>
                <div className='mt-3 inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs font-semibold'>
                  <button
                    type='button'
                    onClick={() => {
                      setScope('nigeria')
                      setSuccess('')
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                      scope === 'nigeria'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className='inline-flex h-3.5 w-3.5 overflow-hidden rounded-[2px] border border-slate-200'>
                      <span className='h-full w-1/3 bg-[#118647]' />
                      <span className='h-full w-1/3 bg-white' />
                      <span className='h-full w-1/3 bg-[#118647]' />
                    </span>
                    Nigeria
                  </button>
                  <button
                    type='button'
                    onClick={() => {
                      setScope('worldwide')
                      setSuccess('')
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                      scope === 'worldwide'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <svg
                      viewBox='0 0 24 24'
                      className='h-3.5 w-3.5'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='1.8'
                      aria-hidden='true'
                    >
                      <circle cx='12' cy='12' r='9' />
                      <path d='M3 12h18M12 3c2.7 2.3 4.2 5.6 4.2 9S14.7 18.7 12 21c-2.7-2.3-4.2-5.6-4.2-9S9.3 5.3 12 3Z' />
                    </svg>
                    Worldwide
                  </button>
                  <button
                    type='button'
                    onClick={() => {
                      setScope('pickup')
                      setSuccess('')
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                      scope === 'pickup'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <svg
                      viewBox='0 0 24 24'
                      className='h-3.5 w-3.5'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='1.8'
                      aria-hidden='true'
                    >
                      <path d='M4 8h16v11H4z' />
                      <path d='M8 8V5h8v3' />
                      <path d='M4 13h16' />
                    </svg>
                    Pickup
                  </button>
                </div>
              </div>
              <div
                className={`flex flex-col gap-2 sm:flex-row sm:items-center ${
                  scope !== 'nigeria' ? 'hidden' : ''
                }`}
              >
                <div className='w-full min-w-[180px] sm:w-[220px]'>
                  <CustomSelect
                    value={selectedState}
                    onChange={(event) => {
                      const next = String(event.target.value || '')
                      setSelectedState(next)
                      setSuccess('')
                      void loadStateRates(next)
                    }}
                    searchable
                    autoFlip
                    autoFocusSearch={false}
                    searchPlaceholder='Search state'
                    noResultsText='No state found'
                    className='h-10 w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-900'
                  >
                    {states.map((stateName) => (
                      <option key={stateName} value={stateName}>
                        {stateName}
                      </option>
                    ))}
                  </CustomSelect>
                </div>
                <input
                  type='search'
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder='Search city'
                  className='h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 sm:w-[220px]'
                />
              </div>
            </div>

            {scope === 'nigeria' ? (
              <div className='mt-3 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600'>
                Configured cities: {totalActiveRates} / {rates.length}
              </div>
            ) : scope === 'worldwide' ? (
              <div className='mt-4 max-w-md rounded-xl border border-slate-200 bg-white p-4'>
                <div className='flex items-center gap-2'>
                  <span className='inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-700'>
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
                  <p className='text-sm font-semibold text-slate-900'>Worldwide fixed shipping fee</p>
                </div>
                <p className='mt-1 text-xs text-slate-500'>
                  Applied to all non-Nigeria addresses during checkout.
                </p>
                <label className='mt-3 block text-xs font-medium text-slate-600'>Price (USD)</label>
                <div className='relative mt-1'>
                  <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500'>
                    $
                  </span>
                  <input
                    type='number'
                    min='0'
                    step='0.01'
                    value={
                      Number(worldwideSettings.fixedPriceUsd || 0) > 0
                        ? Number(worldwideSettings.fixedPriceUsd || 0)
                        : ''
                    }
                    placeholder='15'
                    onChange={(event) => {
                      const numeric = Number(event.target.value)
                      setWorldwideSettings((prev) => ({
                        ...prev,
                        fixedPriceUsd:
                          Number.isFinite(numeric) && numeric >= 0 ? numeric : 0,
                      }))
                    }}
                    className='h-10 w-full rounded-xl border border-slate-200 bg-white pl-7 pr-3 text-sm text-slate-900'
                  />
                </div>
                <label className='mt-3 block text-xs font-medium text-slate-600'>ETA (Express only)</label>
                <div className='mt-1'>
                  <CustomSelect
                    value={String(worldwideSettings?.etaKey || DEFAULT_WORLDWIDE_ETA_KEY)}
                    onChange={(event) => {
                      const nextKey = String(event.target.value || '').trim()
                      setWorldwideSettings((prev) => ({
                        ...prev,
                        etaKey: nextKey || DEFAULT_WORLDWIDE_ETA_KEY,
                      }))
                    }}
                    className='h-10 w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-900'
                    autoFlip
                  >
                    {expressEtaPresets.map((preset) => (
                      <option key={preset.key} value={preset.key}>
                        {preset.adminLabel}
                      </option>
                    ))}
                  </CustomSelect>
                </div>
              </div>
            ) : (
              <div className='mt-3 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600'>
                Pickup locations: {pickupLocations.length}
              </div>
            )}
          </div>

          {scope === 'nigeria' ? (
          <div className='px-4 py-4 sm:px-5'>
            <div className='mb-2 hidden grid-cols-[1.15fr_0.55fr_0.75fr_0.55fr_0.75fr] gap-2 px-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 sm:grid'>
              <span>City</span>
              <span>Standard fee (NGN)</span>
              <span>ETA Standard</span>
              <span>Express fee (NGN)</span>
              <span>ETA Express</span>
            </div>

            {isLoading ? (
              <LogisticsSkeleton />
            ) : filteredRates.length === 0 ? (
              <div className='rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500'>
                No city rows match your search.
              </div>
            ) : (
              <div className='space-y-2'>
                {filteredRates.map((row) => (
                  <div
                    key={`rate-row-${row.city}`}
                    className='grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[1.15fr_0.55fr_0.75fr_0.55fr_0.75fr]'
                  >
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-semibold text-slate-900'>{row.city}</p>
                      <p className='mt-0.5 text-xs text-slate-500'>Standard: {formatCurrency(row.standardPrice)}</p>
                      <p className='mt-0.5 text-xs text-slate-500'>Express: {formatCurrency(row.expressPrice)}</p>
                    </div>

                    <label className='flex items-center gap-2 text-xs text-slate-500'>
                      <span className='sm:hidden'>Standard fee</span>
                      <input
                        type='number'
                        min='0'
                        step='0.01'
                        value={Number(row.standardPrice || 0) > 0 ? Number(row.standardPrice) : ''}
                        placeholder='0'
                        onChange={(event) =>
                          handleRateChange(row.city, 'standardPrice', event.target.value)
                        }
                        className='h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900'
                      />
                    </label>

                    <label className='flex items-center gap-2 text-xs text-slate-500'>
                      <span className='sm:hidden'>ETA standard</span>
                      <CustomSelect
                        value={row.standardEtaKey || 'standard_1_3_days'}
                        onChange={(event) =>
                          handleRateChange(row.city, 'standardEtaKey', event.target.value)
                        }
                        className='h-10 w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-900'
                        autoFlip
                      >
                        {standardEtaPresets.map((preset) => (
                          <option key={preset.key} value={preset.key}>
                            {preset.adminLabel}
                          </option>
                        ))}
                      </CustomSelect>
                    </label>

                    <label className='flex items-center gap-2 text-xs text-slate-500'>
                      <span className='sm:hidden'>Express fee</span>
                      <input
                        type='number'
                        min='0'
                        step='0.01'
                        value={Number(row.expressPrice || 0) > 0 ? Number(row.expressPrice) : ''}
                        placeholder='0'
                        onChange={(event) =>
                          handleRateChange(row.city, 'expressPrice', event.target.value)
                        }
                        className='h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900'
                      />
                    </label>

                    <label className='flex items-center gap-2 text-xs text-slate-500'>
                      <span className='sm:hidden'>ETA express</span>
                      <CustomSelect
                        value={row.expressEtaKey || 'express_2_24_hours'}
                        onChange={(event) =>
                          handleRateChange(row.city, 'expressEtaKey', event.target.value)
                        }
                        className='h-10 w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-900'
                        autoFlip
                      >
                        {expressEtaPresets.map((preset) => (
                          <option key={preset.key} value={preset.key}>
                            {preset.adminLabel}
                          </option>
                        ))}
                      </CustomSelect>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
          ) : null}
          {scope === 'pickup' ? (
            <PickupLocationsEditor locations={pickupLocations} onChange={setPickupLocations} />
          ) : null}

          <div className='px-4 py-2 sm:px-5'>
            <div className='min-h-5 text-xs font-medium'>
              {error ? <span className='text-rose-600'>{error}</span> : null}
              {!error && success ? <span className='text-emerald-700'>{success}</span> : null}
            </div>
          </div>
              </section>
            </div>
          </section>

          <div className='pointer-events-none fixed bottom-6 right-4 z-30 flex items-center justify-end sm:right-6 lg:right-10'>
            <button
              type='button'
              onClick={handleSave}
              disabled={isLoading || isSaving || !canSave}
              className='pointer-events-auto inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(15,23,42,0.26)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {isSaving ? 'Saving...' : 'Save logistics'}
            </button>
          </div>
        </main>
      </div>

    </div>
  )
}
