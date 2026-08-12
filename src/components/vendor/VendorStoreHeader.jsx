'use client';

import { useState } from 'react';
import Link from 'next/link';
import VendorCollectionsMenu from './VendorCollectionsMenu';
import VendorMobileCollectionsDropdown from './VendorMobileCollectionsDropdown';
import { VendorLogo } from './VendorHeaderShared';
import VendorFloatingFollow from './VendorFloatingFollow';
import SearchOverlay from '@/components/search/SearchOverlay';

const HEADER_H = 60;

export default function VendorStoreHeader({
  vendorProfile,
  onFollow,
  isFollowing,
  isFollowLoading,
  canFollow,
  canEditStorefront = false,
  onMessage,
  searchValue,
  setSearchValue,
  categoryTree = [],
  collectionsMenuMode = 'grouped',
  activeCategorySlug = '',
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);

  return (
    <>
      {/* ── Vendor sub-header — the main site navbar is fully unmounted on
          vendor pages, so this header always sits at the very top. ─── */}
      <header
        className="fixed left-0 right-0 top-0 z-[39] bg-white border-b border-gray-100 shadow-sm"
      >
        <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">
          <div className="flex items-center justify-between gap-2" style={{ height: HEADER_H }}>

            {/* LEFT */}
            <div className="flex items-center gap-3 min-w-0">
              <button type="button" onClick={() => setIsMobileDropdownOpen(true)}
                className="lg:hidden text-gray-500 p-1.5" aria-label="Collections">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7" />
                </svg>
              </button>
              <nav className="hidden lg:flex items-center gap-5">
                <Link href={`/${vendorProfile?.slug}`} className="text-[11px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 transition-colors">Shop</Link>
                <Link href={`/${vendorProfile?.slug}?sort=newest`} className="text-[11px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 transition-colors">New</Link>
                {categoryTree.length > 0 && (
                  <button type="button" onClick={() => setIsCollectionsOpen(true)}
                    className="text-[11px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 transition-colors">
                    Collections
                  </button>
                )}
              </nav>
            </div>

            {/* CENTER — logo */}
            <div className="absolute left-1/2 -translate-x-1/2">
              <Link href={`/${vendorProfile?.slug}`} className="flex items-center gap-2">
                <VendorLogo
                  name={vendorProfile?.name || ''}
                  logoUrl={vendorProfile?.logoUrl}
                  logoFullUrl={vendorProfile?.logoFullUrl}
                  logoFont={vendorProfile?.logoFont}
                  logoSizeDesktop={vendorProfile?.logoSizeDesktop}
                  logoSizeMobile={vendorProfile?.logoSizeMobile}
                />
                {vendorProfile?.isTrusted && !vendorProfile?.logoFullUrl && (
                  <img src={vendorProfile.trustedBadgeUrl || '/icons/verification/vendor-verified-badge.png'}
                    alt="Verified" className="h-6 w-6 lg:h-7 lg:w-7 shrink-0" />
                )}
              </Link>
            </div>

            {/* RIGHT — search + follow/edit */}
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={() => setIsSearchOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors" aria-label="Search">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" />
                </svg>
              </button>

              {!canEditStorefront && onMessage && (
                <>
                  <button type="button" onClick={onMessage}
                    className="hidden sm:flex h-8 items-center gap-1.5 rounded-full border border-gray-200 px-3.5 text-[11px] font-bold uppercase tracking-widest text-gray-700 hover:bg-gray-50 transition-colors">
                    Message
                  </button>
                  <button type="button" onClick={onMessage}
                    className="sm:hidden flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors" aria-label="Message">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                    </svg>
                  </button>
                </>
              )}

              {canEditStorefront && (
                <Link href="/backend/admin/store-front"
                  className="hidden sm:flex h-8 items-center gap-1.5 rounded-full border border-gray-200 px-3.5 text-[11px] font-bold uppercase tracking-widest text-gray-700 hover:bg-gray-50 transition-colors">
                  Edit
                </Link>
              )}
              {!canEditStorefront && canFollow && (
                <button type="button" onClick={onFollow} disabled={isFollowLoading}
                  className={`hidden sm:flex h-8 rounded-full px-4 text-[11px] font-bold uppercase tracking-widest transition-all disabled:opacity-60 ${isFollowing ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-700 shadow-sm'}`}>
                  {isFollowLoading ? '…' : isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* spacer: reserves space for the fixed vendor sub-header above */}
      <div style={{ height: HEADER_H }} />

      <VendorCollectionsMenu isOpen={isCollectionsOpen} onClose={() => setIsCollectionsOpen(false)}
        categoryTree={categoryTree} vendorSlug={vendorProfile?.slug} storeName={vendorProfile?.name || ''}
        mode={collectionsMenuMode} activeCategorySlug={activeCategorySlug} />
      <VendorMobileCollectionsDropdown isOpen={isMobileDropdownOpen} onClose={() => setIsMobileDropdownOpen(false)}
        categoryTree={categoryTree} vendorSlug={vendorProfile?.slug} storeName={vendorProfile?.name || ''}
        mode={collectionsMenuMode} activeCategorySlug={activeCategorySlug} />

      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        value={searchValue}
        onChange={setSearchValue}
        onSubmit={() => setIsSearchOpen(false)}
        placeholder={`Search ${vendorProfile?.name || 'store'}…`}
        theme="light"
      />

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
