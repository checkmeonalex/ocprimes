'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'

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

export default function SizeGuideModal({ guide, onClose }) {
  const [unit, setUnit] = useState('in')

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const hasUnitPairs = useMemo(
    () => (guide?.columns || []).some((col) => splitUnitSuffix(col.key)),
    [guide?.columns],
  )

  const visibleColumns = useMemo(
    () => buildVisibleColumns(guide?.columns, unit),
    [guide?.columns, unit],
  )

  if (!guide) return null

  return (
    <div
      className='fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4'
      onClick={onClose}
    >
      <div
        className='flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl'
        onClick={(event) => event.stopPropagation()}
      >
        <div className='flex items-center justify-between border-b border-stone-100 px-5 py-4'>
          <h2 className='text-sm font-semibold tracking-wide text-stone-900'>Size Guide</h2>
          <div className='flex items-center gap-3'>
            {guide.unit_toggle && hasUnitPairs && (
              <div className='flex items-center rounded-full border border-stone-200 p-0.5 text-[11px] font-semibold'>
                {['in', 'cm'].map((option) => (
                  <button
                    key={option}
                    type='button'
                    onClick={() => setUnit(option)}
                    className={`rounded-full px-2.5 py-1 uppercase transition ${
                      unit === option ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
            <button
              type='button'
              onClick={onClose}
              className='rounded-full p-1 text-stone-500 hover:bg-stone-100'
              aria-label='Close size guide'
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className='overflow-y-auto px-5 py-4'>
          <p className='mb-3 text-sm font-medium text-stone-900'>{guide.name}</p>

          <div className='overflow-x-auto rounded-lg border border-stone-100'>
            <table className='w-full min-w-[320px] border-collapse text-sm'>
              <thead>
                <tr className='bg-stone-50'>
                  {visibleColumns.map((col) => (
                    <th
                      key={col.key}
                      className='whitespace-nowrap border-b border-stone-100 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-500'
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(guide.rows || []).map((row, index) => (
                  <tr key={index} className='odd:bg-white even:bg-stone-50/60'>
                    {visibleColumns.map((col) => (
                      <td key={col.key} className='whitespace-nowrap border-b border-stone-50 px-3 py-2 text-stone-700'>
                        {row[col.key] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {guide.how_to_measure && (
            <div className='mt-4 rounded-lg bg-stone-50 p-3'>
              <p className='mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500'>
                How to measure
              </p>
              <p className='whitespace-pre-line text-xs leading-relaxed text-stone-600'>
                {guide.how_to_measure}
              </p>
            </div>
          )}

          {guide.notes && (
            <p className='mt-3 text-xs leading-relaxed text-stone-500'>{guide.notes}</p>
          )}
        </div>
      </div>
    </div>
  )
}
