'use client'
import React from 'react'
import Image from 'next/image'
import { getSwatchStyle } from './colorUtils.mjs'

const ColorOptions = ({
  colors,
  selectedColor,
  setSelectedColor,
  swatchImages,
  onPreviewImage,
  onClearPreview,
}) => {
  return (
    <div className='absolute bottom-3 right-3 flex flex-col gap-1 z-20 bg-white/20 backdrop-blur-sm p-1 rounded-lg shadow-sm'>
      {colors.slice(0, 3).map((color) => (
        <button
          key={color}
          onClick={(e) => {
            e.stopPropagation()
            setSelectedColor(color)
          }}
          onMouseEnter={(e) => {
            e.stopPropagation()
            if (onPreviewImage && swatchImages?.[color]) {
              onPreviewImage(swatchImages[color])
            }
          }}
          onMouseLeave={(e) => {
            e.stopPropagation()
            if (onClearPreview) {
              onClearPreview()
            }
          }}
          className={`relative w-3.5 h-3.5 rounded-full overflow-hidden border border-gray-300
            ${selectedColor === color
              ? 'ring-2 ring-gray-500 ring-offset-1'
              : 'opacity-80 hover:opacity-100'
            }
            transition-all duration-200`}
          style={!swatchImages?.[color] ? getSwatchStyle(color) : undefined}
          title={color}
        >
          {swatchImages?.[color] && (
            <Image
              src={swatchImages[color]}
              alt={color}
              fill
              sizes='12px'
              className='rounded-full object-cover object-center origin-center'
              style={{ transform: 'scale(2.5)' }}
            />
          )}
        </button>
      ))}

      {colors.length > 3 && (
        <div className='w-3.5 h-3.5 rounded-full flex items-center justify-center'>
          <span className='text-gray-800 text-[10px] font-bold'>
            +{colors.length - 3}
          </span>
        </div>
      )}
    </div>
  )
}

export default ColorOptions
