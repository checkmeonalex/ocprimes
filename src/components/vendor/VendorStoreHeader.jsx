'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import VendorCollectionsMenu from './VendorCollectionsMenu';
import VendorMobileCollectionsDropdown from './VendorMobileCollectionsDropdown';
import { PoweredByBar, HeaderIcons, VendorLogo } from './VendorHeaderShared';
import VendorFloatingFollow from './VendorFloatingFollow';

const POWERED_H = 32;
const HEADER_H  = 60;

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
  initialAuthUser = null,
}) {
  const { isAtTop } = useScrollDirection();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);

  const vendorTop = isAtTop ? `${POWERED_H}px` : '0px';

  return (
    <>
      {/* ── Powered by bar ───────────────────── */}
      <div
        className={`fixed left-0 right-0 z-[41] transition-transform duration-300 ${isAtTop ? 'translate-y-0' : '-translate-y-8'}`}
        style={{ top: 0 }}
      >
        <PoweredByBar />
      </div>

      {/* ── Main vendor header ───────────────── */}
      <header
        className="fixed left-0 right-0 z-[40] bg-white border-b border-gray-100 shadow-sm transition-all duration-300"
        style={{ top: vendorTop }}
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
                />
                {vendorProfile?.isTrusted && (
                  <img src={vendorProfile.trustedBadgeUrl || '/icons/verification/vendor-verified-badge.png'}
                    alt="Verified" className="h-4 w-4 lg:h-5 lg:w-5 shrink-0" />
                )}
              </Link>
            </div>

            {/* RIGHT */}
            <div className="flex items-center gap-1 shrink-0">
              {isSearchExpanded ? (
                <div className="flex items-center gap-1.5">
                  <input autoFocus type="search" value={searchValue}
                    onChange={(e) => setSearchValue?.(e.target.value)}
                    onBlur={() => !searchValue && setIsSearchExpanded(false)}
                    placeholder={`Search ${vendorProfile?.name}…`}
                    className="h-8 w-36 sm:w-48 rounded-full border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-gray-900"
                  />
                  <button type="button" onClick={() => { setIsSearchExpanded(false); setSearchValue?.('') }}
                    className="text-gray-400 hover:text-gray-700">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setIsSearchExpanded(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors" aria-label="Search">
                  <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" />
                  </svg>
                </button>
              )}

              {!isSearchExpanded && <HeaderIcons initialAuthUser={initialAuthUser} />}

              {!isSearchExpanded && (canFollow || canEditStorefront) && (
                <div className="mx-1 h-5 w-px bg-gray-200" />
              )}

              {!isSearchExpanded && canEditStorefront && (
                <Link href="/backend/admin/store-front"
                  className="hidden sm:flex h-8 items-center gap-1.5 rounded-full border border-gray-200 px-3.5 text-[11px] font-bold uppercase tracking-widest text-gray-700 hover:bg-gray-50 transition-colors">
                  Edit
                </Link>
              )}
              {!isSearchExpanded && !canEditStorefront && canFollow && (
                <button type="button" onClick={onFollow} disabled={isFollowLoading}
                  className={`hidden sm:flex h-8 rounded-full px-4 text-[11px] font-bold uppercase tracking-widest transition-all disabled:opacity-60 ${isFollowing ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-700 shadow-sm'}`}>
                  {isFollowLoading ? '…' : isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div style={{ height: isAtTop ? POWERED_H + HEADER_H : HEADER_H }} />

      <VendorCollectionsMenu isOpen={isCollectionsOpen} onClose={() => setIsCollectionsOpen(false)}
        categoryTree={categoryTree} vendorSlug={vendorProfile?.slug}
        mode={collectionsMenuMode} activeCategorySlug={activeCategorySlug} />
      <VendorMobileCollectionsDropdown isOpen={isMobileDropdownOpen} onClose={() => setIsMobileDropdownOpen(false)}
        categoryTree={categoryTree} vendorSlug={vendorProfile?.slug} activeCategorySlug={activeCategorySlug} />

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
