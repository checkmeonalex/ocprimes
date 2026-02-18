'use client'

import { useEffect, useMemo, useState } from 'react'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const toMoney = (value) => {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, number)
}

export default function CartCheckoutProgressBar({ subtotal = 0, formatMoney, config }) {
  if (config && config.enabled === false) {
    return null
  }

  const total = toMoney(subtotal)
  const standardThreshold = toMoney(config?.standardFreeShippingThreshold || 50)
  const expressThreshold = Math.max(
    standardThreshold,
    toMoney(config?.expressFreeShippingThreshold || 100),
  )

  const maxThreshold = Math.max(1, expressThreshold)
  const targetProgressPercent = clamp((total / maxThreshold) * 100, 0, 100)
  const standardMarkerPercent = clamp((standardThreshold / maxThreshold) * 100, 0, 100)

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

  return (
    <section className='rounded-xl border border-slate-200 bg-white px-4 py-3'>
      <p className='text-center text-[12px] font-semibold text-slate-800'>{progressLabel}</p>

      <div className='mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-700'>
        <span>{formatMoney(0)}</span>
        <span>{formatMoney(expressThreshold)}</span>
      </div>

      <div className='relative mt-1.5 h-2 rounded-full bg-slate-200'>
        <div
          className='h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-700 ease-out'
          style={{ width: `${animatedPercent}%` }}
        />
        <span
          className='pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white bg-indigo-500 shadow transition-[left] duration-700 ease-out'
          style={{ left: `calc(${knobLeft}% - 7px)` }}
          aria-hidden='true'
        />
      </div>

      <div className='relative mt-2 h-4 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500'>
        <span className='absolute -translate-x-1/2' style={{ left: `${standardMarkerPercent}%` }}>
          Free standard
        </span>
        <span className='absolute right-0'>Free express</span>
      </div>
    </section>
  )
}
