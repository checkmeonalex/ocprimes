'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import CompactProductCard from '@/components/product/CompactProductCard'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  getRecentlyViewed,
  type RecentlyViewedItem,
} from '@/lib/recently-viewed/storage'
import { toProductCardItem } from '@/lib/recently-viewed/mapper'

type RecentlyViewedSectionProps = {
  currentSlug?: string
  maxVisible?: number
  viewAllHref?: string
}

const RecentlyViewedSection = ({
  currentSlug,
  maxVisible = 8,
  viewAllHref = '/recently-viewed',
}: RecentlyViewedSectionProps) => {
  const [items, setItems] = useState<RecentlyViewedItem[]>([])
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const stored = getRecentlyViewed()
    const filtered = currentSlug
      ? stored.filter((entry) => entry?.slug !== currentSlug)
      : stored
    setItems(filtered)
  }, [currentSlug, maxVisible])

  const visibleItems = useMemo(
    () => items.slice(0, maxVisible),
    [items, maxVisible],
  )
  const remainingItems = useMemo(
    () => items.slice(maxVisible),
    [items, maxVisible],
  )
  const showViewAll = remainingItems.length > 0
  const cardItems = useMemo(
    () => visibleItems.map(toProductCardItem),
    [visibleItems],
  )

  if (!items.length) return null

  return (
    <section className='border-t border-gray-100 px-6 pb-6 pt-5 overflow-x-hidden'>
      <div className='flex items-center justify-between'>
        <h2 className='text-base font-semibold text-gray-900'>
          Recently Viewed
        </h2>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            aria-label='Scroll left'
            onClick={() => {
              scrollRef.current?.scrollBy({ left: -220, behavior: 'smooth' })
            }}
            className='h-8 w-8 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center'
          >
            <ChevronLeft className='h-4 w-4' />
          </button>
          <button
            type='button'
            aria-label='Scroll right'
            onClick={() => {
              scrollRef.current?.scrollBy({ left: 220, behavior: 'smooth' })
            }}
            className='h-8 w-8 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center'
          >
            <ChevronRight className='h-4 w-4' />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className='recently-scroll mt-4 flex w-full max-w-full gap-4 overflow-x-auto pb-2'
      >
        {cardItems.map((item) => (
          <CompactProductCard key={item.slug} product={item} />
        ))}
        {showViewAll ? (
          <Link
            href={viewAllHref}
            className='group block min-w-[200px] max-w-[200px] flex-shrink-0'
          >
            <div className='rounded-xl bg-white shadow-sm transition hover:shadow-md'>
              <div className='relative rounded-xl border border-gray-200/80 w-[200px] h-[240px] flex flex-col overflow-hidden'>
                <div className='relative h-[70%] overflow-hidden rounded-t-xl border-b border-gray-200 bg-white'>
                  <div className='absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0 opacity-70 blur-[2px]'>
                    {remainingItems.slice(0, 9).map((item) => (
                      <div
                        key={item.slug}
                        className='relative overflow-hidden bg-gray-100'
                      >
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes='200px'
                            className='object-cover'
                            unoptimized
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <div className='absolute inset-0 bg-white/10' />
                </div>
                <div className='px-3 pb-2 pt-2'>
                  <div className='text-xs font-semibold text-gray-900 line-clamp-1'>
                    View all
                  </div>
                  <div className='mt-1 text-[11px] text-gray-400'>
                    {remainingItems.length} more items
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ) : null}
      </div>
    </section>
  )
}

export default RecentlyViewedSection
