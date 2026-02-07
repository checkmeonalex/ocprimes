'use client'
import { useEffect, useState } from 'react'
import { getSwatchStyle } from './colorUtils.mjs'
import PriceRangeSlider from './filters/PriceRangeSlider'

const EMPTY_SET = new Set()

const FilterSection = ({
  title,
  items,
  selectedSet,
  onToggle,
  initialVisible = 6,
  renderItem,
  isOpen,
  onToggleSection,
  onClearSection,
}) => {
  const [showAll, setShowAll] = useState(false)
  const visibleItems = showAll ? items : items.slice(0, initialVisible)
  const canClear = Boolean(onClearSection) && selectedSet.size > 0

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
          {canClear && (
            <button
              type='button'
              onClick={onClearSection}
              className='flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900 transition'
            >
              <span className='text-base leading-none'>&lsaquo;</span>
              <span>Clear</span>
            </button>
          )}
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
  dynamicSections = [],
  selectedDynamic = {},
  onToggleCategory,
  onToggleVendor,
  onToggleColor,
  onToggleSize,
  onToggleDynamic,
  onClearCategory,
  onClearVendor,
  onClearColor,
  onClearSize,
  onClearDynamic,
  onPriceChange,
  onClear,
  onClose,
  onDone,
  showClose = true,
  showFooter = true,
}) => {
  const [openSections, setOpenSections] = useState({
    categories: true,
    brand: true,
    color: true,
    size: true,
    price: true,
  })

  const toggleSection = (key) =>
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))

  useEffect(() => {
    if (!dynamicSections.length) return
    setOpenSections((prev) => {
      let changed = false
      const next = { ...prev }
      dynamicSections.forEach((section) => {
        if (next[section.key] === undefined) {
          next[section.key] = true
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [dynamicSections])

  return (
    <aside className='flex h-full flex-col bg-white'>
      <div className='flex items-center justify-between border-b border-gray-200 px-4 py-3'>
        {showClose ? (
          <button
            type='button'
            onClick={onClose}
            className='text-gray-500 hover:text-gray-700 transition'
            aria-label='Close filters'
          >
            ✕
          </button>
        ) : (
          <span className='w-6' />
        )}
        <h2 className='text-sm font-semibold text-gray-900'>Filter</h2>
        <span className='w-6' />
      </div>

      <div className='thin-scrollbar flex-1 overflow-y-auto px-4'>
        <FilterSection
          title='Category'
          items={categories}
          selectedSet={selectedCategories}
          onToggle={onToggleCategory}
          onClearSection={onClearCategory}
          isOpen={openSections.categories}
          onToggleSection={() => toggleSection('categories')}
        />
        <FilterSection
          title='Brand'
          items={vendors}
          selectedSet={selectedVendors}
          onToggle={onToggleVendor}
          onClearSection={onClearVendor}
          isOpen={openSections.brand}
          onToggleSection={() => toggleSection('brand')}
        />
        <FilterSection
          title='Color'
          items={colors}
          selectedSet={selectedColors}
          onToggle={onToggleColor}
          onClearSection={onClearColor}
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
          onToggleSection={() => toggleSection('color')}
        />
        <FilterSection
          title='Size'
          items={sizes}
          selectedSet={selectedSizes}
          onToggle={onToggleSize}
          onClearSection={onClearSize}
          isOpen={openSections.size}
          onToggleSection={() => toggleSection('size')}
        />
        {dynamicSections.map((section) => {
          return (
            <FilterSection
              key={section.key}
              title={section.label}
              items={section.items}
              selectedSet={selectedDynamic[section.key] || EMPTY_SET}
              onToggle={(value) => onToggleDynamic(section.key, value)}
              onClearSection={() => onClearDynamic(section.key)}
              isOpen={Boolean(openSections[section.key])}
              onToggleSection={() => toggleSection(section.key)}
            />
          )
        })}

        <div className='border-b border-gray-200 py-3'>
          <button
            type='button'
            onClick={() =>
              setOpenSections((prev) => ({ ...prev, price: !prev.price }))
            }
            className='flex w-full items-center justify-between text-sm font-semibold text-gray-900'
          >
            <span>Price Range (USD)</span>
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
            <div className='mt-4'>
              <PriceRangeSlider
                priceBounds={priceBounds}
                priceRange={priceRange}
                onPriceChange={onPriceChange}
              />
            </div>
          )}
        </div>
      </div>

      {showFooter && (
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
      )}
    </aside>
  )
}

export default ProductFilters
