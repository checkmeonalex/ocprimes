'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  formatDealCountdownLabel,
  getDealExpiryTimestamp,
  getDealStockState,
  hasActiveDealPricing,
  isActiveTimedDeal,
} from '@/lib/products/deals.mjs'

const STOCK_TONE_STYLES = {
  soldout: {
    badge: 'bg-slate-200 text-slate-700',
    text: 'text-slate-600',
    track: 'bg-slate-200',
    fill: 'bg-slate-400',
    dot: 'bg-slate-500',
  },
  urgent: {
    badge: 'bg-amber-100 text-amber-800',
    text: 'text-amber-700',
    track: 'bg-amber-100',
    fill: 'bg-amber-500',
    dot: 'bg-amber-500',
  },
  warning: {
    badge: 'bg-orange-100 text-orange-800',
    text: 'text-orange-700',
    track: 'bg-orange-100',
    fill: 'bg-orange-500',
    dot: 'bg-orange-500',
  },
  active: {
    badge: 'bg-orange-100 text-orange-800',
    text: 'text-orange-700',
    track: 'bg-orange-100',
    fill: 'bg-orange-500',
    dot: 'bg-orange-500',
  },
}

function CountdownClockIcon({ className = '' }) {
  return (
    <svg viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg' className={className} aria-hidden='true'>
      <circle cx='10' cy='10' r='7.25' stroke='currentColor' strokeWidth='1.5' />
      <path d='M10 6.75V10.25L12.6 11.7' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  )
}

function ProgressBar({ progress = 0, tone = 'active' }) {
  const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0))
  const styles = STOCK_TONE_STYLES[tone] || STOCK_TONE_STYLES.active

  return (
    <div className={`relative h-[5px] w-full overflow-hidden rounded-full ${styles.track}`}>
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${styles.fill}`}
        style={{ width: `${safeProgress}%` }}
      />
    </div>
  )
}

export default function ProductDealCountdown({
  expiresAt,
  currentPrice,
  originalPrice,
  stock = 0,
  variant = 'page',
  className = '',
}) {
  const [hasMounted, setHasMounted] = useState(false)
  const [nowMs, setNowMs] = useState(null)

  const hasValidExpiry = useMemo(
    () => getDealExpiryTimestamp(expiresAt) !== null,
    [expiresAt],
  )
  const hasActivePricing = useMemo(
    () => hasActiveDealPricing({ currentPrice, originalPrice }),
    [currentPrice, originalPrice],
  )

  const isActive = useMemo(
    () =>
      !hasMounted
        ? hasActivePricing && hasValidExpiry
        :
      isActiveTimedDeal({
        expiresAt,
        currentPrice,
        originalPrice,
        nowMs,
      }),
    [currentPrice, expiresAt, hasActivePricing, hasMounted, hasValidExpiry, nowMs, originalPrice],
  )

  useEffect(() => {
    setHasMounted(true)
    setNowMs(Date.now())
  }, [])

  useEffect(() => {
    if (!hasMounted) return undefined
    if (!isActive) return undefined
    const timer = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)
    return () => window.clearInterval(timer)
  }, [hasMounted, isActive])

  const countdownLabel = useMemo(
    () => (hasMounted && nowMs ? formatDealCountdownLabel(expiresAt, nowMs) : '--:--:--'),
    [expiresAt, hasMounted, nowMs],
  )
  const stockState = useMemo(() => getDealStockState(stock), [stock])
  const toneStyles = STOCK_TONE_STYLES[stockState.tone] || STOCK_TONE_STYLES.active

  if (!isActive) return null

  if (variant === 'card') {
    return (
      <div className={`space-y-1.5 ${className}`.trim()}>
        <div className='flex flex-wrap items-start gap-1.5 text-[11px]'>
          <span className='shrink-0 whitespace-nowrap rounded-md bg-[#d7263d] px-2.5 py-1 font-semibold leading-none text-white'>
            {Math.max(1, Math.round(((Number(originalPrice) - Number(currentPrice)) / Number(originalPrice)) * 100))}% off
          </span>
          <span className='min-w-0 flex-1 text-left font-semibold leading-tight text-[#d7263d] break-words'>
            Limited time deal
          </span>
        </div>
        <div className='flex flex-wrap items-start justify-between gap-2 text-[11px]'>
          <div className='flex shrink-0 whitespace-nowrap items-center gap-1.5 text-[#f97316]'>
            <CountdownClockIcon className='h-3.5 w-3.5 shrink-0' />
            <span className='whitespace-nowrap font-semibold leading-none'>{countdownLabel}</span>
          </div>
          <span className={`mx-auto rounded-full px-2 py-0.5 text-[10px] font-semibold sm:mx-0 ${toneStyles.badge}`}>
            {stockState.tone === 'urgent' ? 'Last units' : 'Deal live'}
          </span>
        </div>
        <div className='space-y-1'>
          <ProgressBar progress={stockState.progress} tone={stockState.tone} />
          <div className='flex items-center justify-between gap-2'>
            <span className={`text-[10px] font-medium ${toneStyles.text}`}>
              {stockState.label}
            </span>
            {stockState.tone !== 'urgent' ? (
              <span className='text-[10px] text-slate-400'>
                {stockState.helper}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-[#ffd2a8] bg-white shadow-[0_12px_30px_rgba(249,115,22,0.08)] ${className}`.trim()}
    >
      <div className='flex items-center justify-between gap-3 bg-[linear-gradient(90deg,#111111_0%,#1f1f1f_100%)] px-4 py-2 text-white'>
        <div className='flex min-w-0 items-center gap-2'>
          <span className='inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold'>
            ⚡
          </span>
          <span className='truncate text-sm font-semibold'>Flash Sale</span>
        </div>
        <div className='flex items-center gap-1.5 text-sm font-semibold'>
          <span className='text-white/85'>Time left:</span>
          <CountdownClockIcon className='h-4 w-4' />
          <span>{countdownLabel}</span>
        </div>
      </div>
      <div className='space-y-3 px-4 py-3'>
        <div className='flex flex-wrap items-center gap-2 text-sm'>
          <span className='rounded-md bg-[#fff1e8] px-2 py-1 font-semibold text-[#e65100]'>
            Limited time deal
          </span>
          <span className={`font-semibold ${toneStyles.text}`}>
            {stockState.label}
          </span>
        </div>
        <div className='space-y-1.5'>
          <ProgressBar progress={stockState.progress} tone={stockState.tone} />
          <div className='flex items-center justify-between gap-2 text-[11px]'>
            <span className={toneStyles.text}>{stockState.helper}</span>
            {Number(stock) > 0 ? (
              <span className='text-slate-500'>{Number(stock)} items remaining</span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
