'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useScrollDirection } from '@/hooks/useScrollDirection';

/**
 * VendorStoreHeader - A professional, high-end header for brand storefronts.
 * Implements logic to hide the main site header and remain sticky on scroll-up.
 */
export default function VendorStoreHeader({ 
  vendorProfile, 
  onFollow,
  isFollowing,
  isFollowLoading,
  onMessage,
  searchValue, 
  setSearchValue 
}) {
  const { isScrollingUp, isAtTop, isScrollingDown } = useScrollDirection();
  const [logoFailed, setLogoFailed] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Vendor header is now ALWAYS sticky on both up and down scroll.
  // When at the top, it sits below the main navbar.
  // When scrolling, it moves to the very top (top-0).
  
  const headerTranslate = 'translate-y-0';
  const stickyTop = isAtTop ? 'lg:top-[112px] top-[56px]' : 'top-0';

  return (
    <header 
      className={`fixed left-0 right-0 z-[2147483001] bg-white border-b border-gray-100 transition-all duration-300 ease-in-out ${headerTranslate} ${stickyTop} shadow-sm`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2 lg:h-20 lg:gap-4">
          
          {/* Brand Logo & Name */}
          <div className={`flex items-center gap-2 lg:gap-5 ${isSearchExpanded ? 'hidden sm:flex' : 'flex'}`}>
            <Link href={`/${vendorProfile?.slug}`} className="flex items-center gap-2 group">
              <div className="relative h-9 w-9 lg:h-12 lg:w-12 overflow-hidden rounded-full bg-gray-50 border border-gray-100 shadow-sm transition group-hover:border-gray-300">
                {vendorProfile?.logoUrl && !logoFailed ? (
                  <img
                    src={vendorProfile.logoUrl}
                    alt={vendorProfile?.name}
                    className="h-full w-full object-cover"
                    onError={() => setLogoFailed(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-gray-400 bg-white">
                    {vendorProfile?.name?.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="block">
                <h1 className="text-sm font-bold tracking-tight text-gray-900 lg:text-xl line-clamp-1">
                  {vendorProfile?.name}
                </h1>
                <p className="text-[8px] font-medium uppercase tracking-widest text-gray-400 lg:text-[10px]">
                  Official Store
                </p>
              </div>
            </Link>
          </div>

          {/* Store Search */}
          <div className={`flex-1 transition-all duration-300 ${isSearchExpanded ? 'max-w-full' : 'max-w-0 md:max-w-md overflow-hidden'}`}>
            <div className="relative group flex items-center">
              <input
                type="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onBlur={() => !searchValue && setIsSearchExpanded(false)}
                placeholder={`Search in ${vendorProfile?.name}...`}
                className={`w-full h-10 lg:h-11 rounded-full border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-800 outline-none transition focus:border-black focus:bg-white ${isSearchExpanded ? 'opacity-100' : 'opacity-0 md:opacity-100'}`}
                autoFocus={isSearchExpanded}
              />
              <svg 
                viewBox="0 0 20 20" 
                fill="none" 
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-black hidden md:block" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="m14.5 14.5 3 3" strokeLinecap="round" />
              </svg>
              {isSearchExpanded && (
                <button 
                  onClick={() => { setIsSearchExpanded(false); setSearchValue(''); }}
                  className="ml-2 p-2 text-gray-400 sm:hidden"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          </div>

          {/* Actions & Nav Links */}
          <div className={`flex items-center gap-1.5 lg:gap-4 ${isSearchExpanded ? 'hidden sm:flex' : 'flex'}`}>
            {!isSearchExpanded && (
              <button 
                onClick={() => setIsSearchExpanded(true)}
                className="p-2 text-gray-500 md:hidden"
                aria-label="Open search"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </button>
            )}

            <nav className="hidden md:flex items-center gap-6 mr-4">
              <Link href={`/${vendorProfile?.slug}`} className="text-xs font-bold uppercase tracking-wider text-gray-900 hover:text-gray-500">
                Home
              </Link>
              <Link href={`/${vendorProfile?.slug}?sort=newest`} className="text-xs font-bold uppercase tracking-wider text-gray-900 hover:text-gray-500">
                New Arrivals
              </Link>
              <Link href={`/${vendorProfile?.slug}?sort=price_asc`} className="text-xs font-bold uppercase tracking-wider text-rose-600 hover:text-rose-700">
                Sale
              </Link>
            </nav>
            
            <button
              type="button"
              onClick={onMessage}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 transition hover:bg-gray-50 md:h-10 md:w-auto md:px-4 md:text-xs md:font-bold md:uppercase md:tracking-widest"
            >
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                className="h-4.5 w-4.5 md:mr-2" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="hidden md:inline">Message</span>
            </button>
            
            <button
              type="button"
              onClick={onFollow}
              disabled={isFollowLoading}
              className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-[10px] font-bold uppercase tracking-widest transition shadow-sm md:h-10 md:px-5 md:text-xs ${
                isFollowing
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                  : 'bg-black text-white hover:bg-gray-800'
              } ${!isSearchExpanded ? 'w-9 h-9 md:w-auto md:h-10' : ''}`}
            >
              {isFollowLoading ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : isFollowing ? (
                <span className="md:inline hidden">Following</span>
              ) : (
                <span className="md:inline hidden">Follow</span>
              )}
              {!isFollowLoading && !isSearchExpanded && (
                <svg viewBox="0 0 24 24" fill="none" className={`h-4 w-4 md:hidden ${isFollowing ? 'text-green-600' : 'text-white'}`} stroke="currentColor" strokeWidth="3">
                  {isFollowing ? (
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  ) : (
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
