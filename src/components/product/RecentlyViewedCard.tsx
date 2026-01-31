'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { RecentlyViewedItem } from '@/lib/recently-viewed/storage'

type RecentlyViewedCardProps = {
  item: RecentlyViewedItem
}

const formatPrice = (value: number) => {
  if (!Number.isFinite(value)) return '--'
  return value.toFixed(2)
}

const RecentlyViewedCard = ({ item }: RecentlyViewedCardProps) => {
  return (
    <Link
      href={`/product/${item.slug}`}
      className='group block rounded-xl bg-white shadow-sm transition hover:shadow-md'
    >
      <div className='rounded-xl border border-gray-200/80 p-3'>
        <div className='relative aspect-[4/5] overflow-hidden rounded-lg border border-gray-200 bg-white'>
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes='(max-width: 768px) 40vw, 160px'
              className='object-cover'
            />
          ) : (
            <div className='flex h-full w-full items-center justify-center text-xs text-gray-400'>
              No image
            </div>
          )}
        </div>
        <div className='mt-2 text-xs font-semibold text-gray-900 line-clamp-2'>
          {item.name}
        </div>
        <div className='mt-1 text-sm font-semibold text-gray-900'>
          ${formatPrice(item.price)}
        </div>
      </div>
    </Link>
  )
}

export default RecentlyViewedCard
