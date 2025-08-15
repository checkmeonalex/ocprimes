'use client'
import React from 'react'

const getGradient = (color) => {
  const gradientMap = {
    white: 'linear-gradient(135deg, #ffffff, #f0f0f0)',
    black: 'linear-gradient(135deg, #000000, #434343)',
    gray: 'linear-gradient(135deg, #6b7280, #9ca3af)', // gray-500 to gray-400
    navy: 'linear-gradient(135deg, #1e40af, #3b82f6)', // blue-900 to blue-500
    red: 'linear-gradient(135deg, #ef4444, #f87171)', // red-500 to red-400
    blue: 'linear-gradient(135deg, #3b82f6, #60a5fa)', // blue-500 to blue-400
    brown: 'linear-gradient(135deg, #b45309, #f59e0b)', // amber-800 to amber-500
    tan: 'linear-gradient(135deg, #ca8a04, #fbbf24)', // yellow-600 to yellow-400
    pink: 'linear-gradient(135deg, #f472b6, #f9a8d4)', // pink-400 to pink-300
    olive: 'linear-gradient(135deg, #16a34a, #4ade80)', // green-600 to green-400
  }
  return gradientMap[color] || 'linear-gradient(135deg, #d1d5db, #9ca3af)' // default gray gradient
}

const ColorOptions = ({ colors, selectedColor, setSelectedColor }) => {
  return (
    <div className='absolute bottom-3 right-3 flex flex-col gap-1 z-20 bg-white/20 backdrop-blur-sm p-1 rounded-lg shadow-sm'>
      {colors.slice(0, 3).map((color) => (
        <button
          key={color}
          onClick={(e) => {
            e.stopPropagation()
            setSelectedColor(color)
          }}
          className={`w-3 h-3 rounded-full border border-gray-300
            ${selectedColor === color
              ? 'ring-2 ring-gray-500 ring-offset-1'
              : 'opacity-80 hover:opacity-100'
            }
            transition-all duration-200`}
          style={{ background: getGradient(color) }}
          title={color}
        />
      ))}

      {colors.length > 3 && (
        <div className='w-3 h-3 rounded-full flex items-center justify-center'>
          <span className='text-gray-800 text-[10px] font-bold'>
            +{colors.length - 3}
          </span>
        </div>
      )}
    </div>
  )
}

export default ColorOptions
