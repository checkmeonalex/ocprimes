'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import VendorCollectionsMenu from '@/components/vendor/VendorCollectionsMenu';
import { VendorLogo } from '@/components/vendor/VendorHeaderShared';
import VendorFloatingFollow from '@/components/vendor/VendorFloatingFollow';

const HEADER_H = 56;
const MARQUEE_H = 24;
const MAIN_NAV_H = 56; // matches top-14 (3.5rem)

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
  const [mainNavGone, setMainNavGone] = useState(false);
  const storeName = vendorProfile?.name || '';
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const currentY = Math.max(0, window.scrollY || 0);
      if (window.innerWidth < 1024) {
        const nearTop = currentY < 80;
        const scrollingUp = currentY < lastScrollYRef.current;
        setMainNavGone(!nearTop && !scrollingUp);
      } else {
        setMainNavGone(currentY >= MAIN_NAV_H);
      }
      lastScrollYRef.current = currentY;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* ── Biad vendor sub-header — sticks to top once main nav scrolls away ─── */}
      <header
        className={`fixed left-0 right-0 z-[39] bg-[#0a0a0a] border-b border-white/[0.07] transition-[top] duration-200 ${mainNavGone ? 'top-0' : 'top-14 xl:top-16'}`}
      >
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">

          {/* ── MOBILE layout ─── */}
          <div className="flex sm:hidden items-center" style={{ height: HEADER_H }}>
            {/* Left: hamburger */}
            <div className="flex-1 flex items-center">
              <button type="button" onClick={() => setIsCollectionsOpen(true)}
                className="flex items-center justify-center h-9 w-9 text-white/60 hover:text-white transition-colors"
                aria-label="Menu">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
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
              {categoryTree.length > 0 && (
                <button type="button" onClick={() => setIsCollectionsOpen(true)}
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
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

      {/* spacer: main navbar (14/16) + vendor sub-header + marquee */}
      <div className="mt-14 xl:mt-16" style={{ height: HEADER_H + MARQUEE_H }} />

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
