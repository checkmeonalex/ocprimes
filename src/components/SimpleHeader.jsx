'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import BrandLogo from './common/BrandLogo'
import UserMenu from './auth/UserMenu'
import { useCart } from '../context/CartContext'
import { reportSearchQuery } from '@/components/search/reportSearchQuery'

/**
 * Simplified storefront header: shop-focused links on the left, centered
 * brand logo, and account actions on the right. Product categories are
 * intentionally not surfaced here — the storefront promotes vendor shops
 * rather than category browsing.
 */
export default function SimpleHeader({ initialAuthUser = null, embedded = false }) {
  const router = useRouter()
  const { summary, isReady, isServerReady } = useCart()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const searchInputRef = useRef(null)

  const cartCount = summary?.itemCount ?? 0
  const showCartLoadingSpinner = (!isReady || !isServerReady) && cartCount <= 0

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false)
    setSearchValue('')
  }, [])

  useEffect(() => {
    if (!isSearchOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeSearch()
    }
    document.addEventListener('keydown', onKeyDown)
    searchInputRef.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isSearchOpen, closeSearch])

  const submitSearch = (event) => {
    event?.preventDefault()
    const trimmed = searchValue.trim()
    if (!trimmed) return
    void reportSearchQuery(trimmed)
    router.push(`/products?search=${encodeURIComponent(trimmed)}`)
    closeSearch()
  }

  return (
    <>
      <nav
        className={`border-b border-gray-200 bg-white ${
          embedded ? 'block' : 'fixed left-0 right-0 top-0 z-40 hidden lg:block'
        }`}
      >
        <div className='mx-auto grid h-16 w-full max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6 lg:px-8'>
          {/* Left: shop-focused links */}
          <div className='flex items-center gap-5'>
            <Link
              href='/stores'
              className='text-sm font-medium text-gray-900 transition hover:text-gray-500'
            >
              Shops
            </Link>
            <Link
              href='/products'
              className='text-sm font-medium text-gray-900 transition hover:text-gray-500'
            >
              Browse
            </Link>
            <Link
              href='/sellersignup'
              className='text-sm font-medium text-gray-900 transition hover:text-gray-500'
            >
              Sell
            </Link>
          </div>

          {/* Center: brand */}
          <BrandLogo
            href='/'
            className='inline-flex items-center justify-center gap-2 text-gray-900'
            markClassName='h-8 w-8 shrink-0 text-[#f5d10b]'
            labelClassName='text-xl font-semibold tracking-tight text-current'
          />

          {/* Right: actions */}
          <div className='flex items-center justify-end gap-1'>
            <button
              type='button'
              onClick={() => setIsSearchOpen(true)}
              aria-label='Search'
              className='inline-flex items-center rounded-md p-2 text-gray-900 transition hover:bg-gray-100'
            >
              <svg className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth={1.8} viewBox='0 0 24 24' aria-hidden='true'>
                <circle cx='11' cy='11' r='7' />
                <path strokeLinecap='round' d='m20 20-3.2-3.2' />
              </svg>
            </button>

            <Link
              href='/wishlist'
              aria-label='Wishlist'
              className='inline-flex items-center rounded-md p-2 text-gray-900 transition hover:bg-gray-100'
            >
              <svg className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth={1.8} viewBox='0 0 24 24' aria-hidden='true'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M12 21s-6.716-4.517-9.038-8.187C.13 8.342 2.72 3 7.2 3c2.159 0 3.54 1.112 4.8 2.797C13.26 4.112 14.642 3 16.8 3 21.28 3 23.87 8.342 21.038 12.813 18.716 16.483 12 21 12 21z'
                />
              </svg>
            </Link>

            <UserMenu variant='compactChip' initialAuthUser={initialAuthUser} />

            <Link
              href='/cart'
              aria-label='Shopping cart'
              className='relative inline-flex items-center rounded-md p-1 text-gray-700 transition hover:text-gray-900'
            >
              <svg
                className='h-9 w-9'
                viewBox='0 0 24 24'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
                aria-hidden='true'
              >
                {showCartLoadingSpinner ? (
                  <g>
                    <circle cx='14' cy='8' r='2.2' fill='none' stroke='#000000' strokeWidth='1.4' opacity='0.25' />
                    <g>
                      <path
                        d='M14 5.8a2.2 2.2 0 0 1 2.2 2.2'
                        fill='none'
                        stroke='#000000'
                        strokeWidth='1.4'
                        strokeLinecap='round'
                      />
                      <animateTransform
                        attributeName='transform'
                        type='rotate'
                        from='0 14 8'
                        to='360 14 8'
                        dur='0.75s'
                        repeatCount='indefinite'
                      />
                    </g>
                  </g>
                ) : cartCount > 0 ? null : (
                  <path
                    d='M14,12a1,1,0,0,1-1-1V9H11a1,1,0,0,1,0-2h2V5a1,1,0,0,1,2,0V7h2a1,1,0,0,1,0,2H15v2A1,1,0,0,1,14,12Z'
                    fill='#000000'
                  />
                )}
                <path
                  d='M17,19a1.5,1.5,0,1,0,1.5,1.5A1.5,1.5,0,0,0,17,19Zm-6,0a1.5,1.5,0,1,0,1.5,1.5A1.5,1.5,0,0,0,11,19Z'
                  fill='#000000'
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
                    style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial' }}
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </text>
                )}
              </svg>
            </Link>
          </div>
        </div>
      </nav>

      {/* Search overlay */}
      {isSearchOpen ? (
        <div className='fixed inset-0 z-50 hidden lg:block'>
          <button
            type='button'
            aria-label='Close search'
            onClick={closeSearch}
            className='absolute inset-0 h-full w-full cursor-default bg-gray-900/40'
          />
          <div className='relative mx-auto mt-24 w-full max-w-2xl px-4'>
            <form onSubmit={submitSearch} className='flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow-xl'>
              <svg className='h-5 w-5 shrink-0 text-gray-400' fill='none' stroke='currentColor' strokeWidth={1.8} viewBox='0 0 24 24' aria-hidden='true'>
                <circle cx='11' cy='11' r='7' />
                <path strokeLinecap='round' d='m20 20-3.2-3.2' />
              </svg>
              <input
                ref={searchInputRef}
                type='search'
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder='Search shops and products'
                aria-label='Search shops and products'
                className='h-8 flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400'
              />
              <button
                type='button'
                onClick={closeSearch}
                aria-label='Close search'
                className='shrink-0 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700'
              >
                <svg className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth={2} viewBox='0 0 24 24' aria-hidden='true'>
                  <path strokeLinecap='round' d='M6 6l12 12M18 6L6 18' />
                </svg>
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
