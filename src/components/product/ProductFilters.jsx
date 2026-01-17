'use client'
import { useState } from 'react'
import { getSwatchStyle } from './colorUtils.mjs'

const FilterSection = ({
  title,
  items,
  selectedSet,
  onToggle,
  initialVisible = 6,
  renderItem,
  isOpen,
  onToggleSection,
}) => {
  const [showAll, setShowAll] = useState(false)
  const visibleItems = showAll ? items : items.slice(0, initialVisible)

  if (!items.length) return null

  return (
    <div className='border-b border-gray-200 py-3'>
      <button
        type='button'
        onClick={onToggleSection}
        className='flex w-full items-center justify-between text-sm font-semibold text-gray-900'
      >
        <span>{title}</span>
        <span className='text-gray-400'>
          <svg
            className={`h-4 w-4 transition-transform ${
              isOpen ? 'rotate-180' : 'rotate-0'
            }`}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={1.8}
              d='M19 9l-7 7-7-7'
            />
          </svg>
        </span>
      </button>
      {isOpen && (
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
      )}
    </div>
  )
}

const ProductFilters = ({
  categories,
  vendors,
  colors = [],
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
  onClose,
  onDone,
}) => {
  const [openSections, setOpenSections] = useState({
    categories: true,
    brand: false,
    color: false,
    size: false,
    price: true,
  })

  const minGap = priceBounds.min === priceBounds.max ? 0 : 1
  const clampPrice = (value) =>
    Math.max(priceBounds.min, Math.min(priceBounds.max, value))

  const handleMinChange = (value) => {
    const nextMin = clampPrice(Math.min(value, priceRange.max - minGap))
    onPriceChange({ min: nextMin, max: priceRange.max })
  }

  const handleMaxChange = (value) => {
    const nextMax = clampPrice(Math.max(value, priceRange.min + minGap))
    onPriceChange({ min: priceRange.min, max: nextMax })
  }

  const formatPrice = (value) =>
    `$${Math.round(value).toLocaleString()}`

  return (
    <aside className='flex h-full flex-col bg-white'>
      <div className='flex items-center justify-between border-b border-gray-200 px-4 py-3'>
        <button
          type='button'
          onClick={onClose}
          className='text-gray-500 hover:text-gray-700 transition'
          aria-label='Close filters'
        >
          ✕
        </button>
        <h2 className='text-sm font-semibold text-gray-900'>Filter</h2>
        <span className='w-6' />
      </div>

      <div className='flex-1 overflow-y-auto px-4'>
        <FilterSection
          title='Category'
          items={categories}
          selectedSet={selectedCategories}
          onToggle={onToggleCategory}
          isOpen={openSections.categories}
          onToggleSection={() =>
            setOpenSections((prev) => ({
              ...prev,
              categories: !prev.categories,
            }))
          }
        />
        <FilterSection
          title='Brand'
          items={vendors}
          selectedSet={selectedVendors}
          onToggle={onToggleVendor}
          isOpen={openSections.brand}
          onToggleSection={() =>
            setOpenSections((prev) => ({
              ...prev,
              brand: !prev.brand,
            }))
          }
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
                className='h-4 w-4 rounded-full border border-gray-300'
                style={getSwatchStyle(color)}
              />
              <span className='capitalize'>{color}</span>
            </span>
          )}
          isOpen={openSections.color}
          onToggleSection={() =>
            setOpenSections((prev) => ({
              ...prev,
              color: !prev.color,
            }))
          }
        />
        <FilterSection
          title='Size'
          items={sizes}
          selectedSet={selectedSizes}
          onToggle={onToggleSize}
          isOpen={openSections.size}
          onToggleSection={() =>
            setOpenSections((prev) => ({
              ...prev,
              size: !prev.size,
            }))
          }
        />

        <div className='border-b border-gray-200 py-3'>
          <button
            type='button'
            onClick={() =>
              setOpenSections((prev) => ({
                ...prev,
                price: !prev.price,
              }))
            }
            className='flex w-full items-center justify-between text-sm font-semibold text-gray-900'
          >
            <span>Price Range</span>
            <span className='text-gray-400'>
              <svg
                className={`h-4 w-4 transition-transform ${
                  openSections.price ? 'rotate-180' : 'rotate-0'
                }`}
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={1.8}
                  d='M19 9l-7 7-7-7'
                />
              </svg>
            </span>
          </button>
          {openSections.price && (
            <div className='mt-4 space-y-4'>
              <div className='flex items-center justify-between text-xs text-gray-500'>
                <span>{formatPrice(priceRange.min)}</span>
                <span>{formatPrice(priceRange.max)}</span>
              </div>
              <div className='relative h-8'>
                <input
                  type='range'
                  min={priceBounds.min}
                  max={priceBounds.max}
                  value={priceRange.min}
                  onChange={(event) =>
                    handleMinChange(Number(event.target.value))
                  }
                  className='w-full accent-black'
                />
                <input
                  type='range'
                  min={priceBounds.min}
                  max={priceBounds.max}
                  value={priceRange.max}
                  onChange={(event) =>
                    handleMaxChange(Number(event.target.value))
                  }
                  className='w-full accent-black -mt-2'
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className='border-t border-gray-200 px-4 py-3'>
        <div className='grid grid-cols-2 gap-3'>
          <button
            type='button'
            onClick={onClear}
            className='rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition'
          >
            Clear
          </button>
          <button
            type='button'
            onClick={onDone}
            className='rounded-md bg-black py-2 text-sm font-semibold text-white hover:bg-gray-900 transition'
          >
            Done
          </button>
        </div>
      </div>
    </aside>
  )
}

export default ProductFilters
