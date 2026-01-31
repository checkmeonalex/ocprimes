'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import SelectableCompactCard from '@/components/product/SelectableCompactCard'
import {
  getRecentlyViewed,
  type RecentlyViewedItem,
  removeRecentlyViewed,
} from '@/lib/recently-viewed/storage'
import { toProductCardItem } from '@/lib/recently-viewed/mapper'

export default function RecentlyViewedPage() {
  const router = useRouter()
  const [items, setItems] = useState<RecentlyViewedItem[]>([])
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    setItems(getRecentlyViewed())
  }, [])

  const grouped = useMemo(() => {
    const map = new Map<string, RecentlyViewedItem[]>()
    items.forEach((item) => {
      const date = new Date(item.viewedAt || Date.now())
      const label = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(date)
      const list = map.get(label) || []
      list.push(item)
      map.set(label, list)
    })
    return Array.from(map.entries())
  }, [items])

  const toggleSelected = (slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((id) => id !== slug) : [...prev, slug],
    )
  }

  const handleDeleteSelected = () => {
    const next = removeRecentlyViewed(selected)
    setItems(next)
    setSelected([])
    setSelectMode(false)
  }

  const handleSelectAll = () => {
    if (selected.length === items.length) {
      setSelected([])
      return
    }
    setSelected(items.map((item) => item.slug))
  }

  return (
    <div className='min-h-screen bg-white'>
      <div className='mx-auto w-full max-w-6xl px-4 py-10 sm:px-6'>
        <div className='flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-3'>
            <button
              type='button'
              aria-label='Back'
              onClick={() => router.back()}
              className='h-9 w-9 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center'
            >
              <ArrowLeft className='h-4 w-4' />
            </button>
            <h1 className='text-2xl font-semibold text-gray-900'>
              Recently Viewed
            </h1>
          </div>
          <div className='flex w-full justify-end gap-3 sm:w-auto sm:justify-start flex-wrap items-center'>
            {selected.length > 0 ? (
              <button
                onClick={handleDeleteSelected}
                className='text-sm font-semibold text-rose-600 hover:text-rose-700'
              >
                Delete
              </button>
            ) : null}
            <button
              onClick={() => {
                setSelectMode((prev) => !prev)
                setSelected([])
              }}
              className='text-sm font-semibold text-gray-600 hover:text-gray-800'
            >
              <span className='inline-flex items-center gap-2'>
                {selectMode ? (
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='24'
                    height='24'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    className='h-4 w-4'
                    aria-hidden='true'
                  >
                    <rect width='18' height='18' x='3' y='3' rx='2'></rect>
                    <path d='m9 12 2 2 4-4'></path>
                  </svg>
                ) : (
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='24'
                    height='24'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    className='h-4 w-4'
                    aria-hidden='true'
                  >
                    <rect width='18' height='18' x='3' y='3' rx='2'></rect>
                  </svg>
                )}
                Select
              </span>
            </button>
            {selectMode ? (
              <button
                onClick={handleSelectAll}
                className='text-sm font-semibold text-gray-600 hover:text-gray-800'
              >
                {selected.length === items.length ? 'Clear all' : 'Select all'}
              </button>
            ) : null}
          </div>
        </div>

        {items.length === 0 ? (
          <div className='mt-10 rounded-2xl border border-gray-200 bg-white p-6 text-center'>
            <p className='text-sm text-gray-500'>
              You have not viewed any products yet.
            </p>
            <Link
              href='/'
              className='mt-4 inline-flex rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold text-white'
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className='mt-6 space-y-8'>
            {grouped.map(([label, group]) => (
              <section key={label}>
                <div className='text-lg font-semibold text-gray-900'>
                  {label}
                </div>
                <div className='mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                  {group.map((item) => {
                    const productItem = toProductCardItem(item)
                    const findSimilarHref = `/products?search=${encodeURIComponent(
                      item.name || '',
                    )}`
                    return (
                      <SelectableCompactCard
                        key={item.slug}
                        product={productItem}
                        variant='fluid'
                        selectMode={selectMode}
                        isSelected={selected.includes(item.slug)}
                        onToggle={() => toggleSelected(item.slug)}
                        onDelete={() => {
                          const next = removeRecentlyViewed([item.slug])
                          setItems(next)
                        }}
                        onFindSimilar={() => router.push(findSimilarHref)}
                      />
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
