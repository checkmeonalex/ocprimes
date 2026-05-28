'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import VendorCollectionsMenu from '@/components/vendor/VendorCollectionsMenu';

export default function PrestigeVendorHeader({
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
  const pathname = usePathname();
  const isProductPage = pathname?.startsWith('/product/');
  const [logoFailed, setLogoFailed] = useState(false);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const stickyTop = isAtTop ? 'top-14 xl:top-16' : 'top-0';
  const hasCategories = Array.isArray(categoryTree) && categoryTree.length > 0;

  const handleSearchKey = (e) => {
    if (e.key === 'Escape') {
      setIsSearchOpen(false);
      setSearchValue?.('');
    }
  };

  return (
    <>
      <header
        className={`fixed left-0 right-0 z-[2147483001] bg-[#0a0a0a] border-b border-white/[0.07] transition-all duration-300 ease-in-out translate-y-0 ${stickyTop}`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative flex h-14 items-center lg:h-16">

            {/* LEFT — Collections trigger */}
            <div className="flex flex-1 items-center">
              {hasCategories && (
                <button
                  type="button"
                  onClick={() => setIsCollectionsOpen(true)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-white/50 transition hover:text-white/90"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                  </svg>
                  <span className="hidden sm:inline">Collections</span>
                </button>
              )}
            </div>

            {/* CENTER — Logo + store name */}
            <Link
              href={`/${vendorProfile?.slug}`}
              className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 transition"
            >
              {vendorProfile?.logoUrl && !logoFailed && (
                <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/10">
                  <img
                    src={vendorProfile.logoUrl}
                    alt={vendorProfile?.name}
                    className="h-full w-full object-cover"
                    onError={() => setLogoFailed(true)}
                  />
                </div>
              )}
              <span className="max-w-[160px] truncate text-sm font-semibold tracking-tight text-white sm:max-w-[240px]">
                {vendorProfile?.name}
              </span>
              {vendorProfile?.isTrusted && (
                <img
                  src={vendorProfile.trustedBadgeUrl || '/icons/verification/vendor-verified-badge.png'}
                  alt="Verified"
                  className="h-4 w-4 shrink-0"
                />
              )}
            </Link>

            {/* RIGHT — Search + Edit / Follow */}
            <div className="flex flex-1 items-center justify-end gap-2">
              {isSearchOpen ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    type="search"
                    value={searchValue}
                    onChange={(e) => setSearchValue?.(e.target.value)}
                    onKeyDown={handleSearchKey}
                    placeholder="Search store…"
                    className="h-8 w-40 rounded-lg bg-white/10 px-3 text-sm text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-white/20 sm:w-56"
                  />
                  <button
                    type="button"
                    onClick={() => { setIsSearchOpen(false); setSearchValue?.(''); }}
                    className="text-white/40 hover:text-white/80"
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
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition hover:text-white/80"
                  aria-label="Search"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="11" cy="11" r="6" />
                    <path d="m15.5 15.5 4 4" strokeLinecap="round" />
                  </svg>
                </button>
              )}

              {canEditStorefront && !isSearchOpen && (
                <Link
                  href="/backend/admin/store-front"
                  className="rounded-full border border-white/30 px-3.5 py-1.5 text-xs font-semibold text-white/80 transition hover:border-white/60 hover:text-white"
                >
                  Edit Store
                </Link>
              )}

              {canFollow && !isSearchOpen && (
                <button
                  type="button"
                  onClick={onFollow}
                  disabled={isFollowLoading}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                    isFollowing
                      ? 'border-white/20 bg-white/10 text-white/70 hover:bg-white/15'
                      : 'border-white/40 bg-transparent text-white hover:border-white/70 hover:bg-white/10'
                  }`}
                >
                  {isFollowLoading ? '…' : isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {hasCategories && (
        <VendorCollectionsMenu
          isOpen={isCollectionsOpen}
          onClose={() => setIsCollectionsOpen(false)}
          categoryTree={categoryTree}
          vendorSlug={vendorProfile?.slug}
          mode={collectionsMenuMode}
          activeCategorySlug={activeCategorySlug}
        />
      )}
    </>
  );
}
