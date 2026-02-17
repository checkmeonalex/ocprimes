// components/mobile/MobileNavbar.jsx
'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { useSidebar } from '../../context/SidebarContext'
import dynamic from 'next/dynamic'
import { useCart } from '../../context/CartContext'
import { fetchCategoriesData } from '../data/categoriesMenuData.ts'
import { useAuthUser } from '../../lib/auth/useAuthUser.ts'

// Lazy load CategoriesMenu since it's not immediately visible
const CategoriesMenu = dynamic(() => import('../Catergories/CategoriesMenu'), {
  loading: () => null, // No loading spinner needed
})

function MobileNavbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { isOpen, toggleSidebar } = useSidebar()
  const { summary } = useCart()
  const { user } = useAuthUser()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [recentSearches, setRecentSearches] = useState([])
  const [mobileCategories, setMobileCategories] = useState([])
  const [activeMobileCategoryId, setActiveMobileCategoryId] = useState(null)
  const [isSecondBarVisible, setIsSecondBarVisible] = useState(true)
  const searchRef = useRef(null)
  const accountMenuRef = useRef(null)
  const lastScrollYRef = useRef(0)
  const attemptedSearchImageTermsRef = useRef(new Set())

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
    attemptedSearchImageTermsRef.current.clear()
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
    const missing = recentSearches
      .filter(
        (item) =>
          !item.image &&
          item.term &&
          !attemptedSearchImageTermsRef.current.has(item.term),
      )
      .slice(0, 6)
    if (!missing.length) return

    let cancelled = false

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
      if (cancelled) return
      missing.forEach((item) => {
        attemptedSearchImageTermsRef.current.add(item.term)
      })
      const resolved = updates.filter((update) => update.image)
      if (!resolved.length) return

      const resolvedMap = new Map(resolved.map((item) => [item.term, item.image]))
      const next = recentSearches.map((item) => {
        const image = resolvedMap.get(item.term)
        return image ? { ...item, image } : item
      })
      const changed = next.some((item, index) => item.image !== recentSearches[index]?.image)
      if (!changed) return

      setRecentSearches(next)
      try {
        window.localStorage.setItem('ocp_recent_searches', JSON.stringify(next))
      } catch {
        // ignore storage errors
      }
    })
    return () => {
      cancelled = true
    }
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

  useEffect(() => {
    const SHOW_AT_Y = 80
    const HIDE_AFTER_Y = 140

    const handleScroll = () => {
      const rawY =
        window.scrollY ||
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        0
      const currentY = Math.max(0, rawY)
      const scrollingUp = currentY < lastScrollYRef.current

      if (currentY <= SHOW_AT_Y || scrollingUp) {
        setIsSecondBarVisible(true)
      } else if (currentY >= HIDE_AFTER_Y) {
        setIsSecondBarVisible(false)
      }

      lastScrollYRef.current = currentY
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    const rawY =
      window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0
    const currentY = Math.max(0, rawY)
    lastScrollYRef.current = currentY
    if (currentY <= 80) {
      setIsSecondBarVisible(true)
    }
    setIsAccountMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isAccountMenuOpen) return undefined

    const handlePointerDown = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setIsAccountMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsAccountMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isAccountMenuOpen])

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

  const handleCategoryListClick = useCallback((categoryId) => {
    setActiveMobileCategoryId(categoryId || null)
    setIsCategoriesOpen(true)
  }, [])

  const handleSearchToggle = useCallback(() => {
    setIsSearchOpen((prev) => !prev)
  }, [])

  const closeAccountMenu = () => setIsAccountMenuOpen(false)

  const handleAccountSignOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    closeAccountMenu()
    router.refresh()
    router.push('/login')
  }

  return (
    <>
      {/* Main Mobile Navbar */}
      <nav className='fixed top-0 left-0 right-0 isolate bg-white shadow-sm border-b border-gray-200 z-[2147483000] lg:hidden'>
        <div className='px-4'>
          <div className='flex items-center justify-between h-14'>
            {/* Updated hamburger button with active state */}
            <div className='flex items-center space-x-1'>
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
                    <>
                      <path d='M4 7C4 6.44771 4.44772 6 5 6H24C24.5523 6 25 6.44771 25 7C25 7.55229 24.5523 8 24 8H5C4.44772 8 4 7.55229 4 7Z' fill='currentColor' stroke='none' />
                      <path d='M4 13.9998C4 13.4475 4.44772 12.9997 5 12.9997L16 13C16.5523 13 17 13.4477 17 14C17 14.5523 16.5523 15 16 15L5 14.9998C4.44772 14.9998 4 14.552 4 13.9998Z' fill='currentColor' stroke='none' />
                      <path d='M5 19.9998C4.44772 19.9998 4 20.4475 4 20.9998C4 21.552 4.44772 21.9997 5 21.9997H22C22.5523 21.9997 23 21.552 23 20.9998C23 20.4475 22.5523 19.9998 22 19.9998H5Z' fill='currentColor' stroke='none' />
                    </>
                  )}
                </svg>
              </button>

              {/* Logo/Brand */}
              <Link href='/' className='text-xl font-bold text-red-500'>
                OcPrimes
              </Link>
            </div>

            {/* Center section - Search bar trigger */}
            <div className='mx-2 min-w-0 flex-1 max-[374px]:hidden'>
              <button
                type='button'
                onClick={handleSearchToggle}
                className='flex h-10 w-full items-center justify-between rounded-full border-2 border-gray-500 bg-white pl-3 pr-1'
                aria-label='Open search'
              >
                <span className='truncate text-sm text-gray-500'>
                  {searchValue?.trim() ? searchValue : 'Search everything...'}
                </span>
                <span className='inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-white'>
                  <svg
                    className='h-5 w-5'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                    strokeWidth={2}
                    aria-hidden='true'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M21 21l-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0'
                    />
                  </svg>
                </span>
              </button>
            </div>

            {/* Right section - Account and Cart */}
            <div className='flex items-center space-x-1'>
              {/* Search Button (extra-small screens) */}
              <button
                type='button'
                onClick={handleSearchToggle}
                className='hidden p-1 text-gray-700 transition-colors hover:text-gray-900 max-[374px]:inline-flex'
                aria-label='Open search'
              >
                <svg
                  className='h-6 w-6'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                  strokeWidth={2}
                  aria-hidden='true'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                  />
                </svg>
              </button>

              {/* Account */}
              <div className='relative' ref={accountMenuRef}>
                <button
                  type='button'
                  onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                  className='p-2 text-gray-700 hover:text-gray-900 transition-colors'
                  aria-label='Account'
                  aria-haspopup='menu'
                  aria-expanded={isAccountMenuOpen}
                >
                  <svg
                    className='h-6 w-6'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                    strokeWidth={2}
                    aria-hidden='true'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z'
                    />
                  </svg>
                </button>

                {isAccountMenuOpen ? (
                  <div className='absolute right-0 top-[calc(100%+0.6rem)] z-[2147483001] w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg'>
                    {user ? (
                      <>
                        <Link
                          href='/UserBackend'
                          onClick={closeAccountMenu}
                          className='flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50'
                        >
                          <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                            <path strokeLinecap='round' strokeLinejoin='round' d='M4 6h16v12H4z' />
                            <path strokeLinecap='round' strokeLinejoin='round' d='M9 11h6M9 15h4' />
                          </svg>
                          Account center
                        </Link>
                        <Link
                          href='/UserBackend/profile'
                          onClick={closeAccountMenu}
                          className='flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50'
                        >
                          <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                            <path strokeLinecap='round' strokeLinejoin='round' d='M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z' />
                          </svg>
                          Profile
                        </Link>
                        <Link
                          href='/UserBackend/orders'
                          onClick={closeAccountMenu}
                          className='flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50'
                        >
                          <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                            <rect x='4' y='5' width='16' height='14' rx='2' />
                            <path strokeLinecap='round' d='M8 9h8M8 13h5' />
                          </svg>
                          Orders
                        </Link>
                        <Link
                          href='/UserBackend/wishlist'
                          onClick={closeAccountMenu}
                          className='flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50'
                        >
                          <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                            <path strokeLinecap='round' strokeLinejoin='round' d='M12 20s-5.5-3.7-7.4-6.7C2.3 9.7 4.4 5.5 8 5.5c1.8 0 3 .9 4 2.2 1-1.3 2.2-2.2 4-2.2 3.6 0 5.7 4.2 3.4 7.8C17.5 16.3 12 20 12 20z' />
                          </svg>
                          Wishlist
                        </Link>
                        <Link
                          href='/UserBackend/notifications'
                          onClick={closeAccountMenu}
                          className='flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50'
                        >
                          <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>
                            <path
                              d='M15 19.25C15 20.0456 14.6839 20.8087 14.1213 21.3713C13.5587 21.9339 12.7956 22.25 12 22.25C11.2044 22.25 10.4413 21.9339 9.87869 21.3713C9.31608 20.8087 9 20.0456 9 19.25'
                              stroke='currentColor'
                              strokeWidth='1.5'
                              strokeLinecap='round'
                              strokeLinejoin='round'
                            />
                            <path
                              d='M5.58096 18.25C5.09151 18.1461 4.65878 17.8626 4.36813 17.4553C4.07748 17.048 3.95005 16.5466 4.01098 16.05L5.01098 7.93998C5.2663 6.27263 6.11508 4.75352 7.40121 3.66215C8.68734 2.57077 10.3243 1.98054 12.011 1.99998V1.99998C13.6977 1.98054 15.3346 2.57077 16.6207 3.66215C17.9069 4.75352 18.7557 6.27263 19.011 7.93998L20.011 16.05C20.0723 16.5452 19.9462 17.0454 19.6576 17.4525C19.369 17.8595 18.9386 18.144 18.451 18.25C14.2186 19.2445 9.81332 19.2445 5.58096 18.25V18.25Z'
                              stroke='currentColor'
                              strokeWidth='1.5'
                              strokeLinecap='round'
                              strokeLinejoin='round'
                            />
                          </svg>
                          Help center
                        </Link>
                        <button
                          type='button'
                          onClick={handleAccountSignOut}
                          className='mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50'
                        >
                          <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                            <path strokeLinecap='round' strokeLinejoin='round' d='M16 17l5-5-5-5M21 12H9M12 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6' />
                          </svg>
                          Sign out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href='/login'
                          onClick={closeAccountMenu}
                          className='flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50'
                        >
                          <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                            <path strokeLinecap='round' strokeLinejoin='round' d='M16 17l5-5-5-5M21 12H9M12 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6' />
                          </svg>
                          Login
                        </Link>
                        <Link
                          href='/signup'
                          onClick={closeAccountMenu}
                          className='flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50'
                        >
                          <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                            <path strokeLinecap='round' strokeLinejoin='round' d='M12 5v14M5 12h14' />
                          </svg>
                          New customer
                        </Link>
                        <Link
                          href='/UserBackend/notifications'
                          onClick={closeAccountMenu}
                          className='flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50'
                        >
                          <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>
                            <path
                              d='M15 19.25C15 20.0456 14.6839 20.8087 14.1213 21.3713C13.5587 21.9339 12.7956 22.25 12 22.25C11.2044 22.25 10.4413 21.9339 9.87869 21.3713C9.31608 20.8087 9 20.0456 9 19.25'
                              stroke='currentColor'
                              strokeWidth='1.5'
                              strokeLinecap='round'
                              strokeLinejoin='round'
                            />
                            <path
                              d='M5.58096 18.25C5.09151 18.1461 4.65878 17.8626 4.36813 17.4553C4.07748 17.048 3.95005 16.5466 4.01098 16.05L5.01098 7.93998C5.2663 6.27263 6.11508 4.75352 7.40121 3.66215C8.68734 2.57077 10.3243 1.98054 12.011 1.99998V1.99998C13.6977 1.98054 15.3346 2.57077 16.6207 3.66215C17.9069 4.75352 18.7557 6.27263 19.011 7.93998L20.011 16.05C20.0723 16.5452 19.9462 17.0454 19.6576 17.4525C19.369 17.8595 18.9386 18.144 18.451 18.25C14.2186 19.2445 9.81332 19.2445 5.58096 18.25V18.25Z'
                              stroke='currentColor'
                              strokeWidth='1.5'
                              strokeLinecap='round'
                              strokeLinejoin='round'
                            />
                          </svg>
                          Help center
                        </Link>
                      </>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Cart */}
              <Link
                href='/cart'
                className='text-gray-700 hover:text-gray-900 transition-colors relative'
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
        <div
          className={`overflow-hidden border-b border-gray-200 bg-white transition-all duration-300 ${
            isSecondBarVisible
              ? 'max-h-16 translate-y-0 opacity-100'
              : 'max-h-0 -translate-y-2 opacity-0'
          }`}
        >
          <div className='px-4 py-2'>
            <div className='flex items-center gap-3'>
              <div className='min-w-0 flex-1 overflow-x-auto'>
                <div className='flex items-center space-x-6'>
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
                    <button
                      key={item.id}
                      type='button'
                      onClick={() => handleCategoryListClick(item.id)}
                      className='text-sm text-gray-600 hover:text-gray-900 pb-2 whitespace-nowrap'
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
              <Link
                href='/products'
                className='inline-flex shrink-0 items-center gap-1 whitespace-nowrap pb-2 text-sm font-semibold text-gray-900 hover:text-gray-600'
              >
                <svg
                  className='h-5 w-5'
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
            </div>
          </div>
        </div>

      </nav>

      {/* Search Overlay - Only render when open */}
      {isSearchOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-50 z-[2147483100] lg:hidden'>
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
                <div className='relative flex-1'>
                  <input
                    type='text'
                    placeholder='Search OCPRIMES'
                    className='h-12 w-full rounded-xl border-2 border-gray-900 bg-white pl-4 pr-14 text-base text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-black'
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
                    className='absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-gray-900 text-white'
                    onClick={() => void handleSearchSubmit(searchValue)}
                    aria-label='Search'
                  >
                    <svg
                      className='h-5 w-5'
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
          className='fixed inset-0 bg-black bg-opacity-50 z-[2147482990] lg:hidden'
          onClick={toggleSidebar}
        />
      )}

      {/* Categories Menu - Only render when needed */}
      {isCategoriesOpen && (
        <CategoriesMenu
          isOpen={isCategoriesOpen}
          onClose={() => setIsCategoriesOpen(false)}
          initialActiveCategoryId={activeMobileCategoryId}
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
