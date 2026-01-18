// components/mobile/MobileNavbar.jsx
'use client'
import Link from 'next/link'
import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { useSidebar } from '../../context/SidebarContext'
import dynamic from 'next/dynamic'
import { useCart } from '../../context/CartContext'

// Lazy load CategoriesMenu since it's not immediately visible
const CategoriesMenu = dynamic(() => import('../Catergories/CategoriesMenu'), {
  loading: () => null, // No loading spinner needed
})

function MobileNavbar() {
  const { isOpen, toggleSidebar } = useSidebar()
  const { summary } = useCart()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false)
  const searchRef = useRef(null)

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
                  className='h-6 w-6'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M3 3h2l.4 2M7 13h10l4-8H5.4m.6 16a1 1 0 11-2 0 1 1 0 012 0zm10 0a1 1 0 11-2 0 1 1 0 012 0z'
                  />
                </svg>
                {/* Cart badge */}
                {summary.itemCount > 0 && (
                  <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center'>
                    {summary.itemCount}
                  </span>
                )}
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
              {['Women', 'Men', 'Home', 'Sports', 'Jewelry'].map((item) => (
                <Link
                  key={item}
                  href='#'
                  className='text-sm text-gray-600 hover:text-gray-900 pb-2 whitespace-nowrap'
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Location Bar */}
        <div className='bg-gray-50 border-b border-gray-200'>
          <div className='px-4 py-2'>
            <div className='flex items-center space-x-2 text-gray-700'>
              <svg className='h-4 w-4' fill='currentColor' viewBox='0 0 24 24'>
                <path d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z' />
              </svg>
              <div className='flex items-center justify-between w-full'>
                <div className='flex flex-col'>
                  <span className='text-sm font-medium'>
                    Pickup or delivery?
                  </span>
                  <span className='text-xs text-gray-500'>
                    Sacramento, 95829 • Store
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
                    placeholder='Phone case with flip glass'
                    className='w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent'
                    autoFocus
                  />
                  <button className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400'>
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

            {/* Search suggestions */}
            <div className='p-4'>
              <div className='text-sm text-gray-500 mb-2'>Recent searches</div>
              <div className='space-y-2'>
                <div className='flex items-center space-x-2 text-gray-700'>
                  <svg
                    className='h-4 w-4'
                    fill='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' />
                  </svg>
                  <span>phone case with flip glass</span>
                </div>
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
