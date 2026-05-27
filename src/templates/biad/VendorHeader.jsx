'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import VendorCollectionsMenu from '@/components/vendor/VendorCollectionsMenu';

export default function BiadVendorHeader({
  vendorProfile,
  onFollow,
  isFollowing,
  isFollowLoading,
  canFollow,
  canEditStorefront = false,
  categoryTree = [],
  collectionsMenuMode = 'grouped',
  activeCategorySlug = '',
  searchValue = '',
  setSearchValue,
}) {
  const { isAtTop } = useScrollDirection();
  const [logoFailed, setLogoFailed] = useState(false);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const hasCategories = Array.isArray(categoryTree) && categoryTree.length > 0;
  const stickyTop = isAtTop ? 'top-14 xl:top-16' : 'top-0';
  const storeName = vendorProfile?.name || '';

  return (
    <>
      {/* Main header */}
      <header
        className={`fixed left-0 right-0 z-[2147483001] bg-white border-b border-gray-100 transition-all duration-300 ${stickyTop}`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative flex h-14 items-center lg:h-16">

            {/* LEFT — Collections */}
            <div className="flex flex-1 items-center gap-3">
              {hasCategories && (
                <button
                  type="button"
                  onClick={() => setIsCollectionsOpen(true)}
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-900 hover:text-gray-500 transition"
                  aria-label="Collections"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16M4 12h16M4 18h7" strokeLinecap="round" />
                  </svg>
                  <span className="hidden sm:inline">Shop</span>
                </button>
              )}
            </div>

            {/* CENTER — Brand */}
            <Link
              href={`/${vendorProfile?.slug}`}
              className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 group"
            >
              {vendorProfile?.logoUrl && !logoFailed && (
                <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-gray-200">
                  <img
                    src={vendorProfile.logoUrl}
                    alt={storeName}
                    className="h-full w-full object-cover"
                    onError={() => setLogoFailed(true)}
                  />
                </div>
              )}
              <span className="text-sm font-black uppercase tracking-[0.15em] text-gray-900 group-hover:opacity-70 transition lg:text-base">
                {storeName}
              </span>
            </Link>

            {/* RIGHT — Actions */}
            <div className="flex flex-1 items-center justify-end gap-2">
              {isSearchOpen ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    type="search"
                    value={searchValue}
                    onChange={(e) => setSearchValue?.(e.target.value)}
                    onKeyDown={(e) => e.key === 'Escape' && (setIsSearchOpen(false), setSearchValue?.(''))}
                    placeholder="Search…"
                    className="h-8 w-36 rounded-full border border-gray-300 bg-gray-50 px-3 text-xs text-gray-900 outline-none focus:border-gray-900 sm:w-48"
                  />
                  <button
                    type="button"
                    onClick={() => { setIsSearchOpen(false); setSearchValue?.(''); }}
                    className="text-gray-400 hover:text-gray-700"
                    aria-label="Close search"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className="flex h-8 w-8 items-center justify-center text-gray-500 hover:text-gray-900 transition"
                  aria-label="Search"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="6" />
                    <path d="m15.5 15.5 4 4" strokeLinecap="round" />
                  </svg>
                </button>
              )}

              {canEditStorefront && !isSearchOpen && (
                <Link
                  href="/backend/admin/store-front"
                  className="inline-flex h-8 items-center rounded-full border border-gray-900 bg-gray-900 px-4 text-[11px] font-bold uppercase tracking-widest text-white transition hover:bg-white hover:text-gray-900"
                >
                  Edit Store
                </Link>
              )}

              {canFollow && !isSearchOpen && (
                <button
                  type="button"
                  onClick={onFollow}
                  disabled={isFollowLoading}
                  className={`inline-flex h-8 items-center rounded-full border px-4 text-[11px] font-bold uppercase tracking-widest transition disabled:opacity-60 ${
                    isFollowing
                      ? 'border-gray-300 bg-white text-gray-500 hover:border-gray-900 hover:text-gray-900'
                      : 'border-gray-900 bg-gray-900 text-white hover:bg-white hover:text-gray-900'
                  }`}
                >
                  {isFollowLoading ? '…' : isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Scrolling marquee strip */}
        <div className="overflow-hidden border-t border-gray-100 bg-gray-900 py-1.5">
          <div
            className="flex whitespace-nowrap"
            style={{ animation: 'biadMarquee 18s linear infinite' }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <span
                key={i}
                className="mx-6 text-[10px] font-black uppercase tracking-[0.25em] text-white/70"
              >
                {storeName}
                <span className="mx-3 text-white/30">✦</span>
              </span>
            ))}
          </div>
        </div>
      </header>

      <VendorCollectionsMenu
        isOpen={isCollectionsOpen}
        onClose={() => setIsCollectionsOpen(false)}
        categoryTree={categoryTree}
        vendorSlug={vendorProfile?.slug}
        mode={collectionsMenuMode}
        activeCategorySlug={activeCategorySlug}
      />

      <style jsx global>{`
        @keyframes biadMarquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </>
  );
}
