'use client'

import Image from 'next/image'

export default function PopularRightNowSection({
  items = [],
  onSelect,
  placeholderChipImage,
}) {
  if (!Array.isArray(items) || !items.length) return null

  return (
    <>
      <div className='mt-4 text-sm font-semibold text-gray-900'>
        Popular right now
      </div>
      <div className='mt-3 flex flex-wrap gap-2'>
        {items.map((item) => (
          <button
            key={item.id}
            type='button'
            onClick={() => onSelect?.(item)}
            className='flex items-center gap-2 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200'
          >
            <Image
              src={item.imageUrl || placeholderChipImage}
              alt=''
              width={34}
              height={34}
              className='h-[34px] w-[34px] shrink-0 rounded-full object-cover ring-1 ring-white shadow-sm'
              unoptimized
            />
            {item.text}
          </button>
        ))}
      </div>
    </>
  )
}
