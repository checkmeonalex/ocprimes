'use client';

import { useState } from 'react';
import Link from 'next/link';
import VendorCollectionsMenu from '@/components/vendor/VendorCollectionsMenu';
import { VendorLogo } from '@/components/vendor/VendorHeaderShared';
import VendorFloatingFollow from '@/components/vendor/VendorFloatingFollow';
import { useOptionalCart } from '@/context/CartContext';
import { useVendorPage } from '@/context/VendorPageContext';

const HEADER_H = 56;
const MARQUEE_H = 24;

export default function BiadVendorHeader({
  vendorProfile,
  onFollow,
  isFollowing,
  isFollowLoading,
  canFollow,
  canEditStorefront = false,
  onMessage,
  categoryTree = [],
  collectionsMenuMode = 'grouped',
  activeCategorySlug = '',
  searchValue = '',
  setSearchValue,
}) {
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const storeName = vendorProfile?.name || '';
  const { isMainNavVisible } = useVendorPage();
  const cart = useOptionalCart();
  const cartCount = cart?.summary?.itemCount ?? 0;

  // Hard swap with the main nav bar on both mobile and desktop — exactly one of the
  // two is ever visible. When shown, the vendor header always sits at the very top.
  const hiddenClass = isMainNavVisible ? 'hidden' : 'block';

  return (
    <>
      {/* ── Biad vendor sub-header — hard swap with main nav, never both visible ─── */}
      <header
        className={`fixed left-0 right-0 top-0 z-[39] bg-[#0a0a0a] border-b border-white/[0.07] ${hiddenClass}`}
      >
        <div className="mx-auto max-w-7xl px-0 sm:px-6 lg:px-8">

          {/* ── MOBILE layout ─── */}
          <div className="relative flex sm:hidden items-center justify-between" style={{ height: HEADER_H }}>
            {/* Left: hamburger + search */}
            {!isSearchOpen && (
              <div className="flex items-center">
                <button type="button" onClick={() => setIsCollectionsOpen(true)}
                  className="flex items-center justify-center h-11 w-11 min-[375px]:h-12 min-[375px]:w-12 text-white/70 hover:text-white transition-colors"
                  aria-label="Menu">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 min-[375px]:h-6 min-[375px]:w-6" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16M4 12h16M4 18h7" strokeLinecap="round" />
                  </svg>
                </button>
                <button type="button" onClick={() => setIsSearchOpen(true)}
                  className="flex items-center justify-center h-11 w-8 min-[375px]:h-12 min-[375px]:w-9 text-white/70 hover:text-white transition-colors -ml-2"
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
                  className="h-9 flex-1 rounded-full border border-white/20 bg-white/10 px-3.5 text-sm text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-white/20" />
                <button type="button" onClick={() => { setIsSearchOpen(false); setSearchValue?.('') }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center text-white/60 hover:text-white">
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
                  isLight
                />
                {vendorProfile?.isTrusted && !vendorProfile?.logoFullUrl && (
                  <img src={vendorProfile.trustedBadgeUrl || '/icons/verification/vendor-verified-badge.png'}
                    alt="Verified" className="h-6 w-6 shrink-0" />
                )}
              </Link>
            </div>

            {/* Right: account, wishlist, cart icons on mobile */}
            <div className={`flex items-center pr-1 transition-opacity duration-150 ${isSearchOpen ? 'invisible opacity-0' : 'opacity-100'}`}>
              <Link href="/account"
                className="flex h-8 w-6 min-[375px]:h-9 min-[375px]:w-7 min-[430px]:h-10 min-[430px]:w-8 items-center justify-center text-white/70 hover:text-white transition-colors" aria-label="Account">
                <svg className="h-4 w-4 min-[375px]:h-5 min-[375px]:w-5 min-[430px]:h-6 min-[430px]:w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5Z" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M4 21c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </Link>
              <Link href="/wishlist"
                className="flex h-8 w-6 min-[375px]:h-9 min-[375px]:w-7 min-[430px]:h-10 min-[430px]:w-8 items-center justify-center text-white/70 hover:text-white transition-colors" aria-label="Wishlist">
                <svg className="h-4 w-4 min-[375px]:h-5 min-[375px]:w-5 min-[430px]:h-6 min-[430px]:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6.716-4.517-9.038-8.187C.13 8.342 2.72 3 7.2 3c2.159 0 3.54 1.112 4.8 2.797C13.26 4.112 14.642 3 16.8 3 21.28 3 23.87 8.342 21.038 12.813 18.716 16.483 12 21 12 21z" />
                </svg>
              </Link>
              <Link href="/cart"
                className="relative flex h-8 w-6 min-[375px]:h-9 min-[375px]:w-7 min-[430px]:h-10 min-[430px]:w-8 items-center justify-center text-white/70 hover:text-white transition-colors" aria-label="Cart">
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
              {categoryTree.length > 0 && (
                <button type="button" onClick={() => setIsCollectionsOpen(true)}
                  className="flex items-center justify-center h-10 w-10 text-white/70 hover:text-white transition-colors"
                  aria-label="Menu">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16M4 12h16M4 18h7" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>

            {/* Center */}
            <div className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-2 transition-opacity duration-150 ${isSearchOpen ? 'invisible opacity-0' : 'opacity-100'}`}>
              <Link href={`/${vendorProfile?.slug}`} className="flex items-center gap-2.5">
                <VendorLogo name={storeName} logoUrl={vendorProfile?.logoUrl}
                  logoFullUrl={vendorProfile?.logoFullUrl} logoFont={vendorProfile?.logoFont}
                  logoSizeDesktop={vendorProfile?.logoSizeDesktop} logoSizeMobile={vendorProfile?.logoSizeMobile} isLight />
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
                    className="h-8 w-48 rounded-full border border-white/20 bg-white/10 px-3 text-xs text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-white/20" />
                  <button type="button" onClick={() => { setIsSearchOpen(false); setSearchValue?.('') }}
                    className="text-white/40 hover:text-white/80">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setIsSearchOpen(true)}
                  className="flex h-9 w-9 items-center justify-center text-white/40 hover:text-white/80 transition-colors" aria-label="Search">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="11" cy="11" r="6" /><path d="m15.5 15.5 4 4" strokeLinecap="round" />
                  </svg>
                </button>
              )}
              {!isSearchOpen && (
                <div className="flex items-center gap-0.5">
                  <Link href="/account"
                    className="flex h-9 w-9 items-center justify-center text-white/70 hover:text-white transition-colors" aria-label="Account">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5Z" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M4 21c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </Link>
                  <Link href="/wishlist"
                    className="flex h-9 w-9 items-center justify-center text-white/70 hover:text-white transition-colors" aria-label="Wishlist">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6.716-4.517-9.038-8.187C.13 8.342 2.72 3 7.2 3c2.159 0 3.54 1.112 4.8 2.797C13.26 4.112 14.642 3 16.8 3 21.28 3 23.87 8.342 21.038 12.813 18.716 16.483 12 21 12 21z" />
                    </svg>
                  </Link>
                  <Link href="/cart"
                    className="relative flex h-9 w-9 items-center justify-center text-white/70 hover:text-white transition-colors" aria-label="Cart">
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
                  className="flex items-center rounded-full border border-white/30 px-3.5 py-1.5 text-xs font-semibold text-white/80 transition hover:border-white/60 hover:text-white">
                  Edit
                </Link>
              )}
              {!isSearchOpen && !canEditStorefront && canFollow && (
                <button type="button" onClick={onFollow} disabled={isFollowLoading}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${isFollowing ? 'border-white/20 bg-white/10 text-white/70 hover:bg-white/15' : 'border-white/40 bg-transparent text-white hover:border-white/70 hover:bg-white/10'}`}>
                  {isFollowLoading ? '…' : isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Biad marquee strip */}
        <div className="overflow-hidden border-t border-white/[0.05] bg-black py-1">
          <div className="flex whitespace-nowrap" style={{ animation: 'biadMarquee 18s linear infinite' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="mx-6 text-[9px] font-black uppercase tracking-[0.25em] text-white/40">
                {storeName}<span className="mx-3 text-white/20">✦</span>
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
        @keyframes biadMarquee {
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
      />
    </>
  );
}
