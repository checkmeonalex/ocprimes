// components/Navbar.jsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useCart } from '../context/CartContext'
import CategoriesMenu from './Catergories/CategoriesMenu'
import { fetchCategoriesData } from './data/categoriesMenuData.ts'
import { getRecentlyViewed } from '@/lib/recently-viewed/storage'
import UserMenu from './auth/UserMenu'
import { useUserI18n } from '@/lib/i18n/useUserI18n'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { summary } = useCart()
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false)
  const [hoverTimeout, setHoverTimeout] = useState(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSearchCategoryOpen, setIsSearchCategoryOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [selectedSearchCategory, setSelectedSearchCategory] = useState({
    name: 'All',
    slug: '',
  })
  const [recentSearches, setRecentSearches] = useState([])
  const [topCategories, setTopCategories] = useState([])
  const [activeTopCategoryId, setActiveTopCategoryId] = useState(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isHistoryPinned, setIsHistoryPinned] = useState(false)
  const [historyHoverTimeout, setHistoryHoverTimeout] = useState(null)
  const [historyItems, setHistoryItems] = useState([])
  const [isDesktopHeaderVisible, setIsDesktopHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const { formatMoney } = useUserI18n()

  const categoriesRef = useRef(null)
  const menuRef = useRef(null)
  const searchContainerRef = useRef(null)
  const browsingHistoryRef = useRef(null)
  const historyPanelRef = useRef(null)
  const historyListRef = useRef(null)

  const popularSearches = [
    'high quality men clothes',
    'men wears',
    'mobile offer',
    'joggers for men',
    'trousers for men',
    'cheap mobile phones',
    'two piece for men',
    'samsung galaxy mobile phones',
    'headphones',
    'shoes for men sale',
  ]

  const placeholderChipImage =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" rx="20" fill="%23e5e7eb"/></svg>'

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('ocp_recent_searches')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map((item) => {
              if (typeof item === 'string') {
                return { term: item, image: '' }
              }
              if (item && typeof item.term === 'string') {
                return { term: item.term, image: item.image || '' }
              }
              return null
            })
            .filter(Boolean)
          setRecentSearches(normalized)
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [])

  const persistRecentSearches = (next) => {
    setRecentSearches(next)
    try {
      window.localStorage.setItem('ocp_recent_searches', JSON.stringify(next))
    } catch {
      // ignore storage errors
    }
  }

  const fetchFirstSearchImage = async (term) => {
    try {
      const response = await fetch(
        `/api/products?search=${encodeURIComponent(term)}&per_page=1&page=1`,
      )
      if (!response.ok) return ''
      const payload = await response.json().catch(() => null)
      const first = payload?.items?.[0]
      return first?.image_url || first?.image || first?.images?.[0]?.url || ''
    } catch {
      return ''
    }
  }

  const handleSearchSubmit = async (value) => {
    const trimmed = value.trim()
    if (!trimmed) return

    const existing = recentSearches.find((item) => item.term === trimmed)
    const next = [
      { term: trimmed, image: existing?.image || '' },
      ...recentSearches.filter((item) => item.term !== trimmed),
    ].slice(0, 8)

    persistRecentSearches(next)

    const image = await fetchFirstSearchImage(trimmed)
    if (image) {
      const updated = [
        { term: trimmed, image },
        ...next.filter((item) => item.term !== trimmed),
      ].slice(0, 8)
      persistRecentSearches(updated)
    }

    const params = new URLSearchParams()
    params.set('search', trimmed)
    if (selectedSearchCategory?.slug) {
      params.set('category', selectedSearchCategory.slug)
    }
    router.push(`/products?${params.toString()}`)
    setIsSearchOpen(false)
    setIsSearchCategoryOpen(false)
  }

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleSearchSubmit(searchValue)
    }

    if (event.key === 'Escape') {
      setIsSearchOpen(false)
      setIsSearchCategoryOpen(false)
    }
  }

  const clearRecentSearches = () => {
    persistRecentSearches([])
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setIsSearchOpen(false)
        setIsSearchCategoryOpen(false)
      }

      if (
        browsingHistoryRef.current &&
        !browsingHistoryRef.current.contains(event.target) &&
        historyPanelRef.current &&
        !historyPanelRef.current.contains(event.target)
      ) {
        setIsHistoryOpen(false)
        setIsHistoryPinned(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        categoriesRef.current &&
        !categoriesRef.current.contains(event.target) &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setIsCategoriesOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      if (hoverTimeout) clearTimeout(hoverTimeout)
    }
  }, [hoverTimeout])

  useEffect(() => {
    let cancelled = false

    const loadTopCategories = async () => {
      const data = await fetchCategoriesData()
      if (cancelled) return
      const categories = Array.isArray(data?.categories) ? data.categories : []
      setTopCategories(categories)
      if (categories.length) {
        setActiveTopCategoryId(categories[0].id || null)
      }
    }

    void loadTopCategories()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      const nearTop = currentY < 20
      const scrollingUp = currentY < lastScrollY
      const shouldShow = nearTop || scrollingUp

      setIsDesktopHeaderVisible(shouldShow)
      setLastScrollY(currentY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  const handleCategoriesMouseEnter = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout)
    setIsHistoryOpen(false)
    setIsHistoryPinned(false)
    setIsCategoriesOpen(true)
  }

  const handleCategoriesMouseLeave = () => {
    const timeout = setTimeout(() => {
      setIsCategoriesOpen(false)
    }, 200)
    setHoverTimeout(timeout)
  }

  const handleTopCategoryHover = (category) => {
    if (!category) return
    if (hoverTimeout) clearTimeout(hoverTimeout)
    setIsHistoryOpen(false)
    setIsHistoryPinned(false)
    setActiveTopCategoryId(category.id || null)
    setIsCategoriesOpen(true)
  }

  const handleHistoryMouseEnter = () => {
    if (historyHoverTimeout) clearTimeout(historyHoverTimeout)
    setHistoryItems(getRecentlyViewed())
    setIsCategoriesOpen(false)
    setIsHistoryOpen(true)
  }

  const isWithinHistoryArea = (node) => {
    if (!node) return false
    return Boolean(
      browsingHistoryRef.current?.contains(node) ||
        historyPanelRef.current?.contains(node),
    )
  }

  const handleHistoryMouseLeave = (event) => {
    const nextTarget = event?.relatedTarget
    if (isWithinHistoryArea(nextTarget)) return
    if (isHistoryPinned) return
    const timeout = setTimeout(() => {
      setIsHistoryOpen(false)
    }, 380)
    setHistoryHoverTimeout(timeout)
  }

  const handleHistoryClick = () => {
    if (historyHoverTimeout) clearTimeout(historyHoverTimeout)
    setHistoryItems(getRecentlyViewed())
    setIsCategoriesOpen(false)
    setIsHistoryOpen((prev) => {
      const nextOpen = !prev
      setIsHistoryPinned(nextOpen)
      return nextOpen
    })
  }

  const scrollHistoryList = (direction) => {
    if (!historyListRef.current) return
    const offset = direction === 'left' ? -280 : 280
    historyListRef.current.scrollBy({ left: offset, behavior: 'smooth' })
  }

  const cartCount = summary?.itemCount ?? 0
  const isCartRoute = pathname?.startsWith('/cart')
  const isCheckoutRoute = pathname?.startsWith('/checkout')
  const isCheckoutFlow = isCartRoute || isCheckoutRoute
  const isUserDashboard = pathname?.startsWith('/UserBackend')
  const showDashboardPrimaryBar = lastScrollY < 20
  const checkoutCurrentStep = isCartRoute
    ? 'account'
    : pathname?.startsWith('/checkout/review')
      ? 'review'
      : pathname?.startsWith('/checkout/payment')
        ? 'payment'
        : 'delivery'
  const checkoutStepOrder = ['account', 'delivery', 'payment', 'review']
  const checkoutCurrentStepIndex = Math.max(
    0,
    checkoutStepOrder.indexOf(checkoutCurrentStep),
  )
  const checkoutBackHref = isCartRoute
    ? '/'
    : pathname?.startsWith('/checkout/review')
      ? '/checkout/payment'
      : pathname?.startsWith('/checkout/payment')
        ? '/checkout/shipping'
        : '/cart'
  const formatPrice = (value) => {
    if (!Number.isFinite(Number(value))) return '--'
    return formatMoney(Number(value))
  }

  const getDiscountPercent = (price, originalPrice) => {
    const p = Number(price)
    const op = Number(originalPrice)
    if (!Number.isFinite(p) || !Number.isFinite(op) || op <= p || op <= 0) return null
    return Math.max(1, Math.round(((op - p) / op) * 100))
  }

  const HeaderAction = ({ href, label, children }) => {
    return (
      <Link
        href={href}
        className='inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100'
      >
        {children}
        <span className='leading-tight'>{label}</span>
      </Link>
    )
  }

  if (isCheckoutFlow) {
    return (
      <nav className='fixed left-0 right-0 top-0 z-40 hidden border-b border-gray-200 bg-[#f3f4f6] lg:block'>
        <div className='mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8'>
          <div className='relative flex h-16 items-center'>
            <div className='absolute left-0 top-1/2 -translate-y-1/2'>
              <Link
                href={checkoutBackHref}
                className='inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-[#eef0f2] px-4 py-2 text-sm font-medium text-slate-900 hover:bg-[#e6e8ea]'
              >
                <svg
                  viewBox='0 0 20 20'
                  className='h-4 w-4'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  aria-hidden='true'
                >
                  <path d='m12.5 4.5-5 5 5 5' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
                Back
              </Link>
            </div>

            <div className='mx-auto min-w-0 px-32'>
              <ol className='flex items-center justify-center gap-3 overflow-x-auto'>
              {checkoutStepOrder.map((stepKey, index) => {
                const isDone = index < checkoutCurrentStepIndex
                const isCurrent = index === checkoutCurrentStepIndex
                const label =
                  stepKey === 'account'
                    ? 'Cart'
                    : stepKey === 'delivery'
                      ? 'Shipping'
                      : stepKey === 'payment'
                        ? 'Pay'
                        : 'Review'
                return (
                  <li key={stepKey} className='flex items-center gap-2.5'>
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${
                        isDone
                          ? 'border-white/85 bg-white/40 text-slate-700 backdrop-blur-xl'
                          : isCurrent
                            ? 'border-slate-800 bg-gradient-to-b from-slate-700 to-slate-900 text-white'
                            : 'border-slate-300 bg-[#f8f8f8] text-slate-500'
                      }`}
                    >
                      {isDone ? (
                        <svg
                          viewBox='0 0 20 20'
                          className='h-5 w-5'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2.4'
                          aria-hidden='true'
                        >
                          <path
                            d='M4.8 10.5 8.1 13.8l7-7'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                          />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span
                      className={`whitespace-nowrap text-base font-medium ${
                        isDone || isCurrent ? 'text-slate-900' : 'text-slate-500'
                      }`}
                    >
                      {label}
                    </span>
                    {index < checkoutStepOrder.length - 1 ? (
                      <span className='mx-1 h-px w-10 bg-slate-400/70' aria-hidden='true' />
                    ) : null}
                  </li>
                )
              })}
              </ol>
            </div>

            <div className='absolute right-0 top-1/2 -translate-y-1/2'>
              <UserMenu variant='compactChip' />
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-40 hidden border-b border-gray-200 ${
        isCheckoutFlow ? 'bg-[#f3f4f6]' : 'bg-white'
      } lg:block ${
        isUserDashboard
          ? ''
          : `transition-transform duration-300 ${
              isDesktopHeaderVisible ? 'translate-y-0' : '-translate-y-full'
            }`
      }`}
    >
      <div
        className={`mx-auto w-full max-w-[1400px] overflow-visible px-4 transition-all duration-300 sm:px-6 lg:px-8 ${
          isUserDashboard
            ? showDashboardPrimaryBar
              ? 'max-h-16 opacity-100'
              : 'max-h-0 opacity-0'
            : 'max-h-16 opacity-100'
        }`}
      >
        <div className='flex h-16 items-center gap-5'>
        <div className='flex items-center gap-5'>
          <Link href='/' className='inline-flex items-center gap-3 text-gray-900'>
            <svg
              className='h-8 w-8 text-[#f5d10b]'
              viewBox='0 0 24 24'
              fill='currentColor'
              aria-hidden='true'
            >
              <circle cx='12' cy='3.2' r='2.2' />
              <circle cx='12' cy='20.8' r='2.2' />
              <circle cx='3.2' cy='12' r='2.2' />
              <circle cx='20.8' cy='12' r='2.2' />
              <circle cx='6.3' cy='6.3' r='2.2' />
              <circle cx='17.7' cy='17.7' r='2.2' />
              <circle cx='17.7' cy='6.3' r='2.2' />
              <circle cx='6.3' cy='17.7' r='2.2' />
            </svg>
            <span className='text-xl font-semibold tracking-tight'>OCPRIMES</span>
          </Link>

          <div
            className='relative'
            ref={categoriesRef}
            onMouseEnter={handleCategoriesMouseEnter}
            onMouseLeave={handleCategoriesMouseLeave}
          >
            <button
              type='button'
              className='inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 bg-gray-50 px-2.5 text-xs font-semibold text-gray-900 hover:bg-gray-100'
              onClick={() => {
                setIsHistoryOpen(false)
                setIsHistoryPinned(false)
                setIsCategoriesOpen((prev) => !prev)
              }}
            >
              <svg
                className='h-4 w-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
                strokeWidth={2}
                aria-hidden='true'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'
                />
              </svg>
              <span>All Categories</span>
              <svg
                className={`h-4 w-4 transition-transform ${isCategoriesOpen ? 'rotate-180' : ''}`}
                fill='currentColor'
                viewBox='0 0 20 20'
                aria-hidden='true'
              >
                <path d='M5.3 7.3 10 12l4.7-4.7 1.4 1.4L10 14.8 3.9 8.7z' />
              </svg>
            </button>
          </div>
        </div>

        <div className='relative min-w-0 flex-1' ref={searchContainerRef}>
          <div className='flex h-11 w-full items-center overflow-hidden rounded-full border-2 border-gray-500 bg-white transition-all duration-150 focus-within:rounded-md focus-within:border-black'>
            <button
              type='button'
              className='inline-flex h-full shrink-0 items-center gap-2 border-r border-gray-200 bg-white px-4 text-sm font-medium text-gray-900'
              onClick={() => setIsSearchCategoryOpen((prev) => !prev)}
            >
              <span>{selectedSearchCategory.name || 'All'}</span>
              <svg className='h-4 w-4 text-gray-600' fill='currentColor' viewBox='0 0 20 20'>
                <path d='M5.3 7.3 10 12l4.7-4.7 1.4 1.4L10 14.8 3.9 8.7z' />
              </svg>
            </button>

            <input
              type='text'
              value={searchValue}
              placeholder='Search everything at ocprimes online and in store...'
              onChange={(event) => setSearchValue(event.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              className='h-full w-full bg-white px-4 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none'
            />

            <button
              type='button'
              className='mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white hover:bg-black'
              aria-label='Search products'
              onClick={() => handleSearchSubmit(searchValue)}
            >
              <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='m21 21-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0'
                />
              </svg>
            </button>
          </div>

          {isSearchCategoryOpen ? (
            <div className='absolute left-0 top-11 z-50 w-64 rounded-md border border-gray-200 bg-white p-1.5 shadow-lg'>
              <button
                type='button'
                className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  !selectedSearchCategory.slug ? 'font-semibold text-gray-900' : 'text-gray-700'
                }`}
                onClick={() => {
                  setSelectedSearchCategory({ name: 'All', slug: '' })
                  setIsSearchCategoryOpen(false)
                }}
              >
                <span>All</span>
                {!selectedSearchCategory.slug ? (
                  <svg className='h-4 w-4 text-gray-500' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
                  </svg>
                ) : null}
              </button>
              <div className='my-1 h-px bg-gray-100' />
              <div className='max-h-72 overflow-y-auto'>
                {topCategories.map((category) => {
                  const isActive = selectedSearchCategory.slug === category.slug
                  return (
                    <button
                      key={`search-category-${category.id}`}
                      type='button'
                      className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                        isActive ? 'font-semibold text-gray-900' : 'text-gray-700'
                      }`}
                      onClick={() => {
                        setSelectedSearchCategory({
                          name: category.name || 'All',
                          slug: category.slug || '',
                        })
                        setIsSearchCategoryOpen(false)
                      }}
                    >
                      <span>{category.name}</span>
                      {isActive ? (
                        <svg className='h-4 w-4 text-gray-500' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                          <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
                        </svg>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {isSearchOpen ? (
            <div
              className='absolute left-0 right-0 top-11 z-50 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl'
              onMouseDown={(event) => event.preventDefault()}
            >
              <div className='flex items-center justify-between'>
                <span className='text-sm font-semibold text-gray-900'>
                  Recently searched
                </span>
                <button
                  type='button'
                  className='text-xs font-medium text-gray-500 hover:text-gray-700'
                  onClick={clearRecentSearches}
                >
                  Clear
                </button>
              </div>

              <div className='mt-3 flex flex-wrap gap-2'>
                {recentSearches.length ? (
                  recentSearches.map((item) => (
                    <button
                      key={item.term}
                      type='button'
                      onClick={() => setSearchValue(item.term)}
                      className='flex items-center gap-2 rounded-full bg-gray-100 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-200'
                    >
                      <Image
                        src={item.image || placeholderChipImage}
                        alt=''
                        width={20}
                        height={20}
                        className='h-5 w-5 rounded-full object-cover'
                        unoptimized
                      />
                      {item.term}
                    </button>
                  ))
                ) : (
                  <span className='text-xs text-gray-400'>No recent searches</span>
                )}
              </div>

              <div className='mt-4 text-sm font-semibold text-gray-900'>
                Popular right now
              </div>
              <div className='mt-3 flex flex-wrap gap-2'>
                {popularSearches.map((item) => (
                  <button
                    key={item}
                    type='button'
                    onClick={() => setSearchValue(item)}
                    className='flex items-center gap-2 rounded-full bg-gray-100 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-200'
                  >
                    <Image
                      src={placeholderChipImage}
                      alt=''
                      width={20}
                      height={20}
                      className='h-5 w-5 rounded-full object-cover'
                      unoptimized
                    />
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className='flex items-center gap-1'>
          <HeaderAction href='/wishlist' label='Wishlist'>
            <svg
              className='h-5 w-5'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              strokeWidth={1.8}
              aria-hidden='true'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M12 21s-6.716-4.517-9.038-8.187C.13 8.342 2.72 3 7.2 3c2.159 0 3.54 1.112 4.8 2.797C13.26 4.112 14.642 3 16.8 3 21.28 3 23.87 8.342 21.038 12.813 18.716 16.483 12 21 12 21z'
              />
            </svg>
          </HeaderAction>

          <HeaderAction href='/UserBackend/orders' label='Reorder'>
            <svg
              className='h-5 w-5'
              viewBox='0 0 24 24'
              role='img'
              xmlns='http://www.w3.org/2000/svg'
              aria-labelledby='repeatIconTitle'
              stroke='currentColor'
              strokeWidth='1'
              strokeLinecap='square'
              strokeLinejoin='miter'
              fill='none'
              color='currentColor'
            >
              <title id='repeatIconTitle'>Repeat</title>
              <path d='M2 13.0399V11C2 7.68629 4.68629 5 8 5H21V5'></path>
              <path d='M19 2L22 5L19 8'></path>
              <path d='M22 9.98004V12.02C22 15.3337 19.3137 18.02 16 18.02H3V18.02'></path>
              <path d='M5 21L2 18L5 15'></path>
            </svg>
          </HeaderAction>

          <UserMenu />

          <Link
            href='/cart'
            className='relative inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100'
            aria-label='Cart'
          >
            <svg
              className='h-8 w-8'
              viewBox='0 0 24 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              aria-hidden='true'
            >
              {cartCount <= 0 && (
                <path
                  d='M14,12a1,1,0,0,1-1-1V9H11a1,1,0,0,1,0-2h2V5a1,1,0,0,1,2,0V7h2a1,1,0,0,1,0,2H15v2A1,1,0,0,1,14,12Z'
                  fill='#520000'
                />
              )}
              <path
                d='M17,19a1.5,1.5,0,1,0,1.5,1.5A1.5,1.5,0,0,0,17,19Zm-6,0a1.5,1.5,0,1,0,1.5,1.5A1.5,1.5,0,0,0,11,19Z'
                fill='#520000'
              />
              <path
                d='M18.22,17H9.8a2,2,0,0,1-2-1.55L5.2,4H3A1,1,0,0,1,3,2H5.2a2,2,0,0,1,2,1.55L9.8,15h8.42L20,7.76A1,1,0,0,1,22,8.24l-1.81,7.25A2,2,0,0,1,18.22,17Z'
                fill='#000000'
              />
              {cartCount > 0 && (
                <text
                  x='14'
                  y='9.25'
                  textAnchor='middle'
                  dominantBaseline='middle'
                  fontSize={cartCount > 9 ? 7 : 8}
                  fontWeight='500'
                  fill='#000000'
                  style={{
                    fontFamily:
                      'system-ui, -apple-system, Segoe UI, Roboto, Arial',
                  }}
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </text>
              )}
            </svg>
            <span>Cart</span>
          </Link>
        </div>
        </div>
      </div>

      <div
        className={`border-y border-gray-200 bg-white ${
          isUserDashboard || lastScrollY < 20 ? 'block' : 'hidden'
        }`}
      >
        {isUserDashboard ? (
          <div className='flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 md:px-5'>
            <h1 className='text-base font-semibold text-slate-900 md:text-lg'>
              Account Center
            </h1>
            <div className='flex items-center gap-2'>
              <Link
                className='relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200'
                aria-label='Notifications'
                href='/UserBackend/notifications'
              >
                <svg
                  className='h-5 w-5'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.8'
                  aria-hidden='true'
                >
                  <path d='M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5' />
                  <path d='M10 17a2 2 0 0 0 4 0' />
                </svg>
                <span className='absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500' />
              </Link>
              <div className='hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 md:inline-flex'>
                <svg
                  className='h-4 w-4'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.8'
                  aria-hidden='true'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M21 21l-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0'
                  />
                </svg>
                <span>Search account pages</span>
              </div>
              <span className='inline-flex h-8 w-8 items-center justify-center rounded-full bg-pink-500 text-sm font-semibold text-white'>
                O
              </span>
            </div>
          </div>
        ) : (
          <div className='mx-auto flex h-10 w-full max-w-[1400px] items-center gap-4 px-4 sm:px-6 lg:px-8'>
          <div className='flex shrink-0 items-center gap-2 text-xs text-gray-700'>
            <span className='leading-tight'>
              Your order is at your door in
              <br />
              <strong>2 hours with fast shipping.</strong>
            </span>
            <svg
              className='h-6 w-6 text-gray-500'
              fill='currentColor'
              viewBox='0 0 24 24'
              aria-hidden='true'
            >
              <path d='m8.59 16.59 4.58-4.59-4.58-4.59L10 6l6 6-6 6z' />
            </svg>
          </div>

          <div className='h-6 w-px bg-gray-200' />

          <div className='flex min-w-0 flex-1 items-center gap-6 overflow-x-auto whitespace-nowrap'>
            {topCategories.map((category) => (
              <Link
                key={category.id}
                href={
                  category.slug
                    ? `/products/${encodeURIComponent(category.slug)}`
                    : '/products'
                }
                className='text-sm font-semibold text-gray-900 hover:text-gray-600'
                onMouseEnter={() => handleTopCategoryHover(category)}
              >
                {category.name}
              </Link>
            ))}
          </div>

          <Link
            href='/products'
            className='inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-gray-900 hover:text-gray-600'
          >
            <svg
              className='h-6 w-6'
              viewBox='0 0 24 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              aria-hidden='true'
            >
              <path
                d='M19.5617 7C19.7904 5.69523 18.7863 4.5 17.4617 4.5H6.53788C5.21323 4.5 4.20922 5.69523 4.43784 7'
                stroke='#b80000'
                strokeWidth='1.5'
              />
              <path
                d='M17.4999 4.5C17.5283 4.24092 17.5425 4.11135 17.5427 4.00435C17.545 2.98072 16.7739 2.12064 15.7561 2.01142C15.6497 2 15.5194 2 15.2588 2H8.74099C8.48035 2 8.35002 2 8.24362 2.01142C7.22584 2.12064 6.45481 2.98072 6.45704 4.00434C6.45727 4.11135 6.47146 4.2409 6.49983 4.5'
                stroke='#b80000'
                strokeWidth='1.5'
              />
              <path
                d='M21.1935 16.793C20.8437 19.2739 20.6689 20.5143 19.7717 21.2572C18.8745 22 17.5512 22 14.9046 22H9.09536C6.44881 22 5.12553 22 4.22834 21.2572C3.33115 20.5143 3.15626 19.2739 2.80648 16.793L2.38351 13.793C1.93748 10.6294 1.71447 9.04765 2.66232 8.02383C3.61017 7 5.29758 7 8.67239 7H15.3276C18.7024 7 20.3898 7 21.3377 8.02383C22.0865 8.83268 22.1045 9.98979 21.8592 12'
                stroke='#b80000'
                strokeWidth='1.5'
                strokeLinecap='round'
              />
              <path
                d='M14.5812 13.6159C15.1396 13.9621 15.1396 14.8582 14.5812 15.2044L11.2096 17.2945C10.6669 17.6309 10 17.1931 10 16.5003L10 12.32C10 11.6273 10.6669 11.1894 11.2096 11.5258L14.5812 13.6159Z'
                stroke='#b80000'
                strokeWidth='1.5'
              />
            </svg>
            <span>PLAY</span>
          </Link>

          <div
            ref={browsingHistoryRef}
            className='relative'
            onMouseEnter={handleHistoryMouseEnter}
            onMouseLeave={handleHistoryMouseLeave}
          >
            <button
              type='button'
              className='inline-flex shrink-0 items-center text-sm font-semibold text-gray-900 hover:text-gray-600'
              onClick={handleHistoryClick}
              aria-label='Browsing history'
            >
              <svg className='h-6 w-6' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>
                <path d='M12 8V12L14.5 14.5' stroke='#000000' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                <path d='M5.60423 5.60423L5.0739 5.0739V5.0739L5.60423 5.60423ZM4.33785 6.87061L3.58786 6.87438C3.58992 7.28564 3.92281 7.61853 4.33408 7.6206L4.33785 6.87061ZM6.87963 7.63339C7.29384 7.63547 7.63131 7.30138 7.63339 6.88717C7.63547 6.47296 7.30138 6.13549 6.88717 6.13341L6.87963 7.63339ZM5.07505 4.32129C5.07296 3.90708 4.7355 3.57298 4.32129 3.57506C3.90708 3.57715 3.57298 3.91462 3.57507 4.32882L5.07505 4.32129ZM3.75 12C3.75 11.5858 3.41421 11.25 3 11.25C2.58579 11.25 2.25 11.5858 2.25 12H3.75ZM16.8755 20.4452C17.2341 20.2378 17.3566 19.779 17.1492 19.4204C16.9418 19.0619 16.483 18.9393 16.1245 19.1468L16.8755 20.4452ZM19.1468 16.1245C18.9393 16.483 19.0619 16.9418 19.4204 17.1492C19.779 17.3566 20.2378 17.2341 20.4452 16.8755L19.1468 16.1245ZM5.14033 5.07126C4.84598 5.36269 4.84361 5.83756 5.13505 6.13191C5.42648 6.42626 5.90134 6.42862 6.19569 6.13719L5.14033 5.07126ZM18.8623 5.13786C15.0421 1.31766 8.86882 1.27898 5.0739 5.0739L6.13456 6.13456C9.33366 2.93545 14.5572 2.95404 17.8017 6.19852L18.8623 5.13786ZM5.0739 5.0739L3.80752 6.34028L4.86818 7.40094L6.13456 6.13456L5.0739 5.0739ZM4.33408 7.6206L6.87963 7.63339L6.88717 6.13341L4.34162 6.12062L4.33408 7.6206ZM5.08784 6.86684L5.07505 4.32129L3.57507 4.32882L3.58786 6.87438L5.08784 6.86684ZM12 3.75C16.5563 3.75 20.25 7.44365 20.25 12H21.75C21.75 6.61522 17.3848 2.25 12 2.25V3.75ZM12 20.25C7.44365 20.25 3.75 16.5563 3.75 12H2.25C2.25 17.3848 6.61522 21.75 12 21.75V20.25ZM16.1245 19.1468C14.9118 19.8483 13.5039 20.25 12 20.25V21.75C13.7747 21.75 15.4407 21.2752 16.8755 20.4452L16.1245 19.1468ZM20.25 12C20.25 13.5039 19.8483 14.9118 19.1468 16.1245L20.4452 16.8755C21.2752 15.4407 21.75 13.7747 21.75 12H20.25ZM6.19569 6.13719C7.68707 4.66059 9.73646 3.75 12 3.75V2.25C9.32542 2.25 6.90113 3.32791 5.14033 5.07126L6.19569 6.13719Z' fill='#000000' />
              </svg>
            </button>
          </div>
          </div>
        )}
      </div>

      <div
        ref={menuRef}
        className='absolute left-0 right-0 top-32 z-40'
        onMouseEnter={handleCategoriesMouseEnter}
        onMouseLeave={handleCategoriesMouseLeave}
      >
        <CategoriesMenu
          isOpen={isCategoriesOpen}
          onClose={() => setIsCategoriesOpen(false)}
          initialActiveCategoryId={activeTopCategoryId}
        />
      </div>

      {isHistoryOpen ? (
        <div
          ref={historyPanelRef}
          className='absolute left-0 right-0 top-full z-40 bg-white'
          onMouseEnter={handleHistoryMouseEnter}
          onMouseLeave={handleHistoryMouseLeave}
        >
          <div className='mx-auto w-full max-w-[1400px] px-4 py-3 sm:px-6 lg:px-8'>
            <div className='rounded-xl bg-white p-3'>
              <div className='flex items-center justify-between gap-3'>
                <h3 className='text-sm font-semibold text-gray-900'>
                  Recently viewed
                </h3>
                <div className='flex items-center gap-2'>
                  <button
                    type='button'
                    onClick={() => scrollHistoryList('left')}
                    className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    aria-label='Scroll left'
                  >
                    <svg className='h-5 w-5' viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
                      <path d='M15.41 16.59 10.83 12l4.58-4.59L14 6l-6 6 6 6z' />
                    </svg>
                  </button>
                  <button
                    type='button'
                    onClick={() => scrollHistoryList('right')}
                    className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    aria-label='Scroll right'
                  >
                    <svg className='h-5 w-5' viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
                      <path d='m8.59 16.59 4.58-4.59-4.58-4.59L10 6l6 6-6 6z' />
                    </svg>
                  </button>
                </div>
              </div>

              {historyItems.length ? (
                <div
                  ref={historyListRef}
                  className='featured-scroll mt-3 flex gap-3 overflow-x-auto pb-1'
                >
                  {historyItems.slice(0, 14).map((item) => {
                    const discount = getDiscountPercent(item.price, item.originalPrice)
                    return (
                      <Link
                        key={item.slug}
                        href={`/product/${encodeURIComponent(item.slug)}`}
                        className='group min-w-[220px] max-w-[220px] rounded-lg border border-gray-200 bg-white hover:shadow-sm'
                      >
                        <div className='relative h-[200px] overflow-hidden rounded-md bg-gray-100'>
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              sizes='220px'
                              className='object-cover transition-transform duration-300 group-hover:scale-[1.03]'
                              unoptimized
                            />
                          ) : (
                            <div className='flex h-full w-full items-center justify-center text-xs text-gray-400'>
                              No image
                            </div>
                          )}
                          <span
                            className='absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-sm'
                            aria-hidden='true'
                          >
                            <svg
                              className='h-4 w-4'
                              fill='none'
                              stroke='currentColor'
                              viewBox='0 0 24 24'
                              strokeWidth='1.8'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                d='M12 21s-6.716-4.517-9.038-8.187C.13 8.342 2.72 3 7.2 3c2.159 0 3.54 1.112 4.8 2.797C13.26 4.112 14.642 3 16.8 3 21.28 3 23.87 8.342 21.038 12.813 18.716 16.483 12 21 12 21z'
                              />
                            </svg>
                          </span>
                        </div>

                        <div className='mt-2.5'>
                          <p className='line-clamp-2 text-[15px] font-semibold leading-5 text-gray-900'>
                            {item.name}
                          </p>
                          <div className='mt-2 flex items-center gap-2'>
                            <span className='text-xl font-bold leading-none text-[#159a52]'>
                              {formatPrice(item.price)}
                            </span>
                            {item.originalPrice ? (
                              <span className='text-sm font-semibold text-gray-400 line-through'>
                                {formatPrice(item.originalPrice)}
                              </span>
                            ) : null}
                            {discount ? (
                              <span className='rounded bg-rose-100 px-1.5 py-0.5 text-xs font-bold text-rose-700'>
                                {discount}%
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                  {historyItems.length > 14 ? (
                    <Link
                      href='/recently-viewed'
                      className='group min-w-[220px] max-w-[220px] rounded-lg border border-gray-200 bg-white hover:shadow-sm'
                    >
                      <div className='relative h-[200px] overflow-hidden rounded-md bg-gray-100'>
                        <div className='absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0 opacity-75 blur-[1px]'>
                          {historyItems.slice(14, 23).map((item) => (
                            <div
                              key={`${item.slug}-view-all-preview`}
                              className='relative overflow-hidden bg-gray-100'
                            >
                              {item.image ? (
                                <Image
                                  src={item.image}
                                  alt=''
                                  fill
                                  sizes='74px'
                                  className='object-cover'
                                  unoptimized
                                />
                              ) : null}
                            </div>
                          ))}
                        </div>
                        <div className='absolute inset-0 bg-white/20' />
                      </div>
                      <div className='mt-2.5 p-2'>
                        <p className='text-base font-semibold text-gray-900'>
                          View all
                        </p>
                        <p className='mt-1 text-xs text-gray-400'>
                          {historyItems.length - 14} more items
                        </p>
                      </div>
                    </Link>
                  ) : null}
                </div>
              ) : (
                <div className='mt-3 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500'>
                  No recently viewed products yet.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  )
}
