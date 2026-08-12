'use client'
import { useState } from 'react'

const FilterThumbnail = ({ imageUrl, label, bg, text, size = 'h-5 w-5' }) => {
  const [imageFailed, setImageFailed] = useState(false)
  const initials = String(label || '').trim().slice(0, 2).toUpperCase()

  if (imageUrl && !imageFailed) {
    return (
      <span className={`relative ${size} shrink-0 overflow-hidden rounded-full bg-gray-100`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=''
          className='h-full w-full object-cover'
          onError={() => setImageFailed(true)}
        />
      </span>
    )
  }

  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-full text-[9px] font-bold leading-none`}
      style={{ backgroundColor: bg || '#e5e7eb', color: text || '#374151' }}
    >
      {initials}
    </span>
  )
}

export default FilterThumbnail
