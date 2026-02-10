'use client'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useCart } from '../../../context/CartContext'
import { getSeedProducts, mergeSeedAndDbProducts } from '../../../lib/catalog/seed-products'
import ProductFilters from '../ProductFilters'
import ProductGrid from '../ProductGrid'
import normalizeProduct from './normalizeProduct.mjs'
import ProductFiltersMobile from './ProductFiltersMobile'
import Link from 'next/link'
import BannerSlider from '@/components/layout/BannerSlider'
import FeaturedStrip from '@/components/layout/FeaturedStrip'
import HotspotProductSlider from '@/components/layout/HotspotProductSlider'
import LogoGrid from '@/components/layout/LogoGrid'
import { normalizeCategoryLayoutOrder } from '@/lib/layouts/category-layout'
import {
  buildDynamicAttributeSections,
  extractDynamicAttributeRows,
} from './productAttributeFilters.mjs'

const normalizeKey = (value) => String(value || '').trim().toLowerCase()

const buildFacetList = (values) => {
  const lookup = new Map()
  values.forEach((value) => {
    const key = normalizeKey(value)
    if (!key || lookup.has(key)) return
    lookup.set(key, String(value).trim())
  })
  return Array.from(lookup.values())
}

const formatShowingCount = (count) => {
  const value = Number(count) || 0
  if (value < 100) return `${value}+`
  if (value < 1000) return `${Math.floor(value / 100) * 100}+`
  const compact = Math.floor(value / 100) / 10
  return `${compact.toFixed(1).replace(/\\.0$/, '')}k+`
}

const PAGE_SIZE = 10

const ProductCatalogPage = ({
  products,
  title = 'Products',
  subtitle = '',
  parentCategory = null,
  childCategories = [],
  hotspotLayouts = [],
  logoGrid = null,
  listingQuery = {},
}) => {
  const { addItem } = useCart()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState(() => new Set())
  const [selectedVendors, setSelectedVendors] = useState(() => new Set())
  const [selectedColors, setSelectedColors] = useState(() => new Set())
  const [selectedSizes, setSelectedSizes] = useState(() => new Set())
  const [selectedDynamicFilters, setSelectedDynamicFilters] = useState({})
  const [sortValue, setSortValue] = useState('default')
  const [loadedProducts, setLoadedProducts] = useState(() =>
    Array.isArray(products) ? products : []
  )
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreFromServer, setHasMoreFromServer] = useState(
    Array.isArray(products) ? products.length >= PAGE_SIZE : false
  )
  const loadMoreRef = useRef(null)

  useEffect(() => {
    const initial = Array.isArray(products) ? products : []
    setLoadedProducts(initial)
    setCurrentPage(1)
    setHasMoreFromServer(initial.length >= PAGE_SIZE)
  }, [products, listingQuery?.category, listingQuery?.tag, listingQuery?.search, listingQuery?.vendor])

  const source = useMemo(() => {
    const seedProducts = getSeedProducts()
    const hasSeedProducts = Array.isArray(loadedProducts)
      ? loadedProducts.some((item) => String(item?.id || '').startsWith('seed-'))
      : false
    return Array.isArray(loadedProducts) && loadedProducts.length
      ? hasSeedProducts
        ? loadedProducts
        : mergeSeedAndDbProducts(seedProducts, loadedProducts, { dbFirst: true })
      : seedProducts
  }, [loadedProducts])

  const normalized = useMemo(
    () => (Array.isArray(source) ? source.map(normalizeProduct) : []),
    [source]
  )

  const categories = useMemo(
    () => buildFacetList(normalized.map((product) => product.category)),
    [normalized]
  )
  const vendors = useMemo(
    () => buildFacetList(normalized.map((product) => product.vendor)),
    [normalized]
  )
  const colors = useMemo(
    () => buildFacetList(normalized.flatMap((product) => product.colors || [])),
    [normalized]
  )
  const sizes = useMemo(
    () => buildFacetList(normalized.flatMap((product) => product.sizes || [])),
    [normalized]
  )
  const dynamicFilterSections = useMemo(
    () => buildDynamicAttributeSections(normalized),
    [normalized]
  )

  useEffect(() => {
    setSelectedDynamicFilters((prev) => {
      const next = {}
      dynamicFilterSections.forEach((section) => {
        next[section.key] = prev[section.key] ? new Set(prev[section.key]) : new Set()
      })
      return next
    })
  }, [dynamicFilterSections])
  const priceList = useMemo(
    () =>
      normalized
        .map((product) => Number(product.price))
        .filter((value) => Number.isFinite(value)),
    [normalized]
  )

  const priceBounds = useMemo(() => {
    const prices = normalized
      .map((product) => Number(product.price))
      .filter((value) => Number.isFinite(value))
    if (!prices.length) return { min: 0, max: 0 }
    return { min: Math.min(...prices), max: Math.max(...prices) }
  }, [normalized])

  const [priceRange, setPriceRange] = useState(priceBounds)

  useEffect(() => {
    setPriceRange(priceBounds)
  }, [priceBounds.min, priceBounds.max])

  const toggleValue = (setter, value) => {
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(value)) {
        next.delete(value)
      } else {
        next.add(value)
      }
      return next
    })
  }

  const selectedCategoryKeys = useMemo(
    () => new Set([...selectedCategories].map(normalizeKey)),
    [selectedCategories]
  )
  const selectedVendorKeys = useMemo(
    () => new Set([...selectedVendors].map(normalizeKey)),
    [selectedVendors]
  )
  const selectedColorKeys = useMemo(
    () => new Set([...selectedColors].map(normalizeKey)),
    [selectedColors]
  )
  const selectedSizeKeys = useMemo(
    () => new Set([...selectedSizes].map(normalizeKey)),
    [selectedSizes]
  )
  const selectedDynamicKeys = useMemo(() => {
    const map = {}
    dynamicFilterSections.forEach((section) => {
      map[section.key] = new Set(
        [...(selectedDynamicFilters[section.key] || new Set())].map(normalizeKey)
      )
    })
    return map
  }, [dynamicFilterSections, selectedDynamicFilters])

  const filteredProducts = useMemo(() => {
    return normalized.filter((product) => {
      const categoryKey = normalizeKey(product.category)
      if (selectedCategoryKeys.size && !selectedCategoryKeys.has(categoryKey)) {
        return false
      }

      const vendorKey = normalizeKey(product.vendor)
      if (selectedVendorKeys.size && !selectedVendorKeys.has(vendorKey)) {
        return false
      }

      if (selectedColorKeys.size) {
        const productColors = Array.isArray(product.colors) ? product.colors : []
        const hasMatch = productColors.some((color) =>
          selectedColorKeys.has(normalizeKey(color))
        )
        if (!hasMatch) return false
      }

      if (selectedSizeKeys.size) {
        const productSizes = Array.isArray(product.sizes) ? product.sizes : []
        const hasMatch = productSizes.some((size) =>
          selectedSizeKeys.has(normalizeKey(size))
        )
        if (!hasMatch) return false
      }

      const priceValue = Number(product.price) || 0
      if (priceValue < priceRange.min || priceValue > priceRange.max) {
        return false
      }

      if (dynamicFilterSections.length) {
        const attributeRows = extractDynamicAttributeRows(product)
        const valuesByKey = new Map()
        attributeRows.forEach((row) => {
          const existing = valuesByKey.get(row.key) || []
          existing.push(normalizeKey(row.value))
          valuesByKey.set(row.key, existing)
        })

        for (const section of dynamicFilterSections) {
          const selectedValues = selectedDynamicKeys[section.key]
          if (!selectedValues || !selectedValues.size) continue
          const productValues = valuesByKey.get(section.key) || []
          const hasMatch = productValues.some((value) => selectedValues.has(value))
          if (!hasMatch) return false
        }
      }

      return true
    })
  }, [
    normalized,
    selectedCategoryKeys,
    selectedVendorKeys,
    selectedColorKeys,
    selectedSizeKeys,
    dynamicFilterSections,
    selectedDynamicKeys,
    priceRange.min,
    priceRange.max,
  ])

  const sortedProducts = useMemo(() => {
    const items = [...filteredProducts]
    if (sortValue === 'newest') {
      items.sort((a, b) => {
        const aTime = new Date(a?.createdAt || 0).getTime()
        const bTime = new Date(b?.createdAt || 0).getTime()
        return bTime - aTime
      })
      return items
    }
    if (sortValue === 'price_asc') {
      items.sort((a, b) => (Number(a?.price) || 0) - (Number(b?.price) || 0))
      return items
    }
    if (sortValue === 'price_desc') {
      items.sort((a, b) => (Number(b?.price) || 0) - (Number(a?.price) || 0))
      return items
    }
    if (sortValue === 'name_asc') {
      items.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')))
      return items
    }
    if (sortValue === 'name_desc') {
      items.sort((a, b) => String(b?.name || '').localeCompare(String(a?.name || '')))
      return items
    }
    return items
  }, [filteredProducts, sortValue])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const target = loadMoreRef.current
    if (!target || !hasMoreFromServer || isLoadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting || isLoadingMore) return
        setIsLoadingMore(true)

        const nextPage = currentPage + 1
        const params = new URLSearchParams({
          page: String(nextPage),
          per_page: String(PAGE_SIZE),
        })
        if (listingQuery?.category) params.set('category', String(listingQuery.category))
        if (listingQuery?.tag) params.set('tag', String(listingQuery.tag))
        if (listingQuery?.search) params.set('search', String(listingQuery.search))
        if (listingQuery?.vendor) params.set('vendor', String(listingQuery.vendor))

        fetch(`/api/products?${params.toString()}`)
          .then((response) => response.json().catch(() => null))
          .then((payload) => {
            const nextItems = Array.isArray(payload?.items) ? payload.items : []
            if (!nextItems.length) {
              setHasMoreFromServer(false)
              setCurrentPage(nextPage)
              return
            }

            setLoadedProducts((prev) => {
              const existing = new Set(prev.map((item) => String(item?.id || item?.slug || '')))
              const fresh = nextItems.filter((item) => {
                const key = String(item?.id || item?.slug || '')
                if (!key || existing.has(key)) return false
                existing.add(key)
                return true
              })
              if (!fresh.length) {
                setHasMoreFromServer(false)
                return prev
              }
              return [...prev, ...fresh]
            })
            setCurrentPage(nextPage)
            if (nextItems.length < PAGE_SIZE) {
              setHasMoreFromServer(false)
            }
          })
          .catch(() => {
            setHasMoreFromServer(false)
          })
          .finally(() => {
            setIsLoadingMore(false)
          })
      },
      { root: null, rootMargin: '240px 0px', threshold: 0.01 }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [
    currentPage,
    hasMoreFromServer,
    isLoadingMore,
    listingQuery?.category,
    listingQuery?.tag,
    listingQuery?.search,
    listingQuery?.vendor,
  ])

  const handleClear = () => {
    setSelectedCategories(new Set())
    setSelectedVendors(new Set())
    setSelectedColors(new Set())
    setSelectedSizes(new Set())
    setSelectedDynamicFilters(
      dynamicFilterSections.reduce((acc, section) => {
        acc[section.key] = new Set()
        return acc
      }, {})
    )
    setPriceRange(priceBounds)
  }

  const hasActivePrice =
    priceRange.min !== priceBounds.min || priceRange.max !== priceBounds.max
  const activeChips = []
  selectedCategories.forEach((value) =>
    activeChips.push({ label: value, type: 'category', value })
  )
  selectedVendors.forEach((value) => activeChips.push({ label: value, type: 'vendor', value }))
  selectedColors.forEach((value) => activeChips.push({ label: value, type: 'color', value }))
  selectedSizes.forEach((value) => activeChips.push({ label: value, type: 'size', value }))
  dynamicFilterSections.forEach((section) => {
    const selectedSet = selectedDynamicFilters[section.key] || new Set()
    selectedSet.forEach((value) => {
      activeChips.push({
        label: `${section.label}: ${value}`,
        type: 'dynamic',
        sectionKey: section.key,
        value,
      })
    })
  })
  if (hasActivePrice) {
    activeChips.push({
      label: `Price: $${priceRange.min} – $${priceRange.max}`,
      type: 'price',
      value: 'price',
    })
  }

  const handleChipRemove = (chip) => {
    switch (chip.type) {
      case 'category':
        setSelectedCategories((prev) => {
          const next = new Set(prev)
          next.delete(chip.value)
          return next
        })
        break
      case 'vendor':
        setSelectedVendors((prev) => {
          const next = new Set(prev)
          next.delete(chip.value)
          return next
        })
        break
      case 'color':
        setSelectedColors((prev) => {
          const next = new Set(prev)
          next.delete(chip.value)
          return next
        })
        break
      case 'size':
        setSelectedSizes((prev) => {
          const next = new Set(prev)
          next.delete(chip.value)
          return next
        })
        break
      case 'price':
        setPriceRange(priceBounds)
        break
      case 'dynamic':
        setSelectedDynamicFilters((prev) => {
          const next = { ...prev }
          const sectionSet = new Set(next[chip.sectionKey] || [])
          sectionSet.delete(chip.value)
          next[chip.sectionKey] = sectionSet
          return next
        })
        break
      default:
    }
  }

  const handleAddToCart = (productData) => {
    addItem(productData, 1)
  }

  const bannerWideImages = useMemo(() => {
    const raw = Array.isArray(parentCategory?.banner_slider_urls)
      ? parentCategory.banner_slider_urls
      : []
    const normalized = raw
      .map((entry) =>
        typeof entry === 'string' ? entry : entry?.url || entry?.image_url || null,
      )
      .filter(Boolean)
    if (!normalized.length && parentCategory?.banner_image_url) {
      return [parentCategory.banner_image_url]
    }
    return normalized
  }, [parentCategory?.banner_slider_urls, parentCategory?.banner_image_url])

  const layoutOrder = useMemo(
    () => normalizeCategoryLayoutOrder(parentCategory?.layout_order),
    [parentCategory?.layout_order],
  )

  const desktopStripRef = useRef(null)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const cleanTitle = String(title || '').trim() || 'Products'
  const cleanSubtitle = String(subtitle || '').trim()
  const showingLabel = formatShowingCount(sortedProducts.length)
  const desktopFilterGridRef = useRef(null)
  const desktopFilterColRef = useRef(null)
  const desktopFilterPanelRef = useRef(null)
  const [desktopFilterState, setDesktopFilterState] = useState({
    mode: 'static',
    left: 0,
    width: 0,
    height: 0,
    placeholder: 0,
  })

  useEffect(() => {
    const el = desktopStripRef.current
    if (!el) return
    const update = () => {
      setCanScrollLeft(el.scrollLeft > 4)
      setCanScrollRight(el.scrollWidth - el.clientWidth - el.scrollLeft > 4)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    el.addEventListener('scroll', update, { passive: true })
    return () => {
      observer.disconnect()
      el.removeEventListener('scroll', update)
    }
  }, [childCategories])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const topOffset = 96
    let rafId = 0

    const updateDesktopFilterPosition = () => {
      const gridEl = desktopFilterGridRef.current
      const colEl = desktopFilterColRef.current
      const panelEl = desktopFilterPanelRef.current
      if (!gridEl || !colEl || !panelEl) return

      if (window.innerWidth < 1024) {
        setDesktopFilterState((prev) =>
          prev.mode === 'static'
            ? prev
            : { mode: 'static', left: 0, width: 0, height: 0, placeholder: 0 }
        )
        return
      }

      const gridRect = gridEl.getBoundingClientRect()
      const colRect = colEl.getBoundingClientRect()
      const panelRect = panelEl.getBoundingClientRect()
      const panelHeight = Math.round(panelRect.height || panelEl.scrollHeight || 0)
      const maxHeight = Math.max(320, window.innerHeight - topOffset - 16)
      const clampedHeight = Math.min(panelHeight || maxHeight, maxHeight)
      const nextLeft = Math.round(colRect.left)
      const nextWidth = Math.round(colRect.width)

      let nextMode = 'static'
      if (gridRect.top <= topOffset) {
        nextMode =
          gridRect.bottom <= topOffset + clampedHeight + 16 ? 'bottom' : 'fixed'
      }

      const nextState = {
        mode: nextMode,
        left: nextLeft,
        width: nextWidth,
        height: clampedHeight,
        placeholder: clampedHeight,
      }

      setDesktopFilterState((prev) => {
        const hasChanged =
          prev.mode !== nextState.mode ||
          prev.left !== nextState.left ||
          prev.width !== nextState.width ||
          prev.height !== nextState.height ||
          prev.placeholder !== nextState.placeholder
        return hasChanged ? nextState : prev
      })
    }

    const onChange = () => {
      window.cancelAnimationFrame(rafId)
      rafId = window.requestAnimationFrame(updateDesktopFilterPosition)
    }

    onChange()
    window.addEventListener('scroll', onChange, { passive: true })
    window.addEventListener('resize', onChange)

    const resizeObserver = new ResizeObserver(onChange)
    if (desktopFilterGridRef.current) resizeObserver.observe(desktopFilterGridRef.current)
    if (desktopFilterColRef.current) resizeObserver.observe(desktopFilterColRef.current)
    if (desktopFilterPanelRef.current) resizeObserver.observe(desktopFilterPanelRef.current)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', onChange)
      window.removeEventListener('resize', onChange)
      resizeObserver.disconnect()
    }
  }, [filteredProducts.length])

  const scrollByAmount = (dir = 1) => {
    const el = desktopStripRef.current
    if (!el) return
    const delta = dir * el.clientWidth * 0.9
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }

  if (!normalized.length) {
    return <div>No products available</div>
  }

  const bannerSection = bannerWideImages.length ? (
    <div className='mb-8'>
      {/* Banner Slider - Full width on mobile, framed on tablet+ */}
      <div className='relative overflow-hidden aspect-[16/9] md:aspect-[21/9] md:max-h-[320px] lg:max-h-[360px] xl:max-h-[400px] mobile-full-bleed md:w-full md:rounded-3xl md:border md:border-gray-200 md:bg-white'>
        <BannerSlider
          images={bannerWideImages}
          title={parentCategory?.banner_title || parentCategory?.name || 'Banner'}
          className='md:rounded-3xl'
          heightClass='h-full'
          enforceAspect={false}
          autoMs={3000}
        />
        <div className='pointer-events-none absolute inset-0 md:rounded-3xl bg-gradient-to-r from-black/45 via-black/15 to-transparent' />
        <div className='absolute inset-0 flex flex-col justify-center gap-3 px-4 py-6 sm:px-8 pointer-events-none'>
          {parentCategory?.banner_title && (
            <h2 className='text-xl sm:text-2xl font-bold leading-tight text-white drop-shadow'>
              {parentCategory.banner_title}
            </h2>
          )}
          {parentCategory?.banner_subtitle && (
            <p className='max-w-xl text-xs sm:text-sm text-white/90 drop-shadow'>
              {parentCategory.banner_subtitle}
            </p>
          )}
          {parentCategory?.banner_cta_link && (
            <div className='pointer-events-auto'>
              <Link
                href={parentCategory.banner_cta_link}
                className='inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-gray-900 shadow-sm transition hover:translate-y-[1px] hover:shadow'
              >
                {parentCategory.banner_cta_text || 'Shop now'}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null

  const hotspotSection =
    Array.isArray(hotspotLayouts) && hotspotLayouts.length > 0 ? (
      <HotspotProductSlider
        layouts={hotspotLayouts}
        titleMain={parentCategory?.hotspot_title_main}
      />
    ) : null

  const logoGridSection =
    logoGrid?.items && logoGrid.items.length > 0 ? (
      <LogoGrid
        title={logoGrid.title}
        titleBgColor={logoGrid.title_bg_color}
        titleTextColor={logoGrid.title_text_color}
        items={logoGrid.items}
      />
    ) : null

  const featuredStripSection =
    parentCategory?.featured_strip_image_url &&
    (parentCategory?.featured_strip_tag_id ||
      parentCategory?.featured_strip_category_id) ? (
      <FeaturedStrip
        imageUrl={parentCategory.featured_strip_image_url}
        imageAlt={parentCategory?.banner_title || parentCategory?.name || 'Featured'}
        products={normalized}
        tagId={parentCategory.featured_strip_tag_id}
        categoryId={parentCategory.featured_strip_category_id}
        onAddToCart={addItem}
        titleMain={parentCategory?.featured_strip_title_main}
      />
    ) : null

  const orderedSections = layoutOrder
    .map((key) => ({
      key,
      element:
        key === 'banner'
          ? bannerSection
          : key === 'hotspot'
            ? hotspotSection
            : key === 'logo_grid'
              ? logoGridSection
              : key === 'featured_strip'
                ? featuredStripSection
                : null,
    }))
    .filter((entry) => !!entry.element)

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='mx-auto max-w-7xl px-3 pb-10 pt-6'>
        {Array.isArray(childCategories) && childCategories.length > 0 && (
          <>
            {/* Mobile: horizontal strip */}
            <div className='mb-4 overflow-x-auto lg:hidden'>
              <div className='flex items-start gap-4 min-w-full px-1'>
                {childCategories.map((cat) => (
                  <a
                    key={cat.id}
                    href={`/products/${encodeURIComponent(cat.slug || '')}`}
                    className='flex flex-col items-center gap-2 transition'
                    style={{ minWidth: '100px' }}
                  >
                    <div className='h-16 w-16 overflow-hidden rounded-full bg-gray-50'>
                      {cat.image_url ? (
                        <img
                          src={cat.image_url}
                          alt={cat.image_alt || cat.name}
                          className='h-full w-full object-cover'
                        />
                      ) : (
                        <div className='flex h-full w-full items-center justify-center text-[11px] text-gray-400'>
                          Image
                        </div>
                      )}
                    </div>
                    <span className='text-xs font-semibold text-gray-800 text-center leading-tight'>
                      {cat.name}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {/* Desktop: grid */}
            <div className='mb-6 hidden lg:block'>
              <div className='relative'>
                <div className='overflow-x-auto pr-16' ref={desktopStripRef}>
                  <div className='flex items-start gap-0 min-w-full'>
                    {childCategories.map((cat) => (
                      <a
                        key={cat.id}
                        href={`/products/${encodeURIComponent(cat.slug || '')}`}
                        className='flex flex-col items-center gap-2 transition'
                        style={{ minWidth: '100px' }}
                      >
                        <div className='h-20 w-20 overflow-hidden rounded-full bg-gray-50'>
                          {cat.image_url ? (
                            <img
                              src={cat.image_url}
                              alt={cat.image_alt || cat.name}
                              className='h-full w-full object-cover'
                            />
                          ) : (
                            <div className='flex h-full w-full items-center justify-center text-[11px] text-gray-400'>
                              Image
                            </div>
                          )}
                        </div>
                        <span className='text-xs font-semibold text-gray-800 text-center leading-tight break-words max-w-[100px]'>
                          {cat.name}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
                {canScrollRight && (
                  <button
                    type='button'
                    onClick={() => scrollByAmount(1)}
                    className='absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-700 hover:text-gray-900'
                    aria-label='Scroll categories right'
                  >
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      viewBox='0 0 24 24'
                      className='h-5 w-5'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    >
                      <path d='M9 18l6-6-6-6' />
                    </svg>
                  </button>
                )}
                {canScrollLeft && (
                  <button
                    type='button'
                    onClick={() => scrollByAmount(-1)}
                    className='absolute left-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-700 hover:text-gray-900'
                    aria-label='Scroll categories left'
                  >
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      viewBox='0 0 24 24'
                      className='h-5 w-5'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    >
                      <path d='M15 18l-6-6 6-6' />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {orderedSections.map(({ key, element }) => (
          <Fragment key={key}>{element}</Fragment>
        ))}

        <div className='mb-6'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>{cleanTitle}</h1>
          {cleanSubtitle && <p className='text-gray-600'>{cleanSubtitle}</p>}
        </div>

        {activeChips.length > 0 && (
          <div className='mb-4 flex flex-col gap-2 text-sm'>
            <div className='text-gray-700 font-semibold text-xs uppercase tracking-wide'>
              Active Filters
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              {activeChips.map((chip) => (
                <button
                  key={`${chip.type}-${chip.value}`}
                  className='inline-flex items-center gap-2 rounded-full bg-[#3b2414] px-3 py-1 text-xs font-semibold text-white'
                  onClick={() => handleChipRemove(chip)}
                >
                  <span>{chip.label}</span>
                  <span className='text-white/80'>×</span>
                </button>
              ))}
              <button
                type='button'
                onClick={handleClear}
                className='text-xs font-semibold text-gray-700 underline underline-offset-2'
              >
                Clear All
              </button>
            </div>
          </div>
        )}

        <div ref={desktopFilterGridRef} className='mt-6 grid gap-6 lg:grid-cols-[260px_1fr]'>
          <aside
            ref={desktopFilterColRef}
            className='hidden lg:block lg:relative'
            style={
              desktopFilterState.mode === 'static'
                ? undefined
                : { minHeight: `${desktopFilterState.placeholder}px` }
            }
          >
            <div
              ref={desktopFilterPanelRef}
              className='lg:z-20'
              style={
                desktopFilterState.mode === 'fixed'
                  ? {
                      position: 'fixed',
                      top: '96px',
                      left: `${desktopFilterState.left}px`,
                      width: `${desktopFilterState.width}px`,
                      height: `${desktopFilterState.height}px`,
                    }
                  : desktopFilterState.mode === 'bottom'
                    ? {
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        width: '100%',
                        height: `${desktopFilterState.height}px`,
                      }
                    : undefined
              }
            >
              <ProductFilters
                categories={categories}
                vendors={vendors}
                colors={colors}
                sizes={sizes}
                priceList={priceList}
                priceBounds={priceBounds}
                priceRange={priceRange}
                selectedCategories={selectedCategories}
                selectedVendors={selectedVendors}
              selectedColors={selectedColors}
              selectedSizes={selectedSizes}
              dynamicSections={dynamicFilterSections}
              selectedDynamic={selectedDynamicFilters}
              onToggleCategory={(value) => toggleValue(setSelectedCategories, value)}
              onToggleVendor={(value) => toggleValue(setSelectedVendors, value)}
              onToggleColor={(value) => toggleValue(setSelectedColors, value)}
              onToggleSize={(value) => toggleValue(setSelectedSizes, value)}
              onToggleDynamic={(sectionKey, value) =>
                setSelectedDynamicFilters((prev) => {
                  const next = { ...prev }
                  const sectionSet = new Set(next[sectionKey] || [])
                  if (sectionSet.has(value)) sectionSet.delete(value)
                  else sectionSet.add(value)
                  next[sectionKey] = sectionSet
                  return next
                })
              }
              onClearCategory={() => setSelectedCategories(new Set())}
              onClearVendor={() => setSelectedVendors(new Set())}
              onClearColor={() => setSelectedColors(new Set())}
              onClearSize={() => setSelectedSizes(new Set())}
              onClearDynamic={(sectionKey) =>
                setSelectedDynamicFilters((prev) => ({
                  ...prev,
                  [sectionKey]: new Set(),
                }))
              }
              onPriceChange={setPriceRange}
              onClear={handleClear}
                onClose={null}
                onDone={() => {}}
                showClose={false}
                showFooter={false}
              />
            </div>
          </aside>

          <div>
            <div className='flex items-center justify-between px-3 pb-2'>
              <div className='text-base font-semibold text-gray-900'>
                Showing <span className='font-medium text-gray-500'>{showingLabel}</span>
              </div>
              <button
                type='button'
                onClick={() => setFiltersOpen(true)}
                className='rounded border border-gray-300 px-2 py-0.5 text-xs font-semibold text-gray-700 lg:hidden'
              >
                Filters
              </button>
              <div className='hidden items-center gap-1.5 text-xs text-gray-600 lg:flex'>
                <span>Sort by</span>
                <select
                  value={sortValue}
                  onChange={(event) => setSortValue(event.target.value)}
                  className='rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300'
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
            {sortedProducts.length ? (
              <>
                <ProductGrid
                  products={sortedProducts}
                  onAddToCart={handleAddToCart}
                  className='grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
                />
                {hasMoreFromServer && (
                  <div
                    ref={loadMoreRef}
                    className='flex items-center justify-center py-4 text-xs text-gray-500'
                  >
                    {isLoadingMore ? 'Loading more products...' : 'Scroll for more'}
                  </div>
                )}
              </>
            ) : (
              <div className='rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-600'>
                No products match these filters.
              </div>
            )}
          </div>
        </div>
      </div>

      {filtersOpen && (
        <div className='fixed inset-0 z-[9999] lg:hidden'>
          <div
            className='absolute inset-0 bg-black/30'
            onClick={() => setFiltersOpen(false)}
          />
          <div className='absolute right-0 top-0 h-full w-full bg-white shadow-xl'>
            <ProductFiltersMobile
              categories={categories}
              vendors={vendors}
              colors={colors}
              sizes={sizes}
              priceBounds={priceBounds}
              priceRange={priceRange}
              selectedCategories={selectedCategories}
              selectedVendors={selectedVendors}
              selectedColors={selectedColors}
              selectedSizes={selectedSizes}
              dynamicSections={dynamicFilterSections}
              selectedDynamic={selectedDynamicFilters}
              onToggleCategory={(value) => toggleValue(setSelectedCategories, value)}
              onToggleVendor={(value) => toggleValue(setSelectedVendors, value)}
              onToggleColor={(value) => toggleValue(setSelectedColors, value)}
              onToggleSize={(value) => toggleValue(setSelectedSizes, value)}
              onToggleDynamic={(sectionKey, value) =>
                setSelectedDynamicFilters((prev) => {
                  const next = { ...prev }
                  const sectionSet = new Set(next[sectionKey] || [])
                  if (sectionSet.has(value)) sectionSet.delete(value)
                  else sectionSet.add(value)
                  next[sectionKey] = sectionSet
                  return next
                })
              }
              sortValue={sortValue}
              onSortChange={setSortValue}
              onPriceChange={setPriceRange}
              onClear={handleClear}
              onClose={() => setFiltersOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductCatalogPage
