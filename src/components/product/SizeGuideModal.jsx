'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'
import { getRecentlyViewed } from '@/lib/recently-viewed/storage'

// Its own chunk — the height/weight wizard + prediction matcher never ships
// in the base product page bundle, only fetched once someone opens this tab.
const FindMySizeWizard = dynamic(() => import('./FindMySizeWizard'), {
  loading: () => (
    <div className='flex justify-center py-10'>
      <span className='h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900' />
    </div>
  ),
  ssr: false,
})

// Columns whose key ends in _in / _cm are treated as a unit pair sharing one
// visible header (the label with the suffix stripped); the toggle swaps
// which of the pair is shown. Columns without that suffix always show.
const splitUnitSuffix = (key) => {
  if (key.endsWith('_in')) return { base: key.slice(0, -3), unit: 'in' }
  if (key.endsWith('_cm')) return { base: key.slice(0, -3), unit: 'cm' }
  return null
}

const buildVisibleColumns = (columns, unit) => {
  if (!Array.isArray(columns)) return []
  const seenBases = new Set()
  const result = []
  columns.forEach((col) => {
    const split = splitUnitSuffix(col.key)
    if (!split) {
      result.push(col)
      return
    }
    if (seenBases.has(split.base)) return
    const preferred = columns.find((c) => c.key === `${split.base}_${unit}`)
    const fallback = columns.find((c) => c.key === col.key)
    const chosen = preferred || fallback
    if (!chosen) return
    seenBases.add(split.base)
    result.push({ key: chosen.key, label: chosen.label.replace(/\s*\((in|cm)\)\s*$/i, '') })
  })
  return result
}

const SizeTable = ({ guide, unit, hasUnitPairs, isDark }) => {
  const visibleColumns = useMemo(() => buildVisibleColumns(guide?.columns, unit), [guide?.columns, unit])
  return (
    <div className={`overflow-x-auto rounded-lg border ${isDark ? 'border-white/10' : 'border-stone-100'}`}>
      <table className='w-full min-w-[420px] border-collapse text-sm'>
        <thead>
          <tr className={isDark ? 'bg-white/5' : 'bg-stone-50'}>
            {visibleColumns.map((col) => (
              <th
                key={col.key}
                className={`whitespace-nowrap border-b px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide ${
                  isDark ? 'border-white/10 text-white/50' : 'border-stone-100 text-stone-500'
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(guide?.rows || []).map((row, index) => (
            <tr
              key={index}
              className={isDark ? 'odd:bg-white/[0.02] even:bg-white/[0.05]' : 'odd:bg-white even:bg-stone-50/60'}
            >
              {visibleColumns.map((col) => (
                <td
                  key={col.key}
                  className={`whitespace-nowrap border-b px-3 py-2.5 ${
                    isDark ? 'border-white/5 text-white/80' : 'border-stone-50 text-stone-700'
                  }`}
                >
                  {row[col.key] || '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const RecentlyViewedStrip = ({ currentSlug, formatMoney, isDark }) => {
  const [items, setItems] = useState([])

  useEffect(() => {
    const stored = getRecentlyViewed()
    const filtered = (currentSlug ? stored.filter((entry) => entry?.slug !== currentSlug) : stored).slice(0, 4)
    setItems(filtered)
  }, [currentSlug])

  if (!items.length) return null

  const format = (value) => (formatMoney ? formatMoney(value) : `₦${Number(value || 0).toLocaleString()}`)

  return (
    <div className={`mt-6 border-t pt-4 ${isDark ? 'border-white/10' : 'border-stone-100'}`}>
      <p className={`mb-3 text-sm font-semibold ${isDark ? 'text-white' : 'text-stone-900'}`}>Recently Viewed</p>
      <div className='grid grid-cols-2 gap-3'>
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/product/${item.slug}`}
            className={`group block overflow-hidden rounded-lg border ${isDark ? 'border-white/10' : 'border-stone-100'}`}
          >
            <div className={`relative aspect-square w-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-stone-50'}`}>
              {item.image && (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes='200px'
                  className='object-cover transition group-hover:scale-105'
                />
              )}
            </div>
            <div className='px-2 py-2'>
              <p className={`truncate text-xs font-medium ${isDark ? 'text-white/80' : 'text-stone-800'}`}>{item.name}</p>
              <p className={`mt-0.5 text-xs font-semibold ${isDark ? 'text-white' : 'text-stone-900'}`}>{format(item.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

const ANIMATION_MS = 300

export default function SizeGuideModal({ guide, onClose, currentSlug, formatMoney, onSizeSelect, theme = 'light' }) {
  const isDark = theme === 'dark'
  const [unit, setUnit] = useState('in')
  const [activeTab, setActiveTab] = useState('chart')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    window.setTimeout(() => onClose?.(), ANIMATION_MS)
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [])

  const hasUnitPairs = useMemo(
    () => (guide?.columns || []).some((col) => splitUnitSuffix(col.key)),
    [guide?.columns],
  )

  if (!guide) return null

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-end justify-center bg-black/50 transition-opacity duration-300 ease-out sm:items-stretch sm:justify-end ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className='absolute inset-0' onClick={handleClose} />
      <div
        className={`relative flex h-[88vh] w-full flex-col overflow-hidden rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out sm:h-full sm:w-full sm:max-w-md sm:rounded-none ${
          isDark ? 'bg-[#0a0a0a]' : 'bg-white'
        } ${isVisible ? 'translate-y-0 sm:translate-x-0' : 'translate-y-full sm:translate-x-full sm:translate-y-0'}`}
      >
        <div className={`shrink-0 flex items-center justify-between border-b px-5 py-4 sm:px-8 sm:py-6 ${isDark ? 'border-white/10' : 'border-stone-100'}`}>
          <h2 className={`text-base font-semibold tracking-wide ${isDark ? 'text-white' : 'text-stone-900'}`}>Size Guide</h2>
          <button
            type='button'
            onClick={handleClose}
            className={`rounded-full p-1 transition ${isDark ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-stone-500 hover:bg-stone-100'}`}
            aria-label='Close size guide'
          >
            <X size={20} />
          </button>
        </div>

        <div className={`shrink-0 flex gap-6 overflow-x-auto border-b px-5 sm:px-8 ${isDark ? 'border-white/10' : 'border-stone-100'}`}>
          <button
            type='button'
            onClick={() => setActiveTab('chart')}
            className={`shrink-0 whitespace-nowrap border-b-2 py-3 text-sm font-medium transition ${
              activeTab === 'chart'
                ? isDark
                  ? 'border-white text-white'
                  : 'border-stone-900 text-stone-900'
                : isDark
                  ? 'border-transparent text-white/40 hover:text-white/70'
                  : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}
          >
            Size Chart
          </button>
          <button
            type='button'
            onClick={() => setActiveTab('findmysize')}
            className={`shrink-0 whitespace-nowrap border-b-2 py-3 text-sm font-medium transition ${
              activeTab === 'findmysize'
                ? isDark
                  ? 'border-white text-white'
                  : 'border-stone-900 text-stone-900'
                : isDark
                  ? 'border-transparent text-white/40 hover:text-white/70'
                  : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}
          >
            Find My Fit ✨
          </button>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-8 sm:py-6'>
          {activeTab === 'chart' && (
            <>
              <p className={`mb-4 text-sm leading-relaxed ${isDark ? 'text-white/60' : 'text-stone-500'}`}>{guide.name}</p>

              {guide.unit_toggle && hasUnitPairs && (
                <div className='mb-4 flex items-center justify-end gap-2'>
                  <span
                    className={`text-xs font-semibold ${
                      unit === 'in' ? (isDark ? 'text-white' : 'text-stone-900') : isDark ? 'text-white/40' : 'text-stone-400'
                    }`}
                  >
                    IN
                  </span>
                  <button
                    type='button'
                    onClick={() => setUnit((prev) => (prev === 'in' ? 'cm' : 'in'))}
                    className={`relative h-5 w-9 rounded-full transition ${
                      unit === 'cm' ? (isDark ? 'bg-white' : 'bg-stone-900') : isDark ? 'bg-white/20' : 'bg-stone-300'
                    }`}
                    aria-label='Toggle unit'
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform ${isDark ? 'bg-[#0a0a0a]' : 'bg-white'} ${
                        unit === 'cm' ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <span
                    className={`text-xs font-semibold ${
                      unit === 'cm' ? (isDark ? 'text-white' : 'text-stone-900') : isDark ? 'text-white/40' : 'text-stone-400'
                    }`}
                  >
                    CM
                  </span>
                </div>
              )}

              <SizeTable guide={guide} unit={unit} hasUnitPairs={hasUnitPairs} isDark={isDark} />

              {guide.notes && (
                <div className={`mt-4 rounded-lg p-3 ${isDark ? 'bg-white/5' : 'bg-stone-50'}`}>
                  <p className={`whitespace-pre-line text-xs leading-relaxed ${isDark ? 'text-white/70' : 'text-stone-600'}`}>{guide.notes}</p>
                </div>
              )}

              {guide.how_to_measure && (
                <div className={`mt-4 rounded-lg p-3 ${isDark ? 'bg-white/5' : 'bg-stone-50'}`}>
                  <p className={`mb-1 text-[11px] font-semibold uppercase tracking-wide ${isDark ? 'text-white/50' : 'text-stone-500'}`}>How to measure</p>
                  <p className={`whitespace-pre-line text-xs leading-relaxed ${isDark ? 'text-white/70' : 'text-stone-600'}`}>{guide.how_to_measure}</p>
                </div>
              )}

              <RecentlyViewedStrip currentSlug={currentSlug} formatMoney={formatMoney} isDark={isDark} />
            </>
          )}

          {activeTab === 'findmysize' && (
            <FindMySizeWizard
              guide={guide}
              onSizeSelect={(size) => {
                onSizeSelect?.(size)
                handleClose()
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
