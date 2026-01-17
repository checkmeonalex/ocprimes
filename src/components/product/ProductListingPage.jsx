'use client'
import { useEffect, useMemo, useState } from 'react'
import { productsData } from '../data/products'
import ProductFilters from './ProductFilters'
import ProductMasonry from './ProductMasonry'
import useWindowWidth from '../hooks/useWindowWidth'

const buildUniqueList = (items) =>
  Array.from(new Set(items.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  )

const toggleSetItem = (set, value) => {
  const next = new Set(set)
  if (next.has(value)) {
    next.delete(value)
  } else {
    next.add(value)
  }
  return next
}

const slugify = (value = '') =>
  value
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const safeDecode = (value) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const ProductListingPage = ({ initialCategorySlug = '' }) => {
  const filterOptions = useMemo(() => {
    const categories = buildUniqueList(productsData.map((p) => p.category))
    const vendors = buildUniqueList(productsData.map((p) => p.vendor))
    const colors = buildUniqueList(
      productsData.flatMap((p) => p.colors || [])
    )
    const sizes = buildUniqueList(productsData.flatMap((p) => p.sizes || []))
    return { categories, vendors, colors, sizes }
  }, [])

  const categorySlugMap = useMemo(() => {
    const map = new Map()
    filterOptions.categories.forEach((category) => {
      map.set(slugify(category), category)
    })
    return map
  }, [filterOptions.categories])

  const resolvedCategory = useMemo(() => {
    if (!initialCategorySlug) return ''
    const normalized = slugify(safeDecode(initialCategorySlug))
    return categorySlugMap.get(normalized) || ''
  }, [categorySlugMap, initialCategorySlug])

  const priceBounds = useMemo(() => {
    const prices = productsData
      .map((product) => product.price)
      .filter((price) => typeof price === 'number')
    if (!prices.length) return { min: 0, max: 0 }
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    }
  }, [])

  const [selectedCategories, setSelectedCategories] = useState(
    () => new Set(resolvedCategory ? [resolvedCategory] : [])
  )
  const [selectedVendors, setSelectedVendors] = useState(new Set())
  const [selectedColors, setSelectedColors] = useState(new Set())
  const [selectedSizes, setSelectedSizes] = useState(new Set())
  const [priceRange, setPriceRange] = useState({
    min: priceBounds.min,
    max: priceBounds.max,
  })
  const [showFilters, setShowFilters] = useState(false)
  const width = useWindowWidth()
  const isMobile = width < 1024

  useEffect(() => {
    setSelectedCategories(new Set(resolvedCategory ? [resolvedCategory] : []))
  }, [resolvedCategory])

  const filteredProducts = useMemo(() => {
    return productsData.filter((product) => {
      const price = typeof product.price === 'number' ? product.price : 0
      const matchesPrice =
        price >= priceRange.min && price <= priceRange.max
      const matchesCategory =
        selectedCategories.size === 0 ||
        selectedCategories.has(product.category)
      const matchesVendor =
        selectedVendors.size === 0 || selectedVendors.has(product.vendor)
      const matchesColor =
        selectedColors.size === 0 ||
        (product.colors || []).some((color) => selectedColors.has(color))
      const matchesSize =
        selectedSizes.size === 0 ||
        (product.sizes || []).some((size) => selectedSizes.has(size))

      return (
        matchesPrice &&
        matchesCategory &&
        matchesVendor &&
        matchesColor &&
        matchesSize
      )
    })
  }, [
    priceRange,
    selectedCategories,
    selectedVendors,
    selectedColors,
    selectedSizes,
  ])

  const handleAddToCart = (productData) => {
    console.log('Adding to cart:', productData)
  }

  const handleClear = () => {
    setSelectedCategories(new Set(resolvedCategory ? [resolvedCategory] : []))
    setSelectedVendors(new Set())
    setSelectedColors(new Set())
    setSelectedSizes(new Set())
    setPriceRange({ min: priceBounds.min, max: priceBounds.max })
  }

  const headerTitle = resolvedCategory
    ? `${resolvedCategory} Products`
    : 'All Products'
  const headerSubtitle = resolvedCategory
    ? 'Explore items in this category'
    : 'Browse the full collection'
  const showCategoryNotice = Boolean(initialCategorySlug && !resolvedCategory)

  return (
    <div className='min-h-screen flex'>
      <div className='flex-1 min-w-0'>
        <main className='lg:pl-16 min-h-screen bg-gray-50 overflow-x-hidden w-full'>
          <div className='main-container py-8'>
            <div className='mb-4'>
              <h1 className='text-3xl font-semibold text-gray-900'>
                {headerTitle}
              </h1>
              <p className='text-sm text-gray-500'>{headerSubtitle}</p>
              <p className='text-sm text-gray-500'>
                {filteredProducts.length} items available
              </p>
              {showCategoryNotice && (
                <div className='mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700'>
                  Category not found. Showing all products.
                </div>
              )}
            </div>

            <div className='mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3 text-sm text-gray-600'>
              <div className='flex items-center gap-2'>
                <span className='text-xs text-gray-400'>Recommend</span>
                <button
                  type='button'
                  className='inline-flex items-center gap-1 text-sm font-semibold text-gray-900'
                >
                  Most Popular
                  <svg
                    className='h-4 w-4'
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
                </button>
              </div>
              <div className='flex flex-wrap items-center gap-2 text-xs'>
                {['Category', 'Size', 'Color', 'Brand', 'Price'].map((label) => (
                  <button
                    key={label}
                    type='button'
                    onClick={() => setShowFilters(true)}
                    className='rounded-full border border-gray-200 px-3 py-1.5 text-gray-700 hover:bg-gray-50 transition'
                  >
                    {label}
                  </button>
                ))}
                <button
                  type='button'
                  onClick={() => setShowFilters(true)}
                  className='ml-2 inline-flex items-center gap-2 text-gray-700'
                >
                  Filter
                  <svg
                    className='h-4 w-4'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={1.8}
                      d='M4 6h16M7 12h10M10 18h4'
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className='min-w-0'>
              <ProductMasonry
                products={filteredProducts}
                onAddToCart={handleAddToCart}
              />
              {!filteredProducts.length && (
                <div className='mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600'>
                  No products match those filters. Try clearing some options.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      {showFilters && (
        <div className='fixed inset-0 z-50 bg-black/30'>
          <div
            className={`fixed inset-0 ${
              isMobile ? '' : 'sm:inset-y-6 sm:inset-x-16'
            } bg-white shadow-2xl`}
          >
            <ProductFilters
              categories={filterOptions.categories}
              vendors={filterOptions.vendors}
              colors={filterOptions.colors}
              sizes={filterOptions.sizes}
              priceBounds={priceBounds}
              priceRange={priceRange}
              selectedCategories={selectedCategories}
              selectedVendors={selectedVendors}
              selectedColors={selectedColors}
              selectedSizes={selectedSizes}
              onToggleCategory={(value) =>
                setSelectedCategories((prev) => toggleSetItem(prev, value))
              }
              onToggleVendor={(value) =>
                setSelectedVendors((prev) => toggleSetItem(prev, value))
              }
              onToggleColor={(value) =>
                setSelectedColors((prev) => toggleSetItem(prev, value))
              }
              onToggleSize={(value) =>
                setSelectedSizes((prev) => toggleSetItem(prev, value))
              }
              onPriceChange={setPriceRange}
              onClear={handleClear}
              onClose={() => setShowFilters(false)}
              onDone={() => setShowFilters(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductListingPage
