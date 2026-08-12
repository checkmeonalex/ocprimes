'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import VendorCollectionsMenu from '@/components/vendor/VendorCollectionsMenu';
import { VendorLogo } from '@/components/vendor/VendorHeaderShared';
import VendorFloatingFollow from '@/components/vendor/VendorFloatingFollow';
import VendorConnectMenu from '@/components/vendor/VendorConnectMenu';
import { useOptionalCart } from '@/context/CartContext';

const HEADER_H = 56;
const MARQUEE_H = 24;

export default function PrestigeVendorHeader({
  vendorProfile,
  onFollow,
  isFollowing,
  isFollowLoading,
  canFollow,
  canEditStorefront = false,
  onMessage,
  categoryTree = [],
  showCollectionsMenu = true,
  collectionsMenuMode = 'grouped',
  activeCategorySlug = '',
  searchValue = '',
  setSearchValue,
  floatingFollowBottomOffset = 0,
}) {
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const followBtnRef = useRef(null);
  const storeName = vendorProfile?.name || '';
  const cart = useOptionalCart();
  const cartCount = cart?.summary?.itemCount ?? 0;

  return (
    <>
      {/* ── Prestige vendor sub-header — the main site navbar is fully unmounted on
          vendor pages, so this header is always the only header shown. ─── */}
      <header
        className="fixed left-0 right-0 top-0 z-[39] bg-white border-b border-gray-200 block"
      >
        <div className="mx-auto max-w-7xl px-0 sm:px-6 lg:px-8">

          {/* ── MOBILE layout ─── */}
          <div className="relative flex sm:hidden items-center justify-between" style={{ height: HEADER_H }}>
            {/* Left: hamburger/shop + search */}
            {!isSearchOpen && (
              <div className="flex items-center">
                {showCollectionsMenu ? (
                  <button type="button" onClick={() => setIsCollectionsOpen(true)}
                    className="flex items-center justify-center h-11 w-11 min-[375px]:h-12 min-[375px]:w-12 text-gray-500 hover:text-gray-900 transition-colors"
                    aria-label="Menu">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 min-[375px]:h-6 min-[375px]:w-6" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 6h16M4 12h16M4 18h7" strokeLinecap="round" />
                    </svg>
                  </button>
                ) : (
                  <Link href={`/${vendorProfile?.slug}`}
                    className="flex items-center justify-center h-11 w-11 min-[375px]:h-12 min-[375px]:w-12 text-gray-500 hover:text-gray-900 transition-colors"
                    aria-label="Visit store">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 min-[375px]:h-6 min-[375px]:w-6">
                      <path d="M22 22H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path opacity="0.5" d="M20 22V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path opacity="0.5" d="M4 22V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M16.5278 2H7.47214C6.26932 2 5.66791 2 5.18461 2.2987C4.7013 2.5974 4.43234 3.13531 3.89443 4.21114L2.49081 7.75929C2.16652 8.57905 1.88279 9.54525 2.42867 10.2375C2.79489 10.7019 3.36257 11 3.99991 11C5.10448 11 5.99991 10.1046 5.99991 9C5.99991 10.1046 6.89534 11 7.99991 11C9.10448 11 9.99991 10.1046 9.99991 9C9.99991 10.1046 10.8953 11 11.9999 11C13.1045 11 13.9999 10.1046 13.9999 9C13.9999 10.1046 14.8953 11 15.9999 11C17.1045 11 17.9999 10.1046 17.9999 9C17.9999 10.1046 18.8953 11 19.9999 11C20.6373 11 21.205 10.7019 21.5712 10.2375C22.1171 9.54525 21.8334 8.57905 21.5091 7.75929L20.1055 4.21114C19.5676 3.13531 19.2986 2.5974 18.8153 2.2987C18.332 2 17.7306 2 16.5278 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                      <path opacity="0.5" d="M9.5 21.5V18.5C9.5 17.5654 9.5 17.0981 9.70096 16.75C9.83261 16.522 10.022 16.3326 10.25 16.201C10.5981 16 11.0654 16 12 16C12.9346 16 13.4019 16 13.75 16.201C13.978 16.3326 14.1674 16.522 14.299 16.75C14.5 17.0981 14.5 17.5654 14.5 18.5V21.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </Link>
                )}
                <button type="button" onClick={() => setIsSearchOpen(true)}
                  className="flex items-center justify-center h-11 w-8 min-[375px]:h-12 min-[375px]:w-9 text-gray-500 hover:text-gray-900 transition-colors -ml-2"
                  aria-label="Search">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 min-[375px]:h-6 min-[375px]:w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="11" cy="11" r="6" /><path d="m15.5 15.5 4 4" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )}

            {/* Expanded mobile search bar — replaces the centered logo row */}
            {isSearchOpen && (
              <div className="absolute inset-x-0 flex items-center gap-1.5 px-2">
                <input autoFocus type="search" value={searchValue}
                  onChange={(e) => setSearchValue?.(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && (setIsSearchOpen(false), setSearchValue?.(''))}
                  placeholder="Search…"
                  className="h-9 flex-1 rounded-full border border-gray-300 bg-gray-50 px-3.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-gray-300" />
                <button type="button" onClick={() => { setIsSearchOpen(false); setSearchValue?.('') }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center text-gray-400 hover:text-gray-900">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )}

            {/* Center: logo (absolutely centered regardless of side widths) */}
            <div className={`absolute left-1/2 -translate-x-1/2 flex items-center transition-opacity duration-150 ${isSearchOpen ? 'invisible opacity-0' : 'opacity-100'}`}>
              <Link href={`/${vendorProfile?.slug}`} className="flex items-center gap-1.5">
                <VendorLogo
                  name={storeName}
                  logoUrl={vendorProfile?.logoUrl}
                  logoFullUrl={vendorProfile?.logoFullUrl}
                  logoFont={vendorProfile?.logoFont}
                  logoSizeDesktop={vendorProfile?.logoSizeDesktop}
                  logoSizeMobile={vendorProfile?.logoSizeMobile}
                  isLight={false}
                />
                {vendorProfile?.isTrusted && !vendorProfile?.logoFullUrl && (
                  <img src={vendorProfile.trustedBadgeUrl || '/icons/verification/vendor-verified-badge.png'}
                    alt="Verified" className="h-6 w-6 shrink-0" />
                )}
              </Link>
            </div>

            {/* Right: account, wishlist, cart icons on mobile */}
            <div className={`flex items-center gap-1 min-[390px]:gap-2 min-[430px]:gap-3 pr-1 transition-opacity duration-150 ${isSearchOpen ? 'invisible opacity-0' : 'opacity-100'}`}>
              <Link href="/account"
                className="flex h-8 w-5 min-[375px]:h-9 min-[375px]:w-7 min-[430px]:h-10 min-[430px]:w-8 items-center justify-center text-gray-500 hover:text-gray-900 transition-colors" aria-label="Account">
                <svg className="h-4 w-4 min-[375px]:h-5 min-[375px]:w-5 min-[430px]:h-6 min-[430px]:w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5Z" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M4 21c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </Link>
              <Link href="/wishlist"
                className="flex h-8 w-5 min-[375px]:h-9 min-[375px]:w-7 min-[430px]:h-10 min-[430px]:w-8 items-center justify-center text-gray-500 hover:text-gray-900 transition-colors" aria-label="Wishlist">
                <svg className="h-4 w-4 min-[375px]:h-5 min-[375px]:w-5 min-[430px]:h-6 min-[430px]:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6.716-4.517-9.038-8.187C.13 8.342 2.72 3 7.2 3c2.159 0 3.54 1.112 4.8 2.797C13.26 4.112 14.642 3 16.8 3 21.28 3 23.87 8.342 21.038 12.813 18.716 16.483 12 21 12 21z" />
                </svg>
              </Link>
              <Link href="/cart"
                className="relative flex h-8 w-5 min-[375px]:h-9 min-[375px]:w-7 min-[430px]:h-10 min-[430px]:w-8 items-center justify-center text-gray-500 hover:text-gray-900 transition-colors" aria-label="Cart">
                <svg className="h-4 w-4 min-[375px]:h-5 min-[375px]:w-5 min-[430px]:h-6 min-[430px]:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M6.5 8H17.5L18.5 21H5.5L6.5 8Z" strokeLinejoin="round" />
                  <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute top-0.5 right-0 min-w-[15px] h-[15px] flex items-center justify-center rounded-full bg-red-600 px-0.5 text-[9px] font-bold leading-none text-white">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* ── DESKTOP layout ─── */}
          <div className="hidden sm:flex relative items-center justify-between" style={{ height: HEADER_H }}>
            {/* Left */}
            <div className="flex items-center gap-3 flex-1">
              {showCollectionsMenu ? (
                <button type="button" onClick={() => setIsCollectionsOpen(true)}
                  className="flex items-center justify-center h-10 w-10 text-gray-500 hover:text-gray-900 transition-colors"
                  aria-label="Menu">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16M4 12h16M4 18h7" strokeLinecap="round" />
                  </svg>
                </button>
              ) : (
                <Link href={`/${vendorProfile?.slug}`}
                  className="flex items-center justify-center h-10 w-10 text-gray-500 hover:text-gray-900 transition-colors"
                  aria-label="Visit store">
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 shrink-0">
                    <path d="M22 22H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path opacity="0.5" d="M20 22V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path opacity="0.5" d="M4 22V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M16.5278 2H7.47214C6.26932 2 5.66791 2 5.18461 2.2987C4.7013 2.5974 4.43234 3.13531 3.89443 4.21114L2.49081 7.75929C2.16652 8.57905 1.88279 9.54525 2.42867 10.2375C2.79489 10.7019 3.36257 11 3.99991 11C5.10448 11 5.99991 10.1046 5.99991 9C5.99991 10.1046 6.89534 11 7.99991 11C9.10448 11 9.99991 10.1046 9.99991 9C9.99991 10.1046 10.8953 11 11.9999 11C13.1045 11 13.9999 10.1046 13.9999 9C13.9999 10.1046 14.8953 11 15.9999 11C17.1045 11 17.9999 10.1046 17.9999 9C17.9999 10.1046 18.8953 11 19.9999 11C20.6373 11 21.205 10.7019 21.5712 10.2375C22.1171 9.54525 21.8334 8.57905 21.5091 7.75929L20.1055 4.21114C19.5676 3.13531 19.2986 2.5974 18.8153 2.2987C18.332 2 17.7306 2 16.5278 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    <path opacity="0.5" d="M9.5 21.5V18.5C9.5 17.5654 9.5 17.0981 9.70096 16.75C9.83261 16.522 10.022 16.3326 10.25 16.201C10.5981 16 11.0654 16 12 16C12.9346 16 13.4019 16 13.75 16.201C13.978 16.3326 14.1674 16.522 14.299 16.75C14.5 17.0981 14.5 17.5654 14.5 18.5V21.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </Link>
              )}
            </div>

            {/* Center */}
            <div className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-2 transition-opacity duration-150 ${isSearchOpen ? 'invisible opacity-0' : 'opacity-100'}`}>
              <Link href={`/${vendorProfile?.slug}`} className="flex items-center gap-2.5">
                <VendorLogo name={storeName} logoUrl={vendorProfile?.logoUrl}
                  logoFullUrl={vendorProfile?.logoFullUrl} logoFont={vendorProfile?.logoFont}
                  logoSizeDesktop={vendorProfile?.logoSizeDesktop} logoSizeMobile={vendorProfile?.logoSizeMobile} isLight={false} />
                {vendorProfile?.isTrusted && !vendorProfile?.logoFullUrl && (
                  <img src={vendorProfile.trustedBadgeUrl || '/icons/verification/vendor-verified-badge.png'}
                    alt="Verified" className="h-6 w-6 shrink-0" />
                )}
              </Link>
            </div>

            {/* Right */}
            <div className="flex flex-1 items-center justify-end gap-1">
              {isSearchOpen ? (
                <div className="flex items-center gap-1.5">
                  <input autoFocus type="search" value={searchValue}
                    onChange={(e) => setSearchValue?.(e.target.value)}
                    onKeyDown={(e) => e.key === 'Escape' && (setIsSearchOpen(false), setSearchValue?.(''))}
                    placeholder="Search…"
                    className="h-8 w-48 rounded-full border border-gray-300 bg-gray-50 px-3 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-gray-300" />
                  <button type="button" onClick={() => { setIsSearchOpen(false); setSearchValue?.('') }}
                    className="text-gray-400 hover:text-gray-900">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setIsSearchOpen(true)}
                  className="flex h-9 w-9 items-center justify-center text-gray-400 hover:text-gray-900 transition-colors" aria-label="Search">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="11" cy="11" r="6" /><path d="m15.5 15.5 4 4" strokeLinecap="round" />
                  </svg>
                </button>
              )}
              {!isSearchOpen && (
                <div className="flex items-center gap-0.5">
                  <Link href="/account"
                    className="flex h-9 w-9 items-center justify-center text-gray-500 hover:text-gray-900 transition-colors" aria-label="Account">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5Z" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M4 21c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </Link>
                  <Link href="/wishlist"
                    className="flex h-9 w-9 items-center justify-center text-gray-500 hover:text-gray-900 transition-colors" aria-label="Wishlist">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6.716-4.517-9.038-8.187C.13 8.342 2.72 3 7.2 3c2.159 0 3.54 1.112 4.8 2.797C13.26 4.112 14.642 3 16.8 3 21.28 3 23.87 8.342 21.038 12.813 18.716 16.483 12 21 12 21z" />
                    </svg>
                  </Link>
                  <Link href="/cart"
                    className="relative flex h-9 w-9 items-center justify-center text-gray-500 hover:text-gray-900 transition-colors" aria-label="Cart">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M6.5 8H17.5L18.5 21H5.5L6.5 8Z" strokeLinejoin="round" />
                      <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {cartCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] flex items-center justify-center rounded-full bg-red-600 px-0.5 text-[9px] font-bold leading-none text-white">
                        {cartCount > 99 ? '99+' : cartCount}
                      </span>
                    )}
                  </Link>
                </div>
              )}
              {!isSearchOpen && canEditStorefront && (
                <Link href="/backend/admin/store-front"
                  className="flex items-center rounded-full border border-gray-300 px-3.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900">
                  Edit
                </Link>
              )}
              {!isSearchOpen && !canEditStorefront && canFollow && (
                <div className="relative">
                  <button type="button" ref={followBtnRef} onClick={() => setIsConnectOpen((o) => !o)} disabled={isFollowLoading}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${isFollowing ? 'border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200' : 'border-gray-900 bg-gray-900 text-white hover:bg-gray-800'}`}>
                    {isFollowLoading ? '…' : isFollowing ? 'Following' : 'Follow'}
                  </button>
                  <VendorConnectMenu
                    isOpen={isConnectOpen}
                    onClose={() => setIsConnectOpen(false)}
                    anchorRef={followBtnRef}
                    vendorName={storeName}
                    social={vendorProfile?.social}
                    isFollowing={isFollowing}
                    isFollowLoading={isFollowLoading}
                    onFollow={onFollow}
                  />
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Prestige marquee strip */}
        <div className="overflow-hidden border-t border-gray-200 bg-gray-50 py-1">
          <div className="flex whitespace-nowrap" style={{ animation: 'prestigeMarquee 18s linear infinite' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="mx-6 text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                {storeName}<span className="mx-3 text-gray-300">✦</span>
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* spacer: only one bar (main nav or vendor header) is ever visible at a time,
          so reserve exactly HEADER_H + MARQUEE_H regardless of viewport size */}
      <div style={{ height: HEADER_H + MARQUEE_H }} />

      <VendorCollectionsMenu isOpen={isCollectionsOpen} onClose={() => setIsCollectionsOpen(false)}
        categoryTree={categoryTree} vendorSlug={vendorProfile?.slug}
        mode={collectionsMenuMode} activeCategorySlug={activeCategorySlug} />

      <style jsx global>{`
        @keyframes prestigeMarquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      <VendorFloatingFollow
        vendorName={storeName}
        vendorSlug={vendorProfile?.slug}
        isFollowing={isFollowing}
        isFollowLoading={isFollowLoading}
        canFollow={canFollow}
        onFollow={onFollow}
        bottomOffset={floatingFollowBottomOffset}
        social={vendorProfile?.social}
      />
    </>
  );
}
