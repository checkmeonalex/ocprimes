'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useUserI18n } from '@/lib/i18n/useUserI18n'
import { useWishlist } from '@/context/WishlistContext'
import { getRecentlyViewed } from '@/lib/recently-viewed/storage'

function Stars({ rating }) {
  const r = Math.min(5, Math.max(0, Number(rating) || 0))
  return (
    <span className='flex items-center gap-0.5'>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`h-3 w-3 ${i <= Math.round(r) ? 'text-amber-400' : 'text-gray-200'}`} viewBox='0 0 20 20' fill='currentColor'>
          <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
        </svg>
      ))}
    </span>
  )
}

function FeedProductCard({ product }) {
  const { formatMoney } = useUserI18n()
  const { openSaveModal, isWishlisted } = useWishlist()
  const productId = product.id || product.slug || ''
  const wishlisted = isWishlisted(productId)

  const img = product.image || product.image_url ||
    (Array.isArray(product.images) ? product.images[0]?.url || product.images[0] : '') || ''
  const basePrice = Number(product.price) || 0
  const discountPrice = Number(product.discount_price) || 0
  const hasDiscount = discountPrice > 0 && discountPrice < basePrice
  const price = hasDiscount ? discountPrice : basePrice
  const originalPrice = hasDiscount ? basePrice : (Number(product.originalPrice) || 0)
  const discountPct = hasDiscount ? Math.round((1 - price / originalPrice) * 100) : 0
  const rating = Number(product.rating) || 0
  const vendorSlug = product.vendor?.slug || product.vendor_slug || product.store_slug || ''
  const productSlug = product.slug || ''
  const href = vendorSlug && productSlug ? `/${vendorSlug}/${productSlug}`
    : productSlug ? `/product/${productSlug}` : '#'

  return (
    <Link href={href} className='group block'>
      <div className='relative overflow-hidden rounded-xl aspect-square bg-gray-100'>
        {img ? (
          <img src={img} alt={product.name || ''} className='absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]' loading='lazy' />
        ) : (
          <div className='absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200' />
        )}

        {hasDiscount && (
          <span className='font-mono absolute top-2 left-2 z-10 rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-white leading-none'>-{discountPct}%</span>
        )}

        <button
          type='button'
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); openSaveModal(product) }}
          className='absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center transition-colors shadow-sm'
          aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          <svg
            className='h-3.5 w-3.5 transition-colors'
            fill={wishlisted ? 'currentColor' : 'none'}
            stroke='currentColor'
            strokeWidth='2'
            viewBox='0 0 24 24'
            style={{ color: wishlisted ? '#ef4444' : '#9ca3af' }}
          >
            <path strokeLinecap='round' strokeLinejoin='round' d='M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z' />
          </svg>
        </button>
      </div>

      <div className='mt-2.5 space-y-0.5'>
        <p className='text-sm font-normal text-gray-900 line-clamp-1 leading-snug'>{product.name}</p>
        <div className='flex items-center gap-2' style={{ fontFeatureSettings: '"tnum"' }}>
          <span className='font-mono text-sm font-semibold text-gray-900'>{formatMoney(price)}</span>
          {hasDiscount && <span className='font-mono text-xs font-normal text-gray-400 line-through'>{formatMoney(originalPrice)}</span>}
        </div>
        {rating > 0 && (
          <div className='flex items-center gap-1.5'>
            <Stars rating={rating} />
          </div>
        )}
      </div>
    </Link>
  )
}

function ProductCardSkeleton() {
  return (
    <div>
      <div className='aspect-square animate-pulse rounded-xl bg-gray-100' />
      <div className='mt-2.5 space-y-1.5'>
        <div className='h-3.5 w-4/5 animate-pulse rounded bg-gray-100' />
        <div className='h-3.5 w-1/3 animate-pulse rounded bg-gray-100' />
      </div>
    </div>
  )
}

const RECOMMENDED_TAB = { id: 'all', slug: '', name: 'All' }
const SKELETON_COUNT = 20

const rankByRecentlyViewedVendors = (items, recentlyViewed) => {
  const vendorWeights = new Map()
  recentlyViewed.forEach((entry, index) => {
    const vendor = String(entry?.vendor || '').trim().toLowerCase()
    if (!vendor) return
    const recencyWeight = Math.max(1, recentlyViewed.length - index)
    vendorWeights.set(vendor, (vendorWeights.get(vendor) || 0) + recencyWeight)
  })
  if (!vendorWeights.size) return items

  return [...items]
    .map((item, index) => {
      const vendor = String(item?.vendor?.name || item?.vendor || '').trim().toLowerCase()
      const score = vendorWeights.get(vendor) || 0
      return { item, score, index }
    })
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.index - b.index))
    .map((entry) => entry.item)
}

export default function SelectedForYouSectionClient() {
  const [isVisible, setIsVisible] = useState(false)
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [title, setTitle] = useState('')
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const sectionRef = useRef(null)
  const pillsRef = useRef(null)
  const loadMoreRef = useRef(null)
  const hasRankedRef = useRef(false)
  const inFlightRef = useRef(false)
  const hasFetchedFirstBatchRef = useRef(false)

  // ── Reveal the section (and trigger the first load) only once the user
  //     has scrolled near the footer. Before that, the section renders
  //     nothing but a 1px sentinel — no skeleton, no reserved space. ──
  useEffect(() => {
    const el = sectionRef.current
    if (!el || isVisible) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [isVisible])

  useEffect(() => {
    if (!isVisible || hasFetchedFirstBatchRef.current) return
    hasFetchedFirstBatchRef.current = true
    setStatus('loading')
    const load = async () => {
      try {
        const response = await fetch('/api/home/selected-for-you?page=1', { cache: 'no-store' })
        const payload = await response.json().catch(() => null)
        if (!response.ok || !Array.isArray(payload?.items) || !payload.items.length) {
          setStatus('error')
          return
        }
        setTitle(payload.title || '')
        setCategories(Array.isArray(payload.categories) ? payload.categories : [])
        setItems(payload.items)
        setHasMore(Boolean(payload.hasMore))
        setPage(1)
        setStatus('ready')
      } catch {
        setStatus('error')
      }
    }
    void load()
  }, [isVisible])

  // ── One-time recently-viewed re-rank of the first batch ──
  useEffect(() => {
    if (status !== 'ready' || hasRankedRef.current) return
    hasRankedRef.current = true
    const recentlyViewed = getRecentlyViewed()
    if (!recentlyViewed.length) return
    setItems((current) => rankByRecentlyViewedVendors(current, recentlyViewed))
  }, [status])

  // ── Infinite scroll: load next page when sentinel enters viewport ──
  const loadMore = useCallback(async () => {
    if (inFlightRef.current || !hasMore) return
    inFlightRef.current = true
    setIsLoadingMore(true)
    try {
      const nextPage = page + 1
      const response = await fetch(`/api/home/selected-for-you?page=${nextPage}`, { cache: 'no-store' })
      if (!response.ok) {
        setHasMore(false)
        return
      }
      const payload = await response.json().catch(() => null)
      const nextItems = Array.isArray(payload?.items) ? payload.items : []
      if (!nextItems.length) {
        setHasMore(false)
        return
      }
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id || item.slug))
        const deduped = nextItems.filter((item) => !seen.has(item.id || item.slug))
        return [...current, ...deduped]
      })
      setPage(nextPage)
      setHasMore(Boolean(payload?.hasMore))
    } catch {
      setHasMore(false)
    } finally {
      inFlightRef.current = false
      setIsLoadingMore(false)
    }
  }, [page, hasMore])

  useEffect(() => {
    if (status !== 'ready') return
    const target = loadMoreRef.current
    if (!target || !hasMore) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void loadMore()
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [status, hasMore, loadMore])

  const tabs = useMemo(() => [RECOMMENDED_TAB, ...categories], [categories])

  const checkScroll = useCallback(() => {
    const el = pillsRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 1)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
  }, [])

  useEffect(() => {
    const el = pillsRef.current
    if (!el || status !== 'ready') return
    el.scrollLeft = 0
    let raf = requestAnimationFrame(checkScroll)
    const ro = new ResizeObserver(() => {
      raf = requestAnimationFrame(checkScroll)
    })
    ro.observe(el)
    el.addEventListener('scroll', checkScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      el.removeEventListener('scroll', checkScroll)
    }
  }, [checkScroll, status, tabs.length])

  const scrollPills = useCallback((dir) => {
    pillsRef.current?.scrollBy({ left: dir === 'left' ? -240 : 240, behavior: 'smooth' })
  }, [])

  if (status === 'error') return null

  if (!isVisible) {
    // Nothing rendered yet — just an invisible sentinel to detect when the
    // user has scrolled near the footer. Zero layout impact until then.
    return <div ref={sectionRef} aria-hidden='true' className='h-px w-full' />
  }

  return (
    <section ref={sectionRef} className='py-8'>
      {status !== 'ready' ? (
        <div className='rounded-2xl border border-gray-200 px-3 py-4 sm:px-4 md:px-10 lg:px-16'>
          <div className='mx-auto mb-6 h-5 w-48 animate-pulse rounded bg-gray-100' />
          <div className='grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className='mb-2 px-3 sm:px-4 md:px-10 lg:px-16'>
            <h2 className='flex items-center justify-center gap-3 text-center'>
              <span className='h-px flex-1 max-w-10 bg-gradient-to-r from-transparent to-rose-300 sm:max-w-16' />
              <span className='flex items-center gap-1.5'>
                <svg className='h-3 w-3 text-rose-300' viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
                  <path d='M12 2c.6 3.2 2.2 4.8 5.4 5.4-3.2.6-4.8 2.2-5.4 5.4-.6-3.2-2.2-4.8-5.4-5.4C9.8 6.8 11.4 5.2 12 2Z' />
                </svg>
                <span className='text-lg font-extrabold uppercase tracking-wide text-gray-900 sm:text-xl'>
                  {title}
                </span>
                <svg className='h-3 w-3 text-rose-300' viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
                  <path d='M12 2c.6 3.2 2.2 4.8 5.4 5.4-3.2.6-4.8 2.2-5.4 5.4-.6-3.2-2.2-4.8-5.4-5.4C9.8 6.8 11.4 5.2 12 2Z' />
                </svg>
              </span>
              <span className='h-px flex-1 max-w-10 bg-gradient-to-l from-transparent to-rose-300 sm:max-w-16' />
            </h2>
          </div>

          <div className='rounded-2xl border border-gray-200 px-3 py-4 sm:px-4 md:px-10 lg:px-16'>
            <div className='group relative mb-4 w-full'>
              <button
                type='button'
                onClick={() => scrollPills('left')}
                aria-label='Scroll left'
                className={`absolute left-0 top-1/2 z-10 -translate-x-2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md text-gray-700 transition-all duration-200 hover:bg-gray-50 ${
                  canScrollLeft
                    ? 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'
                    : 'invisible pointer-events-none'
                }`}
              >
                <svg className='h-6 w-6' fill='none' stroke='currentColor' strokeWidth='2.2' viewBox='0 0 24 24' aria-hidden='true'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M15 19l-7-7 7-7' />
                </svg>
              </button>

              <div
                ref={pillsRef}
                className='w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
              >
                <div className='flex items-center gap-2 pb-0.5'>
                  {tabs.map((tab) => {
                    const isAll = tab.id === RECOMMENDED_TAB.id
                    const href = isAll ? '#' : `/products/${tab.slug}`
                    return (
                      <Link
                        key={tab.id}
                        href={href}
                        className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                          isAll
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        {tab.name}
                      </Link>
                    )
                  })}
                </div>
              </div>

              <button
                type='button'
                onClick={() => scrollPills('right')}
                aria-label='Scroll right'
                className={`absolute right-0 top-1/2 z-10 translate-x-2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md text-gray-700 transition-all duration-200 hover:bg-gray-50 ${
                  canScrollRight
                    ? 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'
                    : 'invisible pointer-events-none'
                }`}
              >
                <svg className='h-6 w-6' fill='none' stroke='currentColor' strokeWidth='2.2' viewBox='0 0 24 24' aria-hidden='true'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M9 5l7 7-7 7' />
                </svg>
              </button>
            </div>

            <div className='grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
              {items.map((product) => (
                <FeedProductCard key={product.id || product.slug} product={product} />
              ))}
              {isLoadingMore &&
                Array.from({ length: 5 }).map((_, i) => <ProductCardSkeleton key={`more-${i}`} />)}
            </div>

            {hasMore && <div ref={loadMoreRef} aria-hidden='true' className='h-1 w-full' />}
          </div>
        </>
      )}
    </section>
  )
}
