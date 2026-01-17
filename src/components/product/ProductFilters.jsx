'use client'
import { useState } from 'react'

const COLOR_SWATCHES = {
  black: '#111827',
  white: '#ffffff',
  gray: '#9ca3af',
  grey: '#9ca3af',
  blue: '#3b82f6',
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#f59e0b',
  orange: '#f97316',
  pink: '#ec4899',
  purple: '#8b5cf6',
  brown: '#a16207',
  navy: '#1e3a8a',
  tan: '#d2b48c',
  gold: '#d97706',
  silver: '#9ca3af',
  floral: '#f472b6',
}

const getSwatchColor = (color) => {
  if (!color) return '#d1d5db'
  return COLOR_SWATCHES[color.toLowerCase()] || '#d1d5db'
}

const FilterSection = ({
  title,
  items,
  selectedSet,
  onToggle,
  initialVisible = 6,
  renderItem,
}) => {
  const [showAll, setShowAll] = useState(false)
  const visibleItems = showAll ? items : items.slice(0, initialVisible)

  if (!items.length) return null

  return (
    <div className='border-b border-gray-200 pb-4'>
      <div className='flex items-center justify-between text-sm font-semibold text-gray-900'>
        <span>{title}</span>
        <span className='text-gray-400'>−</span>
      </div>
      <div className='mt-3 space-y-2'>
        {visibleItems.map((item) => {
          const checked = selectedSet.has(item)
          return (
            <label
              key={item}
              className='flex items-center gap-2 text-xs text-gray-600 cursor-pointer'
            >
              <input
                type='checkbox'
                className='h-3 w-3 rounded border-gray-300 text-gray-900 focus:ring-gray-900'
                checked={checked}
                onChange={() => onToggle(item)}
              />
              {renderItem ? renderItem(item) : <span>{item}</span>}
            </label>
          )
        })}
      </div>
      {items.length > initialVisible && (
        <button
          type='button'
          onClick={() => setShowAll((prev) => !prev)}
          className='mt-2 text-xs font-semibold text-gray-700 hover:text-gray-900 transition'
        >
          {showAll ? 'View Less' : '+ View More'}
        </button>
      )}
    </div>
  )
}

const ProductFilters = ({
  categories,
  vendors,
  colors,
  sizes,
  priceBounds,
  priceRange,
  selectedCategories,
  selectedVendors,
  selectedColors,
  selectedSizes,
  onToggleCategory,
  onToggleVendor,
  onToggleColor,
  onToggleSize,
  onPriceChange,
  onClear,
}) => {
  const handleMinChange = (value) => {
    const nextMin = Math.min(value, priceRange.max - 1)
    onPriceChange({ min: nextMin, max: priceRange.max })
  }

  const handleMaxChange = (value) => {
    const nextMax = Math.max(value, priceRange.min + 1)
    onPriceChange({ min: priceRange.min, max: nextMax })
  }

  return (
    <aside className='bg-white rounded-2xl border border-gray-200 p-4 sticky top-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-sm font-semibold text-gray-900'>Filters</h2>
        <button
          type='button'
          onClick={onClear}
          className='text-xs text-gray-500 hover:text-gray-700 transition'
        >
          Clear all
        </button>
      </div>

      <div className='mt-4 space-y-4'>
        <FilterSection
          title='Categories'
          items={categories}
          selectedSet={selectedCategories}
          onToggle={onToggleCategory}
        />
        <FilterSection
          title='Brand'
          items={vendors}
          selectedSet={selectedVendors}
          onToggle={onToggleVendor}
        />
        <FilterSection
          title='Color'
          items={colors}
          selectedSet={selectedColors}
          onToggle={onToggleColor}
          initialVisible={8}
          renderItem={(color) => (
            <span className='flex items-center gap-2'>
              <span
                className='h-3 w-3 rounded-full border border-gray-200'
                style={{ backgroundColor: getSwatchColor(color) }}
              />
              <span className='capitalize'>{color}</span>
            </span>
          )}
        />
        <FilterSection
          title='Size'
          items={sizes}
          selectedSet={selectedSizes}
          onToggle={onToggleSize}
        />

        <div className='border-b border-gray-200 pb-4'>
          <div className='flex items-center justify-between text-sm font-semibold text-gray-900'>
            <span>Price Range</span>
            <span className='text-gray-400'>−</span>
          </div>
          <div className='mt-4 space-y-3'>
            <div className='flex items-center justify-between text-xs text-gray-500'>
              <span>${priceRange.min.toFixed(0)}</span>
              <span>${priceRange.max.toFixed(0)}</span>
            </div>
            <div className='relative'>
              <input
                type='range'
                min={priceBounds.min}
                max={priceBounds.max}
                value={priceRange.min}
                onChange={(event) =>
                  handleMinChange(Number(event.target.value))
                }
                className='w-full accent-gray-900'
              />
              <input
                type='range'
                min={priceBounds.min}
                max={priceBounds.max}
                value={priceRange.max}
                onChange={(event) =>
                  handleMaxChange(Number(event.target.value))
                }
                className='w-full accent-gray-900 -mt-2'
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default ProductFilters
