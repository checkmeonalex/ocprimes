'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const GAP = 'gap-2';

// Raw aspect ratio values (width/height) applied via inline style — avoids Tailwind purge issues
const LAYOUT_RATIO = {
  single:       '21/8',
  'two-col':    '4/5',
  'three-col':  '3/4',
  'four-col':   '3/4',
  'two-by-two': '1/1',
};

const HEIGHT_RATIO = {
  mini:    { single: '21/5',  'two-col': '4/3',  'three-col': '4/3',  'four-col': '4/3',  'two-by-two': '4/3'  },
  compact: { single: '21/7',  'two-col': '1/1',  'three-col': '1/1',  'four-col': '1/1',  'two-by-two': '1/1'  },
  normal:  {},
  large:   { single: '21/11', 'two-col': '2/3',  'three-col': '2/3',  'four-col': '2/3',  'two-by-two': '3/4'  },
  full:    { single: '21/14', 'two-col': '9/16', 'three-col': '9/16', 'four-col': '9/16', 'two-by-two': '2/3'  },
};

// Fixed heights for hero-duo (uses explicit px heights, not aspect ratios)
const HERO_DUO_HEIGHT = {
  mini:    { base: 160, sm: 200, md: 240 },
  compact: { base: 280, sm: 340, md: 400 },
  normal:  { base: 380, sm: 460, md: 520 },
  large:   { base: 480, sm: 580, md: 680 },
  full:    { base: 600, sm: 720, md: 840 },
};

function resolveRatio(layout, heightPreset) {
  const preset = HEIGHT_RATIO[heightPreset] || {};
  return preset[layout] || LAYOUT_RATIO[layout] || '4/5';
}

// Visible items per layout in carousel/slider mode
const LAYOUT_VISIBLE = {
  single:       1,
  'two-col':    2,
  'three-col':  3,
  'four-col':   4,
  'two-by-two': 4,
  'hero-duo':   3,
};

function SlideLink({ slide, children, className = '' }) {
  const href = String(slide?.linkUrl || '').trim();
  if (!href) return <div className={className}>{children}</div>;
  const isExternal = href.startsWith('http://') || href.startsWith('https://');
  return (
    <Link
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className={`block ${className}`}
    >
      {children}
    </Link>
  );
}

function SlideImage({ slide, ratio }) {
  return (
    <SlideLink slide={slide} className="block overflow-hidden rounded-2xl">
      <div className="relative w-full bg-gray-100" style={{ aspectRatio: ratio }}>
        <img
          src={slide.imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-contain object-center"
          loading="lazy"
        />
      </div>
    </SlideLink>
  );
}

function StaticGrid({ layout, slides, heightPreset = 'normal' }) {
  const filled = slides.filter((s) => s?.imageUrl);
  if (!filled.length) return null;

  const ratio = resolveRatio(layout, heightPreset);

  if (layout === 'single') return <SlideImage slide={filled[0]} ratio={ratio} />;

  if (layout === 'two-col') {
    return (
      <div className={`flex ${GAP}`}>
        {filled.slice(0, 2).map((s, i) => (
          <div key={i} className="flex-1 min-w-0"><SlideImage slide={s} ratio={ratio} /></div>
        ))}
      </div>
    );
  }

  if (layout === 'three-col') {
    return (
      <div className={`flex ${GAP}`}>
        {filled.slice(0, 3).map((s, i) => (
          <div key={i} className="flex-1 min-w-0"><SlideImage slide={s} ratio={ratio} /></div>
        ))}
      </div>
    );
  }

  if (layout === 'four-col') {
    return (
      <div className={`flex ${GAP}`}>
        {filled.slice(0, 4).map((s, i) => (
          <div key={i} className="flex-1 min-w-0"><SlideImage slide={s} ratio={ratio} /></div>
        ))}
      </div>
    );
  }

  if (layout === 'two-by-two') {
    const rows = [filled.slice(0, 2), filled.slice(2, 4)];
    return (
      <div className={`flex flex-col ${GAP}`}>
        {rows.map((row, ri) => row.length ? (
          <div key={ri} className={`flex ${GAP}`}>
            {row.map((s, ci) => (
              <div key={ci} className="flex-1 min-w-0"><SlideImage slide={s} ratio={ratio} /></div>
            ))}
          </div>
        ) : null)}
      </div>
    );
  }

  if (layout === 'hero-duo') {
    const [hero, ...rest] = filled;
    const hd = HERO_DUO_HEIGHT[heightPreset] || HERO_DUO_HEIGHT.normal;
    return (
      <div className={`flex ${GAP}`} style={{ height: hd.base }}>
        <div className="flex-[2] min-w-0 overflow-hidden rounded-2xl bg-gray-100">
          <img src={hero.imageUrl} alt="" className="w-full h-full object-contain object-center" loading="lazy" />
        </div>
        {rest.slice(0, 2).length > 0 && (
          <div className={`flex flex-col flex-1 min-w-0 ${GAP}`}>
            {rest.slice(0, 2).map((s, i) => (
              <div key={i} className="flex-1 min-h-0 overflow-hidden rounded-2xl bg-gray-100">
                <img src={s.imageUrl} alt="" className="w-full h-full object-contain object-center" loading="lazy" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ─── Overlay nav — arrows on edges, dots at bottom ─────────────────────────

function SliderNav({ index, total, onPrev, onNext, onDot }) {
  return (
    <>
      <button
        type="button"
        onClick={onPrev}
        disabled={index === 0}
        aria-label="Previous"
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-gray-700 hover:bg-white disabled:opacity-30 transition shadow-md"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={index === total - 1}
        aria-label="Next"
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-gray-700 hover:bg-white disabled:opacity-30 transition shadow-md"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onDot(i)}
            aria-label={`Go to ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
            }`}
          />
        ))}
      </div>
    </>
  );
}

// ─── Smooth sliding carousel ───────────────────────────────────────────────

function useResponsiveVisible(base) {
  const [count, setCount] = useState(base);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (base >= 4) {
        setCount(w >= 1024 ? 6 : w >= 768 ? 5 : base);
      } else {
        setCount(base);
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [base]);
  return count;
}

function SmoothCarousel({ layout, slides, visibleCount, autoPlay = true, autoPlayMs = 5000, heightPreset = 'normal' }) {
  const responsive = useResponsiveVisible(visibleCount);
  const total = slides.length;
  const maxIndex = Math.max(0, total - responsive);
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(index, maxIndex);
  const ratio = resolveRatio(layout, heightPreset);

  useEffect(() => {
    if (!autoPlay || maxIndex <= 0) return;
    const t = setInterval(
      () => setIndex((p) => (p >= maxIndex ? 0 : p + 1)),
      autoPlayMs,
    );
    return () => clearInterval(t);
  }, [autoPlay, autoPlayMs, maxIndex]);

  if (!total) return null;

  const trackWidthPct = (total / responsive) * 100;
  const translatePct = -(safeIndex / total) * 100;

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <div
          style={{
            display: 'flex',
            width: `${trackWidthPct}%`,
            transform: `translateX(${translatePct}%)`,
            transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {slides.map((slide, i) => (
            <div key={i} style={{ width: `${100 / total}%`, flexShrink: 0 }} className="px-1">
              <SlideImage slide={slide} ratio={ratio} />
            </div>
          ))}
        </div>
      </div>

      {maxIndex > 0 && (
        <SliderNav
          index={safeIndex}
          total={maxIndex + 1}
          onPrev={() => setIndex((p) => Math.max(0, p - 1))}
          onNext={() => setIndex((p) => Math.min(maxIndex, p + 1))}
          onDot={(i) => setIndex(i)}
        />
      )}
    </div>
  );
}

// ─── Page-based slider for grid layouts ───────────────────────────────────

function PagedSlider({ layout, slides, pageSize, autoPlay = true, autoPlayMs = 5000, heightPreset = 'normal' }) {
  const pages = [];
  for (let i = 0; i < slides.length; i += pageSize) {
    pages.push(slides.slice(i, i + pageSize));
  }
  const [page, setPage] = useState(0);
  const safePage = Math.min(page, Math.max(0, pages.length - 1));

  useEffect(() => {
    if (!autoPlay || pages.length <= 1) return;
    const t = setInterval(() => setPage((p) => (p + 1) % pages.length), autoPlayMs);
    return () => clearInterval(t);
  }, [autoPlay, autoPlayMs, pages.length]);

  if (!pages.length) return null;

  return (
    <div className="relative">
      <div key={safePage} style={{ animation: 'vbg-fade-in 0.4s ease' }}>
        <StaticGrid layout={layout} slides={pages[safePage]} heightPreset={heightPreset} />
      </div>

      {pages.length > 1 && (
        <SliderNav
          index={safePage}
          total={pages.length}
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => Math.min(pages.length - 1, p + 1))}
          onDot={(i) => setPage(i)}
        />
      )}

      <style>{`
        @keyframes vbg-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Main slider dispatcher ────────────────────────────────────────────────

const SMOOTH_CAROUSEL_LAYOUTS = new Set(['single', 'two-col', 'three-col', 'four-col']);

function MultiSlider({ layout, slides, autoPlay = true, autoPlayMs = 5000, heightPreset = 'normal' }) {
  const filled = slides.filter((s) => s?.imageUrl);
  if (!filled.length) return null;

  const visibleCount = LAYOUT_VISIBLE[layout] || 1;

  if (SMOOTH_CAROUSEL_LAYOUTS.has(layout)) {
    return <SmoothCarousel layout={layout} slides={filled} visibleCount={visibleCount} autoPlay={autoPlay} autoPlayMs={autoPlayMs} heightPreset={heightPreset} />;
  }

  return <PagedSlider layout={layout} slides={filled} pageSize={visibleCount} autoPlay={autoPlay} autoPlayMs={autoPlayMs} heightPreset={heightPreset} />;
}

// ─── Card Strip ────────────────────────────────────────────────────────────

function CardStrip({ slides, title }) {
  const filled = slides.filter((s) => s?.imageUrl);
  if (!filled.length) return null;

  return (
    <div className="px-3 pt-3 sm:px-5 sm:pt-4 lg:px-6 lg:pt-5">
      <style>{`
        .vbg-card-item { width: calc(100% / 3.3 - 8px); flex-shrink: 0; scroll-snap-align: start; }
        @media (min-width: 480px)  { .vbg-card-item { width: calc(100% / 4.3 - 8px); } }
        @media (min-width: 640px)  { .vbg-card-item { width: calc(100% / 5.3 - 8px); } }
        @media (min-width: 768px)  { .vbg-card-item { width: calc(100% / 6.3 - 8px); } }
        @media (min-width: 1024px) { .vbg-card-item { width: calc(100% / 7.3 - 8px); } }
      `}</style>
      {title && (
        <p className="font-semibold text-sm sm:text-base mb-3 px-0.5">{title}</p>
      )}
      <div
        className="flex gap-2 overflow-x-auto pb-1"
        style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {filled.map((slide, i) => {
          const href = String(slide?.linkUrl || '').trim();
          const isExternal = href.startsWith('http://') || href.startsWith('https://');
          const Tag = href ? 'a' : 'div';
          const linkProps = href
            ? { href, target: isExternal ? '_blank' : undefined, rel: isExternal ? 'noopener noreferrer' : undefined }
            : {};

          return (
            <Tag
              key={i}
              {...linkProps}
              className="vbg-card-item flex flex-col gap-1.5 no-underline group cursor-pointer"
            >
              <div className="w-full bg-gray-100 rounded-2xl overflow-hidden relative" style={{ aspectRatio: '1/1' }}>
                <img
                  src={slide.imageUrl}
                  alt={slide.label || ''}
                  className="w-full h-full object-contain object-center transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 rounded-2xl bg-gray-900/5 group-hover:bg-gray-900/10 transition-colors" />
              </div>
              {slide.label && (
                <span className="text-xs sm:text-sm font-medium text-gray-900 leading-tight line-clamp-2 px-0.5">
                  {slide.label}
                </span>
              )}
            </Tag>
          );
        })}
      </div>
    </div>
  );
}

// ─── Export ────────────────────────────────────────────────────────────────

export default function VendorBannerGrid({ bannerGrid }) {
  if (!bannerGrid) return null;
  const {
    layout = 'single',
    mode = 'static',
    displayStyle = 'banner',
    title = '',
    autoPlay = true,
    autoPlayMs = 5000,
    heightPreset = 'normal',
    slides = [],
  } = bannerGrid;
  const filled = slides.filter((s) => s?.imageUrl);
  if (!filled.length) return null;

  if (displayStyle === 'cards') {
    return <CardStrip slides={filled} title={title} />;
  }

  return (
    <>
      {mode === 'slider' ? (
        <MultiSlider layout={layout} slides={slides} autoPlay={autoPlay} autoPlayMs={autoPlayMs} heightPreset={heightPreset} />
      ) : (
        <StaticGrid layout={layout} slides={slides} heightPreset={heightPreset} />
      )}
    </>
  );
}
