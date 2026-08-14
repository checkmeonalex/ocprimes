'use client'

import { useEffect, useMemo, useState } from 'react'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const toMoney = (value) => {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, number)
}

export default function CartCheckoutProgressBar({ subtotal = 0, formatMoney, config }) {
  if (!config) {
    return (
      <section className='rounded-xl border border-slate-200 bg-white px-4 py-3'>
        <div className='mx-auto h-4 w-72 max-w-full animate-pulse rounded bg-slate-200' />
        <div className='mt-3 flex items-center justify-between'>
          <div className='h-3 w-10 animate-pulse rounded bg-slate-200' />
          <div className='h-3 w-12 animate-pulse rounded bg-slate-200' />
        </div>
        <div className='mt-2 h-2 animate-pulse rounded-full bg-slate-200' />
        <div className='mt-3 flex items-center justify-between'>
          <div className='h-3 w-24 animate-pulse rounded bg-slate-200' />
          <div className='h-3 w-20 animate-pulse rounded bg-slate-200' />
        </div>
      </section>
    )
  }

  if (config && config.enabled === false) {
    return null
  }

  const total = toMoney(subtotal)
  const standardThreshold = toMoney(config.standardFreeShippingThreshold)
  const expressThreshold = Math.max(
    standardThreshold,
    toMoney(config.expressFreeShippingThreshold),
  )

  const maxThreshold = Math.max(1, expressThreshold)
  const targetProgressPercent = clamp((total / maxThreshold) * 100, 0, 100)

  const remainingForStandard = Math.max(0, standardThreshold - total)
  const remainingForExpress = Math.max(0, expressThreshold - total)
  const unlockedStandard = total >= standardThreshold
  const unlockedExpress = total >= expressThreshold

  const progressLabel = useMemo(() => {
    if (unlockedExpress) {
      return 'Amazing! You unlocked free express shipping.'
    }
    if (unlockedStandard) {
      return `Nice! You unlocked free standard shipping. Add ${formatMoney(remainingForExpress)} more for free express shipping.`
    }
    return `Add ${formatMoney(remainingForStandard)} more to unlock free standard shipping.`
  }, [formatMoney, remainingForExpress, remainingForStandard, unlockedExpress, unlockedStandard])

  const [animatedPercent, setAnimatedPercent] = useState(0)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setAnimatedPercent(targetProgressPercent)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [targetProgressPercent])

  const knobLeft = clamp(animatedPercent, 0, 100)

  // Pale yellow at low progress, deepening to a richer gold as the shopper
  // gets closer to unlocking free express shipping.
  const fillColor = useMemo(() => {
    const t = clamp(animatedPercent, 0, 100) / 100
    const from = { r: 254, g: 240, b: 138 } // yellow-200
    const to = { r: 202, g: 138, b: 4 } // yellow-600
    const mix = (a, b) => Math.round(a + (b - a) * t)
    return `rgb(${mix(from.r, to.r)}, ${mix(from.g, to.g)}, ${mix(from.b, to.b)})`
  }, [animatedPercent])

  const nextTierLabel = unlockedExpress
    ? null
    : unlockedStandard
      ? 'Free express'
      : 'Free standard'

  return (
    <section className='rounded-xl border border-slate-200 bg-white px-4 py-3'>
      <p className='text-center text-[12px] font-semibold text-slate-800'>{progressLabel}</p>

      <div className='mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-700'>
        <span>{formatMoney(0)}</span>
        <span>{formatMoney(expressThreshold)}</span>
      </div>

      <div className='relative mt-1.5 h-2 rounded-full bg-slate-200'>
        <div
          className='h-full rounded-full transition-[width] duration-700 ease-out'
          style={{ width: `${animatedPercent}%`, backgroundColor: fillColor }}
        />
        <span
          className='pointer-events-none absolute top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white shadow transition-[left] duration-700 ease-out'
          style={{ left: `calc(${knobLeft}% - 10px)`, backgroundColor: fillColor }}
          aria-hidden='true'
        >
          <svg className='h-3.5 w-3.5' viewBox='0 0 51 48'>
            <path
              d='M25.5 1 32 18.6l18.5.6-14.5 11.6L41.4 48 25.5 37 9.6 48l5.4-17.2L.5 19.2l18.5-.6Z'
              fill='#ffffff'
            />
          </svg>
        </span>
      </div>

      {nextTierLabel ? (
        <p className='mt-2 flex items-center justify-center gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500'>
          {unlockedStandard ? (
            <svg className='h-3 w-3' viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
              <path d='M13 2 3 14h7l-1 8 10-12h-7l1-8Z' />
            </svg>
          ) : (
            <svg className='h-3 w-3' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
              <rect x='1' y='6' width='13' height='10' rx='1' />
              <path d='M14 9h4l4 4v3h-8V9Z' />
              <circle cx='6' cy='18' r='1.6' />
              <circle cx='17.5' cy='18' r='1.6' />
            </svg>
          )}
          {nextTierLabel}
        </p>
      ) : null}
    </section>
  )
}
