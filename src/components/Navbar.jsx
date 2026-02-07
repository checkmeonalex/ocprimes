// components/Navbar.jsx
'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { useCart } from '../context/CartContext'
import { useSidebar } from '../context/SidebarContext'
import CategoriesMenu from './Catergories/CategoriesMenu'
import UserMenu from './auth/UserMenu'
import { useIpLocation } from '../hooks/useIpLocation'

export default function Navbar() {
  const router = useRouter()
  const { isOpen } = useSidebar()
  const { summary } = useCart()
  const { locationLabel } = useIpLocation()
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false)
  const [hoverTimeout, setHoverTimeout] = useState(null)
  const [showSecondaryNav, setShowSecondaryNav] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [recentSearches, setRecentSearches] = useState([])
  const categoriesRef = useRef(null)
  const menuRef = useRef(null)
  const searchContainerRef = useRef(null)

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
    router.push(`/products?search=${encodeURIComponent(trimmed)}`)
    setIsSearchOpen(false)
  }

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleSearchSubmit(searchValue)
    }
    if (event.key === 'Escape') {
      setIsSearchOpen(false)
    }
  }

  const clearRecentSearches = () => {
    persistRecentSearches([])
  }

  // Add scroll handler
  useEffect(() => {
    let scrollTimeout

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const shouldShowSecondary =
        currentScrollY <= lastScrollY || currentScrollY < 50

      setShowSecondaryNav(shouldShowSecondary)
      setLastScrollY(currentScrollY)
      setIsScrolling(true)

      // Clear existing timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }

      // Set scrolling to false after scroll ends
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false)
      }, 150)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimeout) clearTimeout(scrollTimeout)
    }
  }, [lastScrollY])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setIsSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Close menu when clicking outside
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

  const handleCategoriesMouseEnter = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout)
    setIsCategoriesOpen(true)
  }

  const handleCategoriesMouseLeave = () => {
    const timeout = setTimeout(() => {
      setIsCategoriesOpen(false)
    }, 300) // Increased delay for better UX
    setHoverTimeout(timeout)
  }

  // Cart component
  const CartButton = ({ className = '' }) => {
    const count = summary?.itemCount ?? 0
    const label = count > 99 ? '99+' : String(count)

    return (
      <Link
        href='/cart'
        className={`flex items-center space-x-2 text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium relative ${className}`}
      >
        <svg
          className='h-8 w-8'
          viewBox='0 0 24 24'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
          aria-hidden='true'
        >
          {count <= 0 && (
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
          {count > 0 && (
            <text
              x='14'
              y='9.25'
              textAnchor='middle'
              dominantBaseline='middle'
              fontSize={count > 9 ? 7 : 8}
              fontWeight='500'
              fill='#000000'
              style={{
                fontFamily:
                  'system-ui, -apple-system, Segoe UI, Roboto, Arial',
              }}
            >
              {label}
            </text>
          )}
        </svg>
        <span>Cart</span>
      </Link>
    )
  }

  return (
    <nav className='hidden lg:block fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200'>
      {/* Main navigation */}
      <div
        className={`max-w-full px-4 sm:px-6 lg:px-8 relative z-20 transition-all duration-300 ${
          showSecondaryNav ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div
          className={`flex justify-between items-center transition-all duration-300 ${
            showSecondaryNav ? 'h-16' : 'h-14'
          }`}
        >
          {/* Left section - Logo + Location */}
          <div className='flex items-center'>
            <div className='flex items-center gap-3 text-black'>
              <span className='text-sm font-semibold tracking-wide'>
                OCPRIMES
              </span>
              <div className='flex items-center gap-2 px-2 py-1 rounded-md'>
                <div className='flex items-center gap-2'>
                  <svg
                    className='h-4 w-4'
                    fill='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z' />
                  </svg>
                  <div className='flex flex-col leading-tight'>
                    <span className='text-xs font-medium'>Shipping to</span>
                    <span className='text-[11px]'>
                      {locationLabel || 'Select a mode'}
                    </span>
                  </div>
                </div>
                <svg
                  className='h-5 w-5'
                  fill='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path d='M7 10l5 5 5-5z' />
                </svg>
              </div>
            </div>
          </div>

          {/* Center section - Toggle Switch */}
            <div className='flex items-center'>
            <div className='relative bg-gray-200 rounded-full p-1 flex'>
              <button className='px-4 py-1.5 rounded-full text-sm font-medium bg-white text-gray-900 shadow-sm transition-all duration-200 flex items-center gap-2'>
                <svg
                  className='h-5 w-5'
                  version='1.1'
                  id='Layer_1'
                  xmlns='http://www.w3.org/2000/svg'
                  xmlnsXlink='http://www.w3.org/1999/xlink'
                  viewBox='0 0 512 512'
                  xmlSpace='preserve'
                  aria-hidden='true'
                >
                  <polygon
                    style={{ fill: '#9D9D9D' }}
                    points='399.635,9.313 256,9.313 245.55,24.555 256,40.66 374.292,40.66 409.601,205.46 440.252,198.893'
                  ></polygon>
                  <polygon
                    style={{ fill: '#D4D4D4' }}
                    points='112.365,9.313 71.748,198.893 102.399,205.46 137.708,40.66 256,40.66 256,9.313'
                  ></polygon>
                  <path
                    style={{ fill: '#D61322' }}
                    d='M256,202.177l-10.45,150.255L256,502.686h119.993c53.403,0,96.694-43.291,96.694-96.694V202.177H256z M328.073,417.497c0,12.984-10.525,23.51-23.51,23.51l0,0c-12.984,0-23.51-10.526-23.51-23.51v-144.76 c0-12.984,10.526-23.51,23.51-23.51l0,0c12.984,0,23.51,10.526,23.51,23.51V417.497z M425.197,417.497 c0,12.984-10.526,23.51-23.51,23.51l0,0c-12.985,0-23.51-10.526-23.51-23.51v-144.76c0-12.984,10.525-23.51,23.51-23.51l0,0 c12.984,0,23.51,10.526,23.51,23.51V417.497z'
                  ></path>
                  <path
                    style={{ fill: '#EC2533' }}
                    d='M39.313,202.177v203.817c0,53.403,43.291,96.694,96.694,96.694H256V202.177H39.313z M133.823,417.497 c0,12.984-10.525,23.51-23.51,23.51l0,0c-12.984,0-23.51-10.526-23.51-23.51v-144.76c0-12.984,10.526-23.51,23.51-23.51l0,0 c12.985,0,23.51,10.526,23.51,23.51V417.497z M207.437,441.007L207.437,441.007c-12.985,0-23.51-10.526-23.51-23.51v-144.76 c0-12.984,10.525-23.51,23.51-23.51l0,0c12.984,0,23.51,10.526,23.51,23.51v144.76C230.948,430.481,220.421,441.007,207.437,441.007 z'
                  ></path>
                  <polygon
                    style={{ fill: '#6F6F6F' }}
                    points='512,186.503 256,186.503 235.101,202.177 256,217.85 512,217.85'
                  ></polygon>
                  <rect
                    y='186.503'
                    style={{ fill: '#9D9D9D' }}
                    width='256'
                    height='31.347'
                  ></rect>
                </svg>
                Shop
              </button>
              <button className='px-4 py-1.5 rounded-full text-sm font-medium text-gray-500 hover:text-gray-700 transition-all duration-200 flex items-center gap-2'>
                <svg
                  className='h-4 w-4'
                  version='1.1'
                  xmlns='http://www.w3.org/2000/svg'
                  xmlnsXlink='http://www.w3.org/1999/xlink'
                  viewBox='0 0 64 64'
                  xmlSpace='preserve'
                  aria-hidden='true'
                >
                  <style type='text/css'>
                    {'.st0{fill:#ffffff;} .st1{opacity:0.2;} .st2{fill:#231F20;} .st3{fill:#C75C5C;}'}
                  </style>
                  <g id='Layer_1'>
                    <g>
                      <circle className='st0' cx='32' cy='32' r='32'></circle>
                    </g>
                    <g className='st1'>
                      <g>
                        <path
                          className='st2'
                          d='M47.8,17C47.8,17,47.8,17,47.8,17c-0.1,0-0.1,0-0.1,0H32.2c-0.4,0-1.2,0.6-1.3,0.7L12.7,35.9 c-1,1-1,2.5,0,3.5l13.9,13.9c0.5,0.5,1.1,0.7,1.7,0.7c0.6,0,1.3-0.2,1.7-0.7l18.1-18.1c0.1-0.1,0.7-0.9,0.7-1.3V18.2 C49,17.5,48.5,17,47.8,17z M44,24c-1.1,0-2-0.9-2-2s0.9-2,2-2s2,0.9,2,2S45.1,24,44,24z'
                        ></path>
                      </g>
                    </g>
                    <g>
                      <g>
                        <path
                          className='st3'
                          d='M47.8,15C47.8,15,47.8,15,47.8,15c-0.1,0-0.1,0-0.1,0H32.2c-0.4,0-1.2,0.6-1.3,0.7L12.7,33.9 c-1,1-1,2.5,0,3.5l13.9,13.9c0.5,0.5,1.1,0.7,1.7,0.7c0.6,0,1.3-0.2,1.7-0.7l18.1-18.1c0.1-0.1,0.7-0.9,0.7-1.3V16.2 C49,15.5,48.5,15,47.8,15z M44,22c-1.1,0-2-0.9-2-2s0.9-2,2-2s2,0.9,2,2S45.1,22,44,22z'
                        ></path>
                      </g>
                    </g>
                  </g>
                  <g id='Layer_2'></g>
                </svg>
                Wholesale
              </button>
            </div>
          </div>

          {/* Right section - Cart and User (only show when secondary nav is visible) */}
          <div className='flex items-center space-x-4'>
            {/* Cart - show only when secondary nav is visible */}
            {showSecondaryNav && <CartButton />}

            {/* User profile */}
            <UserMenu />
          </div>
        </div>
      </div>

      {/* Secondary navigation - Categories section */}
      <div
        className={`bg-gray-50 border-b border-gray-200 transition-all duration-300 absolute top-0 left-0 right-0 ${
          showSecondaryNav
            ? 'translate-y-16 opacity-100'
            : 'translate-y-0 opacity-100'
        }`}
        style={{
          width: '100%',
          zIndex: 30,
        }}
      >
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative'>
          <div className='flex items-center justify-between h-14'>
            {/* Categories title with icon */}
            <div
              className='flex items-center space-x-2'
              ref={categoriesRef}
              onMouseEnter={handleCategoriesMouseEnter}
              onMouseLeave={handleCategoriesMouseLeave}
            >
              <button
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                  isCategoriesOpen
                    ? 'bg-gray-100 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
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
                    d='M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'
                  />
                </svg>
                <h2 className='text-xl font-semibold'>Categories</h2>
                <svg
                  className={`h-4 w-4 transition-transform duration-200 ${
                    isCategoriesOpen ? 'rotate-180' : ''
                  }`}
                  fill='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path d='M7 10l5 5 5-5z' />
                </svg>
              </button>
            </div>

            {/* Category filters */}
            <div className='flex items-center space-x-8'>
              <button className='flex items-center space-x-2 text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium border-b-2 border-blue-500 text-blue-600'>
                <svg
                  className='h-4 w-4'
                  fill='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
                </svg>
                <span>All</span>
              </button>
              <button className='flex items-center space-x-2 text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium'>
                <svg
                  className='h-4 w-4'
                  fill='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' />
                </svg>
                <span>Men</span>
              </button>
              <button className='flex items-center space-x-2 text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium'>
                <svg
                  className='h-4 w-4'
                  fill='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' />
                </svg>
                <span>Women</span>
              </button>
            </div>

            {/* Filters, Search, and Cart (when secondary nav is hidden) */}
            <div className='flex items-center space-x-4'>
              {/* Cart - show only when secondary nav is hidden */}
              {!showSecondaryNav && <CartButton />}

              {!isSearchOpen && (
                <button className='text-gray-700 hover:text-gray-900 px-3 py-2 text-lg font-semibold flex items-center space-x-2'>
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
                </button>
              )}
              {isSearchOpen ? (
                <div className='relative' ref={searchContainerRef}>
                  <input
                    type='text'
                    placeholder='Search OCPRIMES'
                    autoFocus
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className='h-10 w-80 rounded-full border border-gray-300 bg-white pl-4 pr-10 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10'
                  />
                  <button
                    type='button'
                    className='absolute right-1 top-1 h-8 w-8 rounded-full bg-gray-900 text-white flex items-center justify-center'
                    aria-label='Search'
                    onClick={() => handleSearchSubmit(searchValue)}
                  >
                    <svg
                      className='h-4 w-4'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                      />
                    </svg>
                  </button>
                  <div
                    className='absolute right-0 mt-3 w-[420px] rounded-2xl border border-gray-200 bg-white shadow-lg p-4 z-50'
                    onMouseDown={(event) => event.preventDefault()}
                  >
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
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={1.5}
                            d='M20.5001 6H3.5'
                            stroke='#000000'
                          />
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={1.5}
                            d='M9.5 11L10 16'
                            stroke='#000000'
                          />
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={1.5}
                            d='M14.5 11L14 16'
                            stroke='#000000'
                          />
                          <path
                            strokeWidth={1.5}
                            d='M6.5 6C6.55588 6 6.58382 6 6.60915 5.99936C7.43259 5.97849 8.15902 5.45491 8.43922 4.68032C8.44784 4.65649 8.45667 4.62999 8.47434 4.57697L8.57143 4.28571C8.65431 4.03708 8.69575 3.91276 8.75071 3.8072C8.97001 3.38607 9.37574 3.09364 9.84461 3.01877C9.96213 3 10.0932 3 10.3553 3H13.6447C13.9068 3 14.0379 3 14.1554 3.01877C14.6243 3.09364 15.03 3.38607 15.2493 3.8072C15.3043 3.91276 15.3457 4.03708 15.4286 4.28571L15.5257 4.57697C15.5433 4.62992 15.5522 4.65651 15.5608 4.68032C15.841 5.45491 16.5674 5.97849 17.3909 5.99936C17.4162 6 17.4441 6 17.5 6'
                            stroke='#000000'
                          />
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={1.5}
                            d='M18.3735 15.3991C18.1965 18.054 18.108 19.3815 17.243 20.1907C16.378 21 15.0476 21 12.3868 21H11.6134C8.9526 21 7.6222 21 6.75719 20.1907C5.89218 19.3815 5.80368 18.054 5.62669 15.3991L5.16675 8.5M18.8334 8.5L18.6334 11.5'
                            stroke='#000000'
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
              ) : (
                <button
                  className='text-gray-700 hover:text-gray-900 p-2'
                  onClick={() => setIsSearchOpen(true)}
                  aria-label='Open search'
                >
                  <svg
                    className='h-5 w-5'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div
            ref={menuRef}
            className={`absolute top-14 left-0 right-0 z-40 ${
              showSecondaryNav ? '' : 'hidden'
            }`}
            onMouseEnter={handleCategoriesMouseEnter}
            onMouseLeave={handleCategoriesMouseLeave}
          >
            <CategoriesMenu
              isOpen={isCategoriesOpen}
              onClose={() => setIsCategoriesOpen(false)}
            />
          </div>
        </div>
      </div>
    </nav>
  )
}
