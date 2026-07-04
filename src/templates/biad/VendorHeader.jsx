'use client';

import { useState } from 'react';
import Link from 'next/link';
import VendorCollectionsMenu from '@/components/vendor/VendorCollectionsMenu';
import { VendorLogo } from '@/components/vendor/VendorHeaderShared';
import VendorFloatingFollow from '@/components/vendor/VendorFloatingFollow';
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

  // Hard swap with the main nav bar on both mobile and desktop — exactly one of the
  // two is ever visible. When shown, the vendor header always sits at the very top.
  const hiddenClass = isMainNavVisible ? 'hidden' : 'block';

  return (
    <>
      {/* ── Biad vendor sub-header — hard swap with main nav, never both visible ─── */}
      <header
        className={`fixed left-0 right-0 top-0 z-[39] bg-[#0a0a0a] border-b border-white/[0.07] ${hiddenClass}`}
      >
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">

          {/* ── MOBILE layout ─── */}
          <div className="flex sm:hidden items-center" style={{ height: HEADER_H }}>
            {/* Left: store + hamburger */}
            <div className="flex-1 flex items-center gap-1">
              <Link href={`/${vendorProfile?.slug}`}
                className="flex items-center justify-center h-9 w-9 text-white/70 hover:text-white transition-colors"
                aria-label="Visit store">
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                  <path d="M22 22H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path opacity="0.5" d="M20 22V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path opacity="0.5" d="M4 22V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M16.5278 2H7.47214C6.26932 2 5.66791 2 5.18461 2.2987C4.7013 2.5974 4.43234 3.13531 3.89443 4.21114L2.49081 7.75929C2.16652 8.57905 1.88279 9.54525 2.42867 10.2375C2.79489 10.7019 3.36257 11 3.99991 11C5.10448 11 5.99991 10.1046 5.99991 9C5.99991 10.1046 6.89534 11 7.99991 11C9.10448 11 9.99991 10.1046 9.99991 9C9.99991 10.1046 10.8953 11 11.9999 11C13.1045 11 13.9999 10.1046 13.9999 9C13.9999 10.1046 14.8953 11 15.9999 11C17.1045 11 17.9999 10.1046 17.9999 9C17.9999 10.1046 18.8953 11 19.9999 11C20.6373 11 21.205 10.7019 21.5712 10.2375C22.1171 9.54525 21.8334 8.57905 21.5091 7.75929L20.1055 4.21114C19.5676 3.13531 19.2986 2.5974 18.8153 2.2987C18.332 2 17.7306 2 16.5278 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path opacity="0.5" d="M9.5 21.5V18.5C9.5 17.5654 9.5 17.0981 9.70096 16.75C9.83261 16.522 10.022 16.3326 10.25 16.201C10.5981 16 11.0654 16 12 16C12.9346 16 13.4019 16 13.75 16.201C13.978 16.3326 14.1674 16.522 14.299 16.75C14.5 17.0981 14.5 17.5654 14.5 18.5V21.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </Link>
              <button type="button" onClick={() => setIsCollectionsOpen(true)}
                className="flex items-center justify-center h-9 w-9 text-white/60 hover:text-white transition-colors"
                aria-label="Menu">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 6h16M4 12h16M4 18h7" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Center: logo */}
            <div className="flex-1 flex justify-center items-center">
              <Link href={`/${vendorProfile?.slug}`} className="flex items-center gap-1.5">
                <VendorLogo
                  name={storeName}
                  logoUrl={vendorProfile?.logoUrl}
                  logoFullUrl={vendorProfile?.logoFullUrl}
                  logoFont={vendorProfile?.logoFont}
                  isLight
                />
                {vendorProfile?.isTrusted && (
                  <img src={vendorProfile.trustedBadgeUrl || '/icons/verification/vendor-verified-badge.png'}
                    alt="Verified" className="h-6 w-6 shrink-0" />
                )}
              </Link>
            </div>

            {/* Right: message icon on mobile */}
            <div className="flex-1 flex justify-end items-center gap-1">
              {!canEditStorefront && onMessage && (
                <button type="button" onClick={onMessage}
                  className="flex h-8 w-8 items-center justify-center text-white/50 hover:text-white transition-colors" aria-label="Message">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* ── DESKTOP layout ─── */}
          <div className="hidden sm:flex relative items-center justify-between" style={{ height: HEADER_H }}>
            {/* Left */}
            <div className="flex items-center gap-3 flex-1">
              <Link href={`/${vendorProfile?.slug}`}
                className="flex items-center justify-center h-8 w-8 text-white/70 hover:text-white transition-colors"
                aria-label="Visit store">
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 shrink-0">
                  <path d="M22 22H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path opacity="0.5" d="M20 22V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path opacity="0.5" d="M4 22V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M16.5278 2H7.47214C6.26932 2 5.66791 2 5.18461 2.2987C4.7013 2.5974 4.43234 3.13531 3.89443 4.21114L2.49081 7.75929C2.16652 8.57905 1.88279 9.54525 2.42867 10.2375C2.79489 10.7019 3.36257 11 3.99991 11C5.10448 11 5.99991 10.1046 5.99991 9C5.99991 10.1046 6.89534 11 7.99991 11C9.10448 11 9.99991 10.1046 9.99991 9C9.99991 10.1046 10.8953 11 11.9999 11C13.1045 11 13.9999 10.1046 13.9999 9C13.9999 10.1046 14.8953 11 15.9999 11C17.1045 11 17.9999 10.1046 17.9999 9C17.9999 10.1046 18.8953 11 19.9999 11C20.6373 11 21.205 10.7019 21.5712 10.2375C22.1171 9.54525 21.8334 8.57905 21.5091 7.75929L20.1055 4.21114C19.5676 3.13531 19.2986 2.5974 18.8153 2.2987C18.332 2 17.7306 2 16.5278 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path opacity="0.5" d="M9.5 21.5V18.5C9.5 17.5654 9.5 17.0981 9.70096 16.75C9.83261 16.522 10.022 16.3326 10.25 16.201C10.5981 16 11.0654 16 12 16C12.9346 16 13.4019 16 13.75 16.201C13.978 16.3326 14.1674 16.522 14.299 16.75C14.5 17.0981 14.5 17.5654 14.5 18.5V21.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </Link>
              {categoryTree.length > 0 && (
                <button type="button" onClick={() => setIsCollectionsOpen(true)}
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16M4 12h16M4 18h7" strokeLinecap="round" />
                  </svg>
                  <span>Shop</span>
                </button>
              )}
            </div>

            {/* Center */}
            <div className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-2 transition-opacity duration-150 ${isSearchOpen ? 'invisible opacity-0' : 'opacity-100'}`}>
              <Link href={`/${vendorProfile?.slug}`} className="flex items-center gap-2.5">
                <VendorLogo name={storeName} logoUrl={vendorProfile?.logoUrl}
                  logoFullUrl={vendorProfile?.logoFullUrl} logoFont={vendorProfile?.logoFont} isLight />
                {vendorProfile?.isTrusted && (
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
              {!isSearchOpen && !canEditStorefront && onMessage && (
                <button type="button" onClick={onMessage}
                  className="hidden sm:flex items-center rounded-full border border-white/25 px-3.5 py-1.5 text-xs font-semibold text-white/70 transition hover:border-white/50 hover:text-white">
                  Message
                </button>
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
