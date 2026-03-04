'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import SelectableCompactCard from '@/components/product/SelectableCompactCard'
import { useAlerts } from '@/context/AlertContext'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
import {
  getRecentlyViewed,
  removeRecentlyViewed,
} from '@/lib/recently-viewed/storage'
import { toProductCardItem } from '@/lib/recently-viewed/mapper'

const BrowsingHistorySkeleton = () => (
  <div className='mt-6 space-y-8'>
    {Array.from({ length: 2 }).map((_, sectionIndex) => (
      <section key={`history-skeleton-section-${sectionIndex}`}>
        <div className='h-7 w-32 animate-pulse rounded-md bg-slate-200' />
        <div className='mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
          {Array.from({ length: 5 }).map((__, cardIndex) => (
            <div
              key={`history-skeleton-card-${sectionIndex}-${cardIndex}`}
              className='overflow-hidden rounded-md border border-slate-200'
            >
              <div className='aspect-square animate-pulse bg-slate-200' />
              <div className='space-y-2 p-3'>
                <div className='h-4 w-4/5 animate-pulse rounded bg-slate-200' />
                <div className='h-4 w-1/2 animate-pulse rounded bg-slate-200' />
                <div className='h-3 w-2/3 animate-pulse rounded bg-slate-200' />
              </div>
            </div>
          ))}
        </div>
      </section>
    ))}
  </div>
)

export default function BrowsingHistoryPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { pushAlert } = useAlerts()
  const { addItem } = useCart()
  const { openSaveModal } = useWishlist()
  const [items, setItems] = useState([])
  const [isReady, setIsReady] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState([])
  const isUserDashboardHistory = pathname?.startsWith('/UserBackend')

  useEffect(() => {
    setItems(getRecentlyViewed())
    setIsReady(true)
  }, [])

  const grouped = useMemo(() => {
    const map = new Map()
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

  const toggleSelected = (slug) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((id) => id !== slug) : [...prev, slug],
    )
  }

  const handleDeleteSelected = () => {
    const next = removeRecentlyViewed(selected)
    setItems(next)
    setSelected([])
    setSelectMode(false)
    pushAlert({
      type: 'success',
      title: 'Browsing History',
      message: 'Selected items removed.',
    })
  }

  const handleSelectAll = () => {
    if (selected.length === items.length) {
      setSelected([])
      return
    }
    setSelected(items.map((item) => item.slug))
  }

  return (
    <div className='px-3 sm:px-4 lg:px-5'>
      <div className='rounded-2xl bg-white p-3 shadow-sm sm:p-4'>
        <div className='flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-3'>
            {!isUserDashboardHistory ? (
              <button
                type='button'
                aria-label='Back'
                onClick={() => router.back()}
                className='flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50'
              >
                <ArrowLeft className='h-4 w-4' />
              </button>
            ) : null}
            <h1 className='text-xl font-semibold text-slate-900'>Browsing history</h1>
          </div>
          <div className='w-full overflow-x-auto sm:ml-auto sm:w-auto'>
            <div className='flex min-w-max items-center gap-2 sm:justify-end'>
              {selected.length > 0 ? (
                <button
                  onClick={handleDeleteSelected}
                  className='inline-flex h-8 items-center rounded-md px-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700'
                >
                  Delete
                </button>
              ) : null}
              <button
                onClick={() => {
                  setSelectMode((prev) => !prev)
                  setSelected([])
                }}
                className='inline-flex h-8 items-center rounded-md px-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800'
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
                  className='inline-flex h-8 items-center rounded-md px-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                >
                  {selected.length === items.length ? 'Clear all' : 'Select all'}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {!isReady ? (
          <BrowsingHistorySkeleton />
        ) : items.length === 0 ? (
          <div className='mt-10 rounded-2xl border border-slate-200 bg-white p-6 text-center'>
            <p className='text-sm text-slate-500'>
              You have not viewed any products yet.
            </p>
            <Link
              href='/'
              className='mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white'
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className='mt-6 space-y-8'>
            {grouped.map(([label, group]) => (
              <section key={label}>
                <div className='text-base font-semibold text-slate-900'>
                  {label}
                </div>
                <div className='mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                  {group.map((item) => {
                    const productItem = toProductCardItem(item)
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
                          pushAlert({
                            type: 'success',
                            title: 'Browsing History',
                            message: 'Item removed.',
                          })
                        }}
                        onSaveWish={() => {
                          openSaveModal({
                            id: productItem.id,
                            name: productItem.name,
                            slug: productItem.slug,
                            price: Number(productItem.price) || 0,
                            image: productItem.image || '',
                          })
                        }}
                        onAddToCart={() => {
                          addItem(
                            {
                              id: productItem.id,
                              name: productItem.name,
                              slug: productItem.slug,
                              price: Number(productItem.price) || 0,
                              originalPrice:
                                productItem.originalPrice === null ||
                                productItem.originalPrice === undefined
                                  ? null
                                  : Number(productItem.originalPrice),
                              image: productItem.image || null,
                            },
                            1,
                          )
                          pushAlert({
                            type: 'success',
                            title: 'Browsing History',
                            message: 'Item added to cart.',
                          })
                        }}
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
