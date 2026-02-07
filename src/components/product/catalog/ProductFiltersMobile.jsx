'use client'
import { useMemo, useState } from 'react'
import PriceRangeSlider from '../filters/PriceRangeSlider'
import { getSwatchStyle } from '../colorUtils.mjs'

const ProductFiltersMobile = ({
  categories,
  vendors,
  colors,
  sizes,
  dynamicSections = [],
  priceList = [],
  priceBounds,
  priceRange,
  selectedCategories,
  selectedVendors,
  selectedColors,
  selectedSizes,
  selectedDynamic = {},
  onToggleCategory,
  onToggleVendor,
  onToggleColor,
  onToggleSize,
  onToggleDynamic,
  sortValue = 'default',
  onSortChange,
  onPriceChange,
  onClear,
  onClose,
}) => {
  const [activeSection, setActiveSection] = useState('category')

  const totalSelected = useMemo(
    () => {
      const dynamicCount = dynamicSections.reduce(
        (sum, section) => sum + (selectedDynamic[section.key] || new Set()).size,
        0
      )
      return (
        selectedCategories.size +
        selectedVendors.size +
        selectedColors.size +
        selectedSizes.size +
        dynamicCount
      )
    },
    [
      selectedCategories,
      selectedVendors,
      selectedColors,
      selectedSizes,
      dynamicSections,
      selectedDynamic,
    ]
  )

  const sections = [
    { key: 'category', label: 'Category', count: selectedCategories.size },
    { key: 'brand', label: 'Brands', count: selectedVendors.size },
    { key: 'color', label: 'Color', count: selectedColors.size },
    { key: 'size', label: 'Sizes', count: selectedSizes.size },
    ...dynamicSections.map((section) => ({
      key: section.key,
      label: section.label,
      count: (selectedDynamic[section.key] || new Set()).size,
    })),
    { key: 'price', label: 'Price', count: 0 },
  ]

  const renderChips = (items, selectedSet, onToggle, withSwatch = false) => {
    if (!items.length) {
      return <p className='text-xs text-gray-500'>No options</p>
    }

    return (
      <div className='grid grid-cols-2 gap-2'>
        {items.map((item) => {
          const isSelected = selectedSet.has(item)
          return (
            <button
              key={item}
              type='button'
              onClick={() => onToggle(item)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                isSelected
                  ? 'border-black bg-black text-white'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className='flex items-center gap-2'>
                {withSwatch && (
                  <span
                    className='h-3.5 w-3.5 rounded-full border border-gray-300'
                    style={getSwatchStyle(item)}
                  />
                )}
                <span>{item}</span>
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  const priceSuggestions = useMemo(() => {
    const min = Number.isFinite(priceBounds.min) ? priceBounds.min : 0
    const max = Number.isFinite(priceBounds.max) ? priceBounds.max : 0
    if (max <= min) return []

    const span = max - min
    const a = Math.round(min + span * 0.1)
    const b = Math.round(min + span * 0.3)
    const c = Math.round(min + span * 0.5)

    const formatLabel = (value) => `$${Number(value).toLocaleString()}`

    return [
      { label: `${formatLabel(min)} - ${formatLabel(a)}`, range: { min, max: a } },
      { label: `${formatLabel(a)} - ${formatLabel(b)}`, range: { min: a, max: b } },
      { label: `${formatLabel(b)} - ${formatLabel(c)}`, range: { min: b, max: c } },
      { label: `${formatLabel(c)} - ${formatLabel(max)}`, range: { min: c, max } },
    ]
  }, [priceBounds.min, priceBounds.max])

  const isRangeSelected = (range) =>
    priceRange.min === range.min && priceRange.max === range.max

  const renderSectionContent = () => {
    const renderPriceSection = () => (
      <div className='space-y-4'>
        {priceSuggestions.length > 0 && (
          <div className='space-y-2'>
            {priceSuggestions.map((item) => {
              const selected = isRangeSelected(item.range)
              return (
                <button
                  key={item.label}
                  type='button'
                  onClick={() => onPriceChange(item.range)}
                  className='flex w-full items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-gray-300 transition'
                  aria-pressed={selected}
                >
                  <span className='flex items-center gap-2'>
                    <span
                      className={`h-3 w-3 rounded-full border ${
                        selected ? 'border-black bg-black' : 'border-gray-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
        <PriceRangeSlider
          priceBounds={priceBounds}
          priceRange={priceRange}
          onPriceChange={onPriceChange}
        />
      </div>
    )

    switch (activeSection) {
      case 'category':
        return renderChips(categories, selectedCategories, onToggleCategory)
      case 'brand':
        return renderChips(vendors, selectedVendors, onToggleVendor)
      case 'color':
        return renderChips(colors, selectedColors, onToggleColor, true)
      case 'size':
        return renderChips(sizes, selectedSizes, onToggleSize)
      case 'price':
        return renderPriceSection()
      default: {
        const dynamicSection = dynamicSections.find((section) => section.key === activeSection)
        if (dynamicSection) {
          return renderChips(
            dynamicSection.items,
            selectedDynamic[dynamicSection.key] || new Set(),
            (value) => onToggleDynamic(dynamicSection.key, value)
          )
        }
        return null
      }
    }
  }

  return (
    <div className='flex h-full flex-col bg-white'>
      <div className='flex items-center justify-between border-b border-gray-200 px-4 py-3'>
        <h2 className='text-sm font-semibold text-gray-900'>
          {totalSelected ? `Filters (${totalSelected})` : 'Filters'}
        </h2>
        <button
          type='button'
          onClick={onClose}
          className='text-gray-500 hover:text-gray-700 transition'
          aria-label='Close filters'
        >
          ✕
        </button>
      </div>
      <div className='border-b border-gray-200 px-4 py-2'>
        <div className='flex items-center justify-between gap-2'>
          <span className='text-xs font-semibold text-gray-600'>Sort by</span>
          <select
            value={sortValue}
            onChange={(event) => onSortChange?.(event.target.value)}
            className='rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300'
            aria-label='Sort products'
          >
            <option value='default'>Featured</option>
            <option value='newest'>Newest Arrivals</option>
            <option value='price_asc'>Low to High</option>
            <option value='price_desc'>High to Low</option>
            <option value='name_asc'>Name (A-Z)</option>
            <option value='name_desc'>Name (Z-A)</option>
          </select>
        </div>
      </div>

      <div className='flex flex-1 overflow-hidden'>
        <aside className='w-28 shrink-0 border-r border-gray-200 bg-gray-50'>
          <div className='flex flex-col'>
            {sections.map((section) => {
              const isActive = section.key === activeSection
              return (
                <button
                  key={section.key}
                  type='button'
                  onClick={() => setActiveSection(section.key)}
                  className={`flex items-center justify-between px-3 py-3 text-left text-xs font-semibold transition ${
                    isActive
                      ? 'bg-white text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span>{section.label}</span>
                  {section.count > 0 && (
                    <span className='text-[10px] text-gray-400'>
                      {section.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </aside>

        <div className='flex-1 overflow-y-auto px-4 py-4'>
          <div className='space-y-4'>{renderSectionContent()}</div>
        </div>
      </div>

      <div className='border-t border-gray-200 px-4 py-3'>
        <div className='grid grid-cols-2 gap-3'>
          <button
            type='button'
            onClick={onClear}
            className='rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition'
          >
            Clear Filters
          </button>
          <button
            type='button'
            onClick={onClose}
            className='rounded-md bg-black py-2 text-sm font-semibold text-white hover:bg-gray-900 transition'
          >
            Show results
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductFiltersMobile
