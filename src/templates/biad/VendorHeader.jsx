'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import VendorCollectionsMenu from '@/components/vendor/VendorCollectionsMenu';
import { PoweredByBar, HeaderIcons, VendorLogo } from '@/components/vendor/VendorHeaderShared';
import VendorFloatingFollow from '@/components/vendor/VendorFloatingFollow';

const POWERED_H = 32;
const HEADER_H  = 56;

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
  initialAuthUser = null,
}) {
  const { isAtTop } = useScrollDirection();
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const storeName = vendorProfile?.name || '';

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

      {/* ── Biad vendor header ───────────────── */}
      <header
        className="fixed left-0 right-0 z-[40] bg-[#0a0a0a] border-b border-white/[0.07] transition-all duration-300"
        style={{ top: vendorTop }}
      >
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">

          {/* ── MOBILE layout (3 equal columns) ─── */}
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

            {/* Center: logo only */}
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
                    alt="Verified" className="h-4 w-4 shrink-0" />
                )}
              </Link>
            </div>

            {/* Right: cart + account only */}
            <div className="flex-1 flex justify-end items-center">
              <HeaderIcons initialAuthUser={initialAuthUser} isLight />
            </div>
          </div>

          {/* ── DESKTOP layout (absolute-centered logo) ─── */}
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
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
              <Link href={`/${vendorProfile?.slug}`} className="flex items-center gap-2.5">
                <VendorLogo name={storeName} logoUrl={vendorProfile?.logoUrl}
                  logoFullUrl={vendorProfile?.logoFullUrl} logoFont={vendorProfile?.logoFont} isLight />
                {vendorProfile?.isTrusted && (
                  <img src={vendorProfile.trustedBadgeUrl || '/icons/verification/vendor-verified-badge.png'}
                    alt="Verified" className="h-4 w-4 shrink-0" />
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

      <div style={{ height: isAtTop ? POWERED_H + HEADER_H + 24 : HEADER_H + 24 }} />

      <VendorCollectionsMenu isOpen={isCollectionsOpen} onClose={() => setIsCollectionsOpen(false)}
        categoryTree={categoryTree} vendorSlug={vendorProfile?.slug}
        mode={collectionsMenuMode} activeCategorySlug={activeCategorySlug} />

      <style jsx global>{`
        @keyframes biadMarquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* Floating Follow — mobile only */}
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
