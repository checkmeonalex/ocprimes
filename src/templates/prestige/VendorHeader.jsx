'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import VendorCollectionsMenu from '@/components/vendor/VendorCollectionsMenu';
import { PoweredByBar, HeaderIcons, VendorLogo } from '@/components/vendor/VendorHeaderShared';
import VendorFloatingFollow from '@/components/vendor/VendorFloatingFollow';

const POWERED_H = 32;
const HEADER_H  = 56;

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
  initialAuthUser = null,
}) {
  const { isAtTop } = useScrollDirection();
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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

      {/* ── Prestige vendor header ───────────── */}
      <header
        className="fixed left-0 right-0 z-[40] bg-[#0a0a0a] border-b border-white/[0.07] transition-all duration-300"
        style={{ top: vendorTop }}
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
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
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
                    alt="Verified" className="h-4 w-4 shrink-0" />
                )}
              </Link>
            </div>

            {/* RIGHT — Search + Icons + Follow */}
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
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="11" cy="11" r="6" /><path d="m15.5 15.5 4 4" strokeLinecap="round" />
                  </svg>
                </button>
              )}

              {!isSearchOpen && <HeaderIcons initialAuthUser={initialAuthUser} isLight />}

              {!isSearchOpen && (canFollow || canEditStorefront) && (
                <div className="mx-1 h-4 w-px bg-white/20" />
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

      <div style={{ height: isAtTop ? POWERED_H + HEADER_H : HEADER_H }} />

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
