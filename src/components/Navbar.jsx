// components/Navbar.jsx
'use client'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useSidebar } from '../context/SidebarContext'
import CategoriesMenu from './Catergories/CategoriesMenu'

export default function Navbar() {
  const { isOpen } = useSidebar()
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false)
  const [hoverTimeout, setHoverTimeout] = useState(null)
  const [showSecondaryNav, setShowSecondaryNav] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const categoriesRef = useRef(null)
  const menuRef = useRef(null)

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
  const CartButton = ({ className = '' }) => (
    <button
      className={`flex items-center space-x-2 text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium relative ${className}`}
    >
      <svg
        className='h-6 w-6'
        fill='none'
        stroke='currentColor'
        viewBox='0 0 24 24'
        strokeWidth={1.5}
      >
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          d='M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z'
        />
      </svg>
      <span>Cart</span>
    </button>
  )

  return (
    <nav className='hidden lg:block fixed top-0 right-0 left-16 z-30 bg-white border-b border-gray-200'>
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
          {/* Left section - Location */}
          <div className='flex items-center'>
            <div className='flex items-center space-x-2 text-black px-4 py-2 rounded-lg'>
              <div className='flex items-center space-x-2'>
                <svg
                  className='h-5 w-5'
                  fill='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z' />
                </svg>
                <div className='flex flex-col'>
                  <span className='text-sm font-medium'>
                    Pickup or delivery?
                  </span>
                  <span className='text-xs'>Sacramento, 95829 • Store</span>
                </div>
              </div>
              <svg
                className='h-4 w-4 ml-2'
                fill='currentColor'
                viewBox='0 0 24 24'
              >
                <path d='M7 10l5 5 5-5z' />
              </svg>
            </div>
          </div>

          {/* Center section - Toggle Switch */}
          <div className='flex items-center'>
            <div className='relative bg-gray-200 rounded-full p-1 flex'>
              <button className='px-4 py-2 rounded-full text-sm font-medium bg-white text-gray-900 shadow-sm transition-all duration-200'>
                Dashboard
              </button>
              <button className='px-4 py-2 rounded-full text-sm font-medium text-gray-500 hover:text-gray-700 transition-all duration-200'>
                Showcase
              </button>
            </div>
          </div>

          {/* Right section - Cart and User (only show when secondary nav is visible) */}
          <div className='flex items-center space-x-4'>
            {/* Cart - show only when secondary nav is visible */}
            {showSecondaryNav && <CartButton />}

            {/* User profile */}
            <div className='flex items-center space-x-3'>
              <div className='flex items-center space-x-2'>
                <div className='w-8 h-8 bg-pink-400 rounded-full flex items-center justify-center'>
                  <svg
                    className='h-5 w-5 text-white'
                    fill='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' />
                  </svg>
                </div>
                <span className='text-gray-700 text-sm font-medium'>Ryana</span>
              </div>
            </div>
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
        ref={categoriesRef}
        onMouseEnter={handleCategoriesMouseEnter}
        onMouseLeave={handleCategoriesMouseLeave}
      >
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative'>
          <div className='flex items-center justify-between h-14'>
            {/* Categories title with icon */}
            <div className='flex items-center space-x-2'>
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

              <button className='text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium flex items-center space-x-1'>
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
                    d='M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z'
                  />
                </svg>
                <span>Filters</span>
              </button>
              <button className='text-gray-700 hover:text-gray-900 p-2'>
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
            </div>
          </div>
          <div
            ref={menuRef}
            className={`absolute top-14 left-0 right-0 z-40 ${
              showSecondaryNav ? '' : 'hidden'
            }`}
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
