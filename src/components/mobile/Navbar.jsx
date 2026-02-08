// components/mobile/MobileNavbar.jsx
'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { useSidebar } from '../../context/SidebarContext'
import dynamic from 'next/dynamic'
import { useCart } from '../../context/CartContext'
import { useIpLocation } from '../../hooks/useIpLocation'
import { fetchCategoriesData } from '../data/categoriesMenuData.ts'

// Lazy load CategoriesMenu since it's not immediately visible
const CategoriesMenu = dynamic(() => import('../Catergories/CategoriesMenu'), {
  loading: () => null, // No loading spinner needed
})

function MobileNavbar() {
  const router = useRouter()
  const { isOpen, toggleSidebar } = useSidebar()
  const { summary } = useCart()
  const { locationLabel } = useIpLocation()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [recentSearches, setRecentSearches] = useState([])
  const [mobileCategories, setMobileCategories] = useState([])
  const searchRef = useRef(null)

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

  // Memoize callback to prevent recreating on every render
  const handleClickOutside = useCallback((event) => {
    if (searchRef.current && !searchRef.current.contains(event.target)) {
      setIsSearchOpen(false)
    }
  }, [])

  // Optimize event listener management
  useEffect(() => {
    if (!isSearchOpen) return // Only add listener when search is open

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSearchOpen, handleClickOutside])

  useEffect(() => {
    if (!isSearchOpen) return
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
  }, [isSearchOpen])

  useEffect(() => {
    if (!isSearchOpen || !recentSearches.length) return
    const missing = recentSearches.filter((item) => !item.image).slice(0, 6)
    if (!missing.length) return
    const fetchFirstSearchImage = async (term) => {
      try {
        const response = await fetch(
          `/api/products?search=${encodeURIComponent(term)}&per_page=1&page=1`,
        )
        if (!response.ok) return ''
        const payload = await response.json().catch(() => null)
        const first = payload?.items?.[0]
        return (
          first?.image_url ||
          first?.image ||
          first?.images?.[0]?.url ||
          ''
        )
      } catch {
        return ''
      }
    }
    Promise.all(
      missing.map(async (item) => ({
        term: item.term,
        image: (await fetchFirstSearchImage(item.term)) || '',
      })),
    ).then((updates) => {
      const next = recentSearches.map((item) => {
        const match = updates.find((update) => update.term === item.term)
        return match && match.image ? { ...item, image: match.image } : item
      })
      setRecentSearches(next)
      try {
        window.localStorage.setItem('ocp_recent_searches', JSON.stringify(next))
      } catch {
        // ignore storage errors
      }
    })
  }, [isSearchOpen, recentSearches])

  useEffect(() => {
    let cancelled = false

    const loadMobileCategories = async () => {
      const data = await fetchCategoriesData()
      if (cancelled) return
      const categories = Array.isArray(data?.categories) ? data.categories : []
      setMobileCategories(categories)
    }

    void loadMobileCategories()
    return () => {
      cancelled = true
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

  const handleSearchSubmit = async (value) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const existing = recentSearches.find((item) => item.term === trimmed)
    const next = [
      { term: trimmed, image: existing?.image || '' },
      ...recentSearches.filter((item) => item.term !== trimmed),
    ].slice(0, 8)
    persistRecentSearches(next)
    router.push(`/products?search=${encodeURIComponent(trimmed)}`)
    setIsSearchOpen(false)
  }

  const clearRecentSearches = () => {
    persistRecentSearches([])
  }

  const handleCategoriesClick = useCallback(() => {
    setIsCategoriesOpen((prev) => !prev)
  }, [])

  const handleSearchToggle = useCallback(() => {
    setIsSearchOpen((prev) => !prev)
  }, [])

  return (
    <>
      {/* Main Mobile Navbar */}
      <nav className='fixed top-0 left-0 right-0 bg-white shadow-sm border-b border-gray-200 z-50 lg:hidden'>
        <div className='px-4'>
          <div className='flex items-center justify-between h-14'>
            {/* Updated hamburger button with active state */}
            <div className='flex items-center space-x-3'>
              <button
                onClick={toggleSidebar}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isOpen
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                aria-label='Toggle sidebar'
              >
                <svg
                  className='h-6 w-6'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                  strokeWidth={2}
                >
                  {isOpen ? (
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M6 18L18 6M6 6l12 12'
                    />
                  ) : (
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M4 6h16M4 12h16M4 18h16'
                    />
                  )}
                </svg>
              </button>

              {/* Logo/Brand */}
              <Link href='/' className='text-xl font-bold text-red-500'>
                OcPrimes
              </Link>
            </div>

            {/* Center section - Empty for spacing */}
            <div className='flex-1'></div>

            {/* Right section - Search and Cart */}
            <div className='flex items-center space-x-2'>
              {/* Search Button */}
              <button
                onClick={handleSearchToggle}
                className='p-2 text-gray-700 hover:text-gray-900 transition-colors'
                aria-label='Toggle search'
              >
                <svg
                  className='h-6 w-6'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                  />
                </svg>
              </button>

              {/* Cart */}
              <Link
                href='/cart'
                className='p-2 text-gray-700 hover:text-gray-900 transition-colors relative'
                aria-label='Shopping cart'
              >
                <svg
                  className='h-9 w-9'
                  viewBox='0 0 24 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                  aria-hidden='true'
                >
                  {summary?.itemCount > 0 ? null : (
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
                  {summary?.itemCount > 0 && (
                    <text
                      x='14'
                      y='9.25'
                      textAnchor='middle'
                      dominantBaseline='middle'
                      fontSize={summary?.itemCount > 9 ? 7 : 8}
                      fontWeight='500'
                      fill='#000000'
                      style={{
                        fontFamily:
                          'system-ui, -apple-system, Segoe UI, Roboto, Arial',
                      }}
                    >
                      {summary?.itemCount > 99 ? '99+' : summary?.itemCount}
                    </text>
                  )}
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Top Navigation Bar */}
        <div className='bg-white border-b border-gray-200'>
          <div className='px-4 py-2'>
            <div className='flex items-center space-x-6 overflow-x-auto'>
              <button
                onClick={handleCategoriesClick}
                className='text-sm font-medium text-gray-900 border-b-2 border-red-500 pb-2 whitespace-nowrap flex items-center gap-2'
                aria-label='Toggle categories'
              >
                <svg
                  className='h-5 w-5'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                  strokeWidth='2'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'
                  ></path>
                </svg>
              </button>
              {mobileCategories.map((item) => (
                <Link
                  key={item.id}
                  href={
                    item.slug
                      ? `/products/${encodeURIComponent(item.slug)}`
                      : '/products'
                  }
                  className='text-sm text-gray-600 hover:text-gray-900 pb-2 whitespace-nowrap'
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Location Bar */}
        <div className='bg-gray-50 border-b border-gray-200'>
          <div className='px-4 py-2'>
            <div className='flex items-center gap-3 text-gray-700'>
              <svg className='h-4 w-4' fill='currentColor' viewBox='0 0 24 24'>
                <path d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z' />
              </svg>
              <div className='flex items-center justify-between w-full'>
                <div className='flex flex-col leading-tight'>
                  <span className='text-xs font-medium'>Shipping to</span>
                  <span className='text-[11px] text-gray-500'>
                    {locationLabel || 'Select a mode'}
                  </span>
                </div>
                <svg
                  className='h-4 w-4'
                  fill='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path d='M7 10l5 5 5-5z' />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Search Overlay - Only render when open */}
      {isSearchOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden'>
          <div className='bg-white'>
            <div className='px-4 py-3 border-b border-gray-200'>
              <div className='flex items-center space-x-3' ref={searchRef}>
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className='p-1 text-gray-500 hover:text-gray-700'
                  aria-label='Close search'
                >
                  <svg
                    className='h-6 w-6'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M6 18L18 6M6 6l12 12'
                    />
                  </svg>
                </button>
                <div className='flex-1 relative'>
                  <input
                    type='text'
                    placeholder='Search OCPRIMES'
                    className='w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent'
                    autoFocus
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void handleSearchSubmit(searchValue)
                      }
                    }}
                  />
                  <button
                    className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400'
                    onClick={() => void handleSearchSubmit(searchValue)}
                    aria-label='Search'
                  >
                    <svg
                      className='h-6 w-6'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Search menu */}
            <div className='p-4'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-semibold text-gray-900'>
                  Recently searched
                </span>
                <button
                  type='button'
                  className='text-gray-400 hover:text-gray-600'
                  aria-label='Clear recent searches'
                  onClick={clearRecentSearches}
                >
                  <svg
                    className='h-4 w-4'
                    viewBox='0 0 24 24'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <path
                      d='M20.5001 6H3.5'
                      stroke='#000000'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                    />
                    <path
                      d='M9.5 11L10 16'
                      stroke='#000000'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                    />
                    <path
                      d='M14.5 11L14 16'
                      stroke='#000000'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                    />
                    <path
                      d='M6.5 6C6.55588 6 6.58382 6 6.60915 5.99936C7.43259 5.97849 8.15902 5.45491 8.43922 4.68032C8.44784 4.65649 8.45667 4.62999 8.47434 4.57697L8.57143 4.28571C8.65431 4.03708 8.69575 3.91276 8.75071 3.8072C8.97001 3.38607 9.37574 3.09364 9.84461 3.01877C9.96213 3 10.0932 3 10.3553 3H13.6447C13.9068 3 14.0379 3 14.1554 3.01877C14.6243 3.09364 15.03 3.38607 15.2493 3.8072C15.3043 3.91276 15.3457 4.03708 15.4286 4.28571L15.5257 4.57697C15.5433 4.62992 15.5522 4.65651 15.5608 4.68032C15.841 5.45491 16.5674 5.97849 17.3909 5.99936C17.4162 6 17.4441 6 17.5 6'
                      stroke='#000000'
                      strokeWidth='1.5'
                    />
                    <path
                      d='M18.3735 15.3991C18.1965 18.054 18.108 19.3815 17.243 20.1907C16.378 21 15.0476 21 12.3868 21H11.6134C8.9526 21 7.6222 21 6.75719 20.1907C5.89218 19.3815 5.80368 18.054 5.62669 15.3991L5.16675 8.5M18.8334 8.5L18.6334 11.5'
                      stroke='#000000'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                    />
                  </svg>
                </button>
              </div>
              <div className='mt-3 flex flex-wrap gap-2'>
                {recentSearches.length ? (
                  recentSearches.map((item) => (
                    <button
                      key={item.term}
                      type='button'
                      onClick={() => setSearchValue(item.term)}
                      className='rounded-full bg-gray-100 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-200 flex items-center gap-2'
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
                  <span className='text-xs text-gray-400'>
                    No recent searches
                  </span>
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
                    className='rounded-full bg-gray-100 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-200 flex items-center gap-2'
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
          </div>
        </div>
      )}

      {/* Sidebar Overlay - Only render when open */}
      {isOpen && (
        <div
          className='fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden'
          onClick={toggleSidebar}
        />
      )}

      {/* Categories Menu - Only render when needed */}
      {isCategoriesOpen && (
        <CategoriesMenu
          isOpen={isCategoriesOpen}
          onClose={() => setIsCategoriesOpen(false)}
        />
      )}
    </>
  )
}

// Memoize the component to prevent unnecessary re-renders
export default memo(MobileNavbar)

export function useScreenSize() {
  // Initialize from window when available to avoid initial mismatch/flicker
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  )

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024) // 1024px is the 'lg' breakpoint in Tailwind
    }

    // Add event listener
    window.addEventListener('resize', checkScreenSize)

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  return { isMobile }
}
