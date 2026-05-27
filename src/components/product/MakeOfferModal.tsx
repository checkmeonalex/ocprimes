'use client'

import { useEffect, useMemo, useState } from 'react'

type MakeOfferModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (amount: number) => void
  presetAmounts?: number[]
  productPrice?: number
  currencySymbol?: string
}

const DEFAULT_PRESETS = [440000, 420000, 400000, 380000]
const MAX_OFFER_AMOUNT = 999999999

const formatAmount = (amount: number) =>
  Number.isFinite(amount) ? amount.toLocaleString('en-US') : ''

const parseAmount = (value: string) => {
  const numeric = Number(String(value || '').replace(/[^0-9]/g, ''))
  if (!Number.isFinite(numeric) || numeric <= 0) return 0
  return Math.min(MAX_OFFER_AMOUNT, Math.floor(numeric))
}

export default function MakeOfferModal({
  isOpen,
  onClose,
  onSubmit,
  presetAmounts = DEFAULT_PRESETS,
  productPrice = 0,
  currencySymbol = '$',
}: MakeOfferModalProps) {
  const presets = useMemo(() => {
    const cleaned = presetAmounts
      .map((item) => Math.floor(Number(item)))
      .filter((item) => Number.isFinite(item) && item > 0)
    return cleaned.length ? cleaned : DEFAULT_PRESETS
  }, [presetAmounts])

  const basePrice = useMemo(() => {
    const parsed = Number(productPrice)
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed)
    return Math.max(...presets)
  }, [productPrice, presets])

  const minAllowedAmount = useMemo(
    () => Math.max(1, Math.floor(basePrice * 0.8)),
    [basePrice],
  )
  const maxRecommendedAmount = useMemo(
    () => Math.max(minAllowedAmount, Math.floor(basePrice * 0.99)),
    [basePrice, minAllowedAmount],
  )
  const step = 1

  const [selectedAmount, setSelectedAmount] = useState<number>(0)
  const [customAmount, setCustomAmount] = useState<string>('')
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setSelectedAmount(0)
    setCustomAmount('')
    setSubmitError('')
  }, [isOpen, presets, basePrice])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const parsedCustomAmount = parseAmount(customAmount)
  const effectiveAmount = parsedCustomAmount || selectedAmount
  const sendDisabled = !effectiveAmount
  const currentSliderAmount = selectedAmount > 0 ? selectedAmount : presets[0]

  const clampAmount = (amount: number) => {
    const safe = Number.isFinite(amount) ? Math.floor(amount) : minAllowedAmount
    if (safe < minAllowedAmount) return minAllowedAmount
    if (safe > maxRecommendedAmount) return maxRecommendedAmount
    return safe
  }

  const sliderAnchorAmount = clampAmount(currentSliderAmount)
  const sliderWindow = Math.max(1000, Math.floor(basePrice * 0.1))
  const sliderMin = Math.max(minAllowedAmount, sliderAnchorAmount - sliderWindow)
  const sliderMax = Math.min(maxRecommendedAmount, sliderAnchorAmount + sliderWindow)

  const updateAmount = (nextAmount: number) => {
    const clamped = clampAmount(nextAmount)
    setSelectedAmount(clamped)
    setCustomAmount(formatAmount(clamped))
    if (submitError) setSubmitError('')
  }

  const handleAmountInputChange = (value: string) => {
    const next = String(value || '')
    const digitsOnly = next.replace(/[^0-9,]/g, '')
    const parsed = parseAmount(digitsOnly)
    if (!parsed) {
      setCustomAmount(digitsOnly)
      setSelectedAmount(0)
      if (submitError) setSubmitError('')
      return
    }
    setSelectedAmount(parsed)
    setCustomAmount(formatAmount(parsed))
    if (submitError) setSubmitError('')
  }

  const handleSubmit = () => {
    if (!effectiveAmount) return
    const minAllowedLabel = `${currencySymbol}${minAllowedAmount.toLocaleString('en-US')}`
    const maxAllowedLabel = `${currencySymbol}${maxRecommendedAmount.toLocaleString('en-US')}`
    const basePriceLabel = `${currencySymbol}${basePrice.toLocaleString('en-US')}`
    if (effectiveAmount > basePrice) {
      setSubmitError(`Offer cannot be higher than ${basePriceLabel}.`)
      return
    }
    if (effectiveAmount < minAllowedAmount) {
      setSubmitError(`Offer must be at least ${minAllowedLabel}.`)
      return
    }
    if (effectiveAmount > maxRecommendedAmount) {
      setSubmitError(`Offer must be ${maxAllowedLabel} or lower.`)
      return
    }
    setSubmitError('')
    onSubmit(effectiveAmount)
  }

  return (
    <div className='fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4'>
      <div className='max-h-[85vh] w-full overflow-y-auto rounded-none border border-gray-200 bg-white shadow-[0_18px_44px_rgba(0,0,0,0.22)] sm:max-h-none sm:max-w-[24rem] sm:overflow-hidden'>
        <div className='border-b border-gray-200 bg-white px-4 pb-4 pt-3'>
          <div className='flex items-center justify-between'>
            <span className='inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-600'>
              Offer
            </span>
            <button
              type='button'
              onClick={onClose}
              aria-label='Close make offer modal'
              className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-500 transition hover:bg-white hover:text-gray-700'
            >
              <svg
                viewBox='0 0 20 20'
                className='h-4 w-4'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.8'
                aria-hidden='true'
              >
                <path d='M6 6l8 8M14 6l-8 8' strokeLinecap='round' />
              </svg>
            </button>
          </div>
          <h3 className='mt-3 text-2xl font-semibold tracking-tight text-gray-900'>Make an offer</h3>
          <p className='mt-1 text-sm text-gray-500'>Send a price the seller can accept or counter.</p>
        </div>

        <div className='space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-4'>
          <div className='grid grid-cols-2 gap-2'>
            {presets.map((amount) => {
              const isActive = amount === selectedAmount
              return (
                <button
                  key={amount}
                  type='button'
                  onClick={() => updateAmount(amount)}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    isActive
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className='text-[11px] uppercase tracking-wide text-gray-500'>Quick Pick</div>
                  <div className='mt-0.5 text-lg font-semibold text-gray-900'>
                    {currencySymbol}
                    {formatAmount(amount)}
                  </div>
                </button>
              )
            })}
          </div>

          <div className='rounded-2xl border border-gray-200 bg-gray-50 p-3'>
            <div className='mb-2 flex items-center justify-between text-xs font-medium text-gray-600'>
              <span>Adjust amount</span>
              <span>
                {currencySymbol}
                {formatAmount(sliderAnchorAmount)}
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={() => updateAmount(sliderAnchorAmount - step)}
                aria-label='Decrease offer amount'
                className='inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-gray-300 hover:bg-gray-100'
              >
                <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                  <path d='M5.5 10h9' strokeLinecap='round' />
                </svg>
              </button>
              <input
                type='range'
                min={sliderMin}
                max={sliderMax}
                step={step}
                value={sliderAnchorAmount}
                onChange={(event) => updateAmount(Number(event.target.value))}
                className='h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-300 accent-gray-700'
                aria-label='Offer amount slider'
              />
              <button
                type='button'
                onClick={() => updateAmount(sliderAnchorAmount + step)}
                aria-label='Increase offer amount'
                className='inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-gray-300 hover:bg-gray-100'
              >
                <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                  <path d='M10 5.5v9M5.5 10h9' strokeLinecap='round' />
                </svg>
              </button>
            </div>
          </div>

          <label className='flex items-center gap-3 rounded-2xl border border-gray-300 bg-white px-3 py-2.5 transition focus-within:border-gray-500 focus-within:ring-2 focus-within:ring-gray-200'>
            <span className='inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-lg font-semibold text-gray-700'>
              {currencySymbol}
            </span>
            <input
              type='text'
              inputMode='numeric'
              value={customAmount}
              onChange={(event) => handleAmountInputChange(event.target.value)}
              placeholder='Type your offer'
              className='h-8 w-full bg-transparent text-lg text-gray-900 outline-none placeholder:text-gray-400'
              aria-label='Enter offer amount'
            />
          </label>
          {submitError && (
            <p className='-mt-1 text-sm font-medium text-rose-600'>{submitError}</p>
          )}

          <button
            type='button'
            onClick={handleSubmit}
            disabled={sendDisabled}
            className={`inline-flex h-12 w-full items-center justify-center rounded-xl text-base font-semibold transition disabled:cursor-not-allowed ${
              sendDisabled
                ? 'bg-gray-200 text-gray-500'
                : 'bg-black text-white hover:bg-gray-900'
            }`}
          >
            Send Offer
          </button>
        </div>
      </div>
    </div>
  )
}
