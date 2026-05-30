'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import VendorCollectionsMenu from '@/components/vendor/VendorCollectionsMenu';
import { VendorLogo } from '@/components/vendor/VendorHeaderShared';
import VendorFloatingFollow from '@/components/vendor/VendorFloatingFollow';

const HEADER_H = 56;
const MAIN_NAV_H = 56; // matches top-14 (3.5rem)

export default function PrestigeVendorHeader({
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

  useEffect(() => {
    const onScroll = () => setMainNavGone(window.scrollY >= MAIN_NAV_H);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* ── Prestige vendor sub-header — sticks to top once main nav scrolls away ─── */}
      <header
        className={`fixed left-0 right-0 z-[39] bg-[#0a0a0a] border-b border-white/[0.07] transition-[top] duration-200 ${mainNavGone ? 'top-0' : 'top-14 xl:top-16'}`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center" style={{ height: HEADER_H }}>

            {/* LEFT — Collections */}
            <div className="flex flex-1 items-center">
              {categoryTree.length > 0 && (
                <button type="button" onClick={() => setIsCollectionsOpen(true)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-white/50 transition hover:text-white/90">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                  </svg>
                  <span className="hidden sm:inline">Collections</span>
                </button>
              )}
            </div>

            {/* CENTER — Logo */}
            <div className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-2 transition-opacity duration-150 ${isSearchOpen ? 'invisible opacity-0' : 'opacity-100'}`}>
              <Link href={`/${vendorProfile?.slug}`} className="flex items-center gap-2.5 transition">
                <VendorLogo
                  name={vendorProfile?.name || ''}
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

            {/* RIGHT — Search + Follow */}
            <div className="flex flex-1 items-center justify-end gap-1">
              {isSearchOpen ? (
                <div className="flex items-center gap-1.5">
                  <input autoFocus type="search" value={searchValue}
                    onChange={(e) => setSearchValue?.(e.target.value)}
                    onKeyDown={(e) => e.key === 'Escape' && (setIsSearchOpen(false), setSearchValue?.(''))}
                    placeholder="Search store…"
                    className="h-8 w-40 rounded-lg bg-white/10 px-3 text-sm text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-white/20 sm:w-56"
                  />
                  <button type="button" onClick={() => { setIsSearchOpen(false); setSearchValue?.('') }}
                    className="text-white/40 hover:text-white/80" aria-label="Close">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setIsSearchOpen(true)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition hover:text-white/80" aria-label="Search">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="11" cy="11" r="6" /><path d="m15.5 15.5 4 4" strokeLinecap="round" />
                  </svg>
                </button>
              )}

              {!isSearchOpen && !canEditStorefront && onMessage && (
                <>
                  <button type="button" onClick={onMessage}
                    className="hidden sm:flex rounded-full border border-white/25 px-3.5 py-1.5 text-xs font-semibold text-white/70 transition hover:border-white/50 hover:text-white">
                    Message
                  </button>
                  <button type="button" onClick={onMessage}
                    className="sm:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition hover:text-white/80" aria-label="Message">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                    </svg>
                  </button>
                </>
              )}

              {!isSearchOpen && canEditStorefront && (
                <Link href="/backend/admin/store-front"
                  className="rounded-full border border-white/30 px-3.5 py-1.5 text-xs font-semibold text-white/80 transition hover:border-white/60 hover:text-white">
                  Edit Store
                </Link>
              )}
              {!isSearchOpen && !canEditStorefront && canFollow && (
                <button type="button" onClick={onFollow} disabled={isFollowLoading}
                  className={`hidden sm:flex rounded-full border px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${isFollowing ? 'border-white/20 bg-white/10 text-white/70 hover:bg-white/15' : 'border-white/40 bg-transparent text-white hover:border-white/70 hover:bg-white/10'}`}>
                  {isFollowLoading ? '…' : isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* spacer: main navbar (14/16) + vendor sub-header */}
      <div className="mt-14 xl:mt-16" style={{ height: HEADER_H }} />

      <VendorCollectionsMenu isOpen={isCollectionsOpen} onClose={() => setIsCollectionsOpen(false)}
        categoryTree={categoryTree} vendorSlug={vendorProfile?.slug}
        mode={collectionsMenuMode} activeCategorySlug={activeCategorySlug} />

      <VendorFloatingFollow
        vendorName={vendorProfile?.name || ''}
        vendorSlug={vendorProfile?.slug}
        isFollowing={isFollowing}
        isFollowLoading={isFollowLoading}
        canFollow={canFollow}
        onFollow={onFollow}
      />
    </>
  );
}
