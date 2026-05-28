'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useUserI18n } from '@/lib/i18n/useUserI18n';
import { useWishlist } from '@/context/WishlistContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n) {
  const v = Number(n) || 0;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(v);
}

// ── Stars ─────────────────────────────────────────────────────────────────────

function Stars({ rating }) {
  const r = Math.min(5, Math.max(0, Number(rating) || 0));
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`h-3 w-3 ${i <= Math.round(r) ? 'text-amber-400' : 'text-gray-200'}`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

// ── Product card ──────────────────────────────────────────────────────────────

function ProductCard({ product, formatMoney }) {
  const { openSaveModal, isWishlisted } = useWishlist();
  const productId = product.id || product.slug || '';
  const wishlisted = isWishlisted(productId);

  const img = product.image || product.image_url ||
    (Array.isArray(product.images) ? product.images[0]?.url || product.images[0] : '') || '';
  const basePrice = Number(product.price) || 0;
  const discountPrice = Number(product.discount_price) || 0;
  const hasDiscount = discountPrice > 0 && discountPrice < basePrice;
  const price = hasDiscount ? discountPrice : basePrice;
  const originalPrice = hasDiscount ? basePrice : (Number(product.originalPrice) || 0);
  const discountPct = hasDiscount ? Math.round((1 - price / originalPrice) * 100) : 0;
  const isNew = Boolean(product.is_new) && !hasDiscount;
  const category = String(product.category || '').trim();
  const sold = Number(product.sold_count || product.orders || product.total_sold || 0);
  const rating = Number(product.rating) || 0;
  const vendorSlug = product.vendor?.slug || product.vendor_slug || product.store_slug || '';
  const productSlug = product.slug || '';
  const href = vendorSlug && productSlug ? `/${vendorSlug}/${productSlug}`
    : productSlug ? `/product/${productSlug}` : '#';

  return (
    <Link href={href} className="group block">
      <div className="relative overflow-hidden rounded-xl aspect-square bg-gray-100">
        {img ? (
          <img src={img} alt={product.name || ''} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" loading="lazy" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200" />
        )}

        {/* Badges */}
        {hasDiscount && (
          <span className="font-mono absolute top-2 left-2 z-10 rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-white leading-none">-{discountPct}%</span>
        )}
        {isNew && (
          <span className="font-mono absolute top-2 left-2 z-10 rounded-md bg-gray-900 px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-white leading-none">NEW</span>
        )}

        {/* Wishlist */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); openSaveModal(product); }}
          className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center transition-colors shadow-sm"
          aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          <svg
            className="h-3.5 w-3.5 transition-colors"
            fill={wishlisted ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            style={{ color: wishlisted ? '#ef4444' : '#9ca3af' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>

        {/* Category pill */}
        {category && (
          <span className="font-mono absolute bottom-2 left-2 z-10 max-w-[80%] truncate rounded-md bg-black/65 backdrop-blur-sm px-2 py-0.5 text-[9.5px] font-normal lowercase text-white">{category}</span>
        )}

        {/* Quick add — slides up on hover */}
        <div className="absolute inset-x-0 bottom-0 z-10 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
          <button type="button" onClick={(e) => e.preventDefault()}
            className="w-full bg-gray-900/95 py-2.5 text-xs font-bold text-white text-center hover:bg-gray-800 transition-colors">
            + Quick add
          </button>
        </div>
      </div>

      <div className="mt-2.5 space-y-0.5">
        <p className="text-sm font-normal text-gray-900 line-clamp-1 leading-snug">{product.name}</p>
        <div className="flex items-center gap-2" style={{ fontFeatureSettings: '"tnum"' }}>
          <span className="font-mono text-sm font-semibold text-gray-900">{formatMoney(price)}</span>
          {hasDiscount && <span className="font-mono text-xs font-normal text-gray-400 line-through">{formatMoney(originalPrice)}</span>}
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs text-gray-400" style={{ fontFeatureSettings: '"tnum"' }}>
          {rating > 0 && (
            <>
              <svg className="h-3 w-3 text-amber-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>{rating.toFixed(1)}</span>
              {sold > 0 && <span className="text-gray-300">·</span>}
            </>
          )}
          {sold > 0 && <span>{fmt(sold)} sold</span>}
        </div>
      </div>
    </Link>
  );
}

// ── Product skeleton ──────────────────────────────────────────────────────────

function ProductSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-square rounded-xl bg-gray-100" />
      <div className="mt-2.5 space-y-1.5">
        <div className="h-3.5 rounded bg-gray-100 w-3/4" />
        <div className="h-3 rounded bg-gray-100 w-1/2" />
        <div className="h-3 rounded bg-gray-100 w-1/3" />
      </div>
    </div>
  );
}

// ── Vendor header row ─────────────────────────────────────────────────────────

const DOT = <span className="text-gray-300 select-none">·</span>;

const serifStyle = {
  fontFamily: 'var(--font-instrument-serif), Georgia, serif',
  fontWeight: 400,
  letterSpacing: '-0.01em',
};

function VendorName({ name }) {
  const words = (name || '').trim().split(/\s+/);
  if (words.length < 2) {
    return (
      <span className="text-[22px] lg:text-[26px] leading-none text-gray-900" style={serifStyle}>
        {name}
      </span>
    );
  }
  const first = words.slice(0, -1).join(' ');
  const last = words[words.length - 1];
  return (
    <span className="text-[22px] lg:text-[26px] leading-none text-gray-900" style={serifStyle}>
      {first}{' '}
      <em style={{ fontStyle: 'italic' }}>{last}</em>
    </span>
  );
}

function VendorHeader({ vendor }) {
  const words = (vendor.name || '').trim().split(/\s+/);
  const initials = words.slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();

  const followers         = Number(vendor.custom_profile_followers) || 0;
  const sold              = Number(vendor.custom_profile_sold) || 0;
  const orders            = Number(vendor.custom_profile_orders) || sold;
  const rating            = Number(vendor.custom_profile_rating) || 0;
  const reviewCount       = Number(vendor.custom_profile_reviews) || 0;
  const yearsOnPlatform   = Number(vendor.years_on_platform) || 0;
  const monthsOnPlatform  = Number(vendor.months_on_platform) || 0;
  const followerGrowthPct = Number(vendor.followers_growth_pct) || 0;

  const vendorHref = `/${vendor.slug || ''}`;
  const tnum = { fontFeatureSettings: '"tnum"' };

  const stats = [
    rating > 0 && (
      <span className="flex items-center gap-1">
        <Stars rating={rating} />
        <span className="font-medium text-gray-800">{rating.toFixed(1)}</span>
        {reviewCount > 0 && <span className="text-gray-400">({fmt(reviewCount)})</span>}
      </span>
    ),
    orders > 0 && (
      <span><span className="font-medium text-gray-800">{fmt(orders)}</span> orders</span>
    ),
    (yearsOnPlatform > 0 || monthsOnPlatform > 0) && (
      <span>
        <span className="font-medium text-gray-800">
          {yearsOnPlatform > 0 ? `${yearsOnPlatform}y+` : `${monthsOnPlatform}m+`}
        </span>
        {' '}on Alxora
      </span>
    ),
    followers > 0 && (
      <span className="flex items-center gap-1">
        <span className="font-medium text-orange-500">{fmt(followers)} followers</span>
        {followerGrowthPct !== 0 && (
          <span className={`font-medium ${followerGrowthPct > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {followerGrowthPct > 0 ? '↑' : '↓'} {followerGrowthPct > 0 ? `+${followerGrowthPct}` : Math.abs(followerGrowthPct)}%
          </span>
        )}
      </span>
    ),
  ].filter(Boolean);

  return (
    <div className="flex items-center gap-4 sm:gap-5 px-1 py-4 sm:py-5 border-b border-gray-100">
      {/* Logo — tappable on all screens */}
      <Link href={vendorHref} className="h-16 w-16 sm:h-[72px] sm:w-[72px] shrink-0 rounded-2xl overflow-hidden bg-gray-900 flex items-center justify-center">
        {vendor.logo_url ? (
          <img src={vendor.logo_url} alt={vendor.name} className="w-full h-full object-cover" />
        ) : (
          <span style={{ ...serifStyle, fontStyle: 'italic', fontSize: 22, color: '#fff' }}>{initials}</span>
        )}
      </Link>

      {/* Details */}
      <div className="flex-1 min-w-0">
        {/* Name row — name+badge on left, Visit link on right (mobile only) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={vendorHref} className="hover:opacity-70 transition-opacity leading-none">
              <VendorName name={vendor.name} />
            </Link>
            {vendor.is_trusted_vendor && (
              <img
                src="/icons/verification/vendor-verified-badge.png"
                alt="Verified"
                className="h-6 w-6 shrink-0"
              />
            )}
          </div>
          <Link
            href={vendorHref}
            className="sm:hidden shrink-0 px-2 py-1 text-[11px] font-semibold text-gray-600 underline underline-offset-2 hover:text-gray-900 transition-colors"
          >
            Visit
          </Link>
        </div>

        {/* Stats row */}
        {stats.length > 0 && (
          <div className="font-mono mt-2 flex flex-wrap items-center text-[12px] text-gray-500" style={tnum}>
            {stats.reduce((acc, stat, i) => {
              if (i > 0) acc.push(<span key={`dot-${i}`} className="mx-2 text-gray-300 select-none">·</span>);
              acc.push(<span key={`stat-${i}`} className="flex items-center gap-1">{stat}</span>);
              return acc;
            }, [])}
          </div>
        )}
      </div>

      {/* Buttons — desktop only */}
      <div className="hidden sm:flex shrink-0 items-center gap-2">
        <Link href={vendorHref} className="rounded-full border border-gray-300 px-5 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 transition">
          Visit shop
        </Link>
        <button type="button" className="rounded-full bg-gray-900 px-5 py-2 text-[12px] font-bold text-white hover:bg-gray-700 transition">
          + Follow
        </button>
      </div>
    </div>
  );
}

// ── Sort options ──────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'trending',   label: 'Recommended' },
  { value: 'newest',     label: 'New arrivals' },
  { value: 'price_asc',  label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'top_rated',  label: 'Top rated' },
];

// ── Per-vendor card ───────────────────────────────────────────────────────────

function VendorRow({ vendor, initialProducts, totalCount, formatMoney }) {
  const shopHref = `/${vendor.slug || ''}`;
  const shown = initialProducts.length;
  const remaining = Math.max(0, totalCount - shown);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <VendorHeader vendor={vendor} />
      <div className="border-t border-gray-100 px-1 py-4 sm:py-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-[0.4rem]">
          {initialProducts.map((p, i) => (
            <ProductCard key={p.id || p.slug || i} product={p} formatMoney={formatMoney} />
          ))}
        </div>

        {/* Footer bar */}
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
          <Link
            href={shopHref}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:text-gray-500 transition"
          >
            View all
            {remaining > 0 && (
              <span className="font-normal text-gray-400">+{remaining} more</span>
            )}
            <span>→</span>
          </Link>
          <span className="text-xs text-gray-400 font-mono">{totalCount} items</span>
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function VendorBrowseSectionClient({ categories, vendorRows }) {
  const { formatMoney } = useUserI18n();
  const [activeSlug, setActiveSlug] = useState('all');
  const [sort, setSort] = useState('trending');
  const [rows, setRows] = useState(vendorRows || []);
  const [loading, setLoading] = useState(false);

  const fetchRows = useCallback(async (categorySlug) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', per_page: '30' });
      if (categorySlug !== 'all') params.set('category', categorySlug);
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json().catch(() => null);
      const products = Array.isArray(data?.items) ? data.items : [];

      const byVendor = {};
      for (const p of products) {
        const vid = String(
          (Array.isArray(p.brands) && p.brands[0]?.id) ||
          p.brand_id || p.vendor_id || p.vendor?.id || ''
        ).trim();
        if (!vid) continue;
        if (!byVendor[vid]) byVendor[vid] = [];
        if (byVendor[vid].length < 5) byVendor[vid].push(p);
      }

      const next = (vendorRows || [])
        .filter((r) => byVendor[r.vendor.id]?.length > 0)
        .map((r) => ({ vendor: r.vendor, products: byVendor[r.vendor.id], totalCount: r.totalCount || byVendor[r.vendor.id].length }));

      setRows(next);
    } catch (_) {
      // keep current on error
    } finally {
      setLoading(false);
    }
  }, [vendorRows]);

  const handleTab = useCallback((slug) => {
    if (slug === activeSlug) return;
    setActiveSlug(slug);
    fetchRows(slug);
  }, [activeSlug, fetchRows]);

  const handleSort = useCallback((val) => {
    setSort(val);
  }, []);

  const sortedRows = useMemo(() => {
    const arr = [...rows];
    switch (sort) {
      case 'trending':
        return arr.sort((a, b) => b.totalCount - a.totalCount);
      case 'top_rated':
        return arr.sort((a, b) => (b.vendor.custom_profile_rating || 0) - (a.vendor.custom_profile_rating || 0));
      case 'newest': {
        // lowest time on platform = newest vendor
        const age = (v) => v.vendor.years_on_platform * 12 + v.vendor.months_on_platform;
        return arr.sort((a, b) => age(a) - age(b));
      }
      case 'price_asc': {
        const minPrice = (r) => Math.min(...r.products.map((p) => Number(p.discount_price || p.price) || Infinity));
        return arr.sort((a, b) => minPrice(a) - minPrice(b));
      }
      case 'price_desc': {
        const maxPrice = (r) => Math.max(...r.products.map((p) => Number(p.discount_price || p.price) || 0));
        return arr.sort((a, b) => maxPrice(b) - maxPrice(a));
      }
      default:
        return arr;
    }
  }, [rows, sort]);

  const pillsRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = pillsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = pillsRef.current;
    if (!el) return;

    // rAF guarantees we read after browser paint/layout
    let raf = requestAnimationFrame(checkScroll);

    const ro = new ResizeObserver(() => {
      raf = requestAnimationFrame(checkScroll);
    });
    ro.observe(el);

    el.addEventListener('scroll', checkScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('scroll', checkScroll);
    };
  }, [checkScroll, categories.length]);

  const scrollPills = useCallback((dir) => {
    pillsRef.current?.scrollBy({ left: dir === 'left' ? -240 : 240, behavior: 'smooth' });
  }, []);

  const tabs = [{ name: 'All', slug: 'all' }, ...categories];

  return (
    <section className="py-8">
      {/* Section heading + Sort on same row */}
      <div className="mb-4 flex items-start justify-between gap-4 px-3 sm:px-4 md:px-10 lg:px-16">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
            Shops you may{' '}
            <em style={{ fontFamily: 'var(--font-instrument-serif), "Cormorant Garamond", Georgia, serif', color: '#e05c3a', fontStyle: 'italic', fontWeight: 400 }}>
              also like
            </em>
          </h2>
        </div>

        {/* Sort by — top right */}
        <div className="shrink-0 flex items-center gap-1.5 text-sm whitespace-nowrap pt-1">
          <span className="font-medium text-gray-500">Sort</span>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => handleSort(e.target.value)}
              className="appearance-none bg-transparent text-sm font-semibold text-gray-900 pr-5 outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Pills row with hover scroll arrows ───────────────── */}
      <div className="group relative mb-6 w-full px-3 sm:px-4 md:px-10 lg:px-16">
        {/* Left arrow */}
        <button
          type="button"
          onClick={() => scrollPills('left')}
          aria-label="Scroll left"
          className={`absolute left-0 top-1/2 z-10 -translate-x-1 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md text-gray-700 transition-all duration-200 hover:bg-gray-50 ${
            canScrollLeft
              ? 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'
              : 'invisible pointer-events-none'
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Scrollable strip */}
        <div
          ref={pillsRef}
          className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex items-center gap-2 pb-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.slug}
                type="button"
                onClick={() => handleTab(tab.slug)}
                className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                  activeSlug === tab.slug
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right arrow */}
        <button
          type="button"
          onClick={() => scrollPills('right')}
          aria-label="Scroll right"
          className={`absolute right-0 top-1/2 z-10 translate-x-1 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md text-gray-700 transition-all duration-200 hover:bg-gray-50 ${
            canScrollRight
              ? 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'
              : 'invisible pointer-events-none'
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* ── Vendor rows ──────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-6 px-3 sm:px-4 md:px-10 lg:px-16">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden animate-pulse">
              <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100">
                <div className="h-[72px] w-[72px] rounded-2xl bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 rounded bg-gray-100 w-1/3" />
                  <div className="h-3 rounded bg-gray-100 w-1/2" />
                </div>
              </div>
              <div className="px-5 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {Array.from({ length: 5 }).map((_, j) => <ProductSkeleton key={j} />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sortedRows.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          No vendors found in this category
        </div>
      ) : (
        <div className="space-y-6 px-3 sm:px-4 md:px-10 lg:px-16">
          {sortedRows.map(({ vendor, products, totalCount }) => (
            <VendorRow
              key={vendor.id}
              vendor={vendor}
              initialProducts={products}
              totalCount={totalCount || products.length}
              formatMoney={formatMoney}
            />
          ))}
        </div>
      )}
    </section>
  );
}
