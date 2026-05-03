'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const GAP = 'gap-0.5';

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

function SlideImage({ slide }) {
  return (
    <SlideLink slide={slide} className="overflow-hidden">
      <img
        src={slide.imageUrl}
        alt=""
        className="w-full block"
        loading="lazy"
      />
    </SlideLink>
  );
}

function StaticGrid({ layout, slides }) {
  const filled = slides.filter((s) => s?.imageUrl);
  if (!filled.length) return null;

  if (layout === 'single') {
    return <SlideImage slide={filled[0]} />;
  }

  if (layout === 'two-col') {
    return (
      <div className={`flex ${GAP}`}>
        {filled.slice(0, 2).map((s, i) => (
          <div key={i} className="flex-1 min-w-0">
            <SlideImage slide={s} />
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'three-col') {
    return (
      <div className={`flex ${GAP}`}>
        {filled.slice(0, 3).map((s, i) => (
          <div key={i} className="flex-1 min-w-0">
            <SlideImage slide={s} />
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'four-col') {
    return (
      <div className={`flex ${GAP}`}>
        {filled.slice(0, 4).map((s, i) => (
          <div key={i} className="flex-1 min-w-0">
            <SlideImage slide={s} />
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'two-by-two') {
    const rows = [filled.slice(0, 2), filled.slice(2, 4)];
    return (
      <div className={`flex flex-col ${GAP}`}>
        {rows.map((row, ri) =>
          row.length ? (
            <div key={ri} className={`flex ${GAP}`}>
              {row.map((s, ci) => (
                <div key={ci} className="flex-1 min-w-0">
                  <SlideImage slide={s} />
                </div>
              ))}
            </div>
          ) : null,
        )}
      </div>
    );
  }

  if (layout === 'hero-duo') {
    const [hero, ...rest] = filled;
    return (
      <div className={`flex ${GAP}`}>
        <div className="flex-[2] min-w-0">
          <SlideImage slide={hero} />
        </div>
        {rest.slice(0, 2).length > 0 && (
          <div className={`flex flex-col flex-1 min-w-0 ${GAP}`}>
            {rest.slice(0, 2).map((s, i) => (
              <div key={i} className="flex-1">
                <SlideImage slide={s} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

function Slider({ slides }) {
  const filled = slides.filter((s) => s?.imageUrl);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (filled.length <= 1) return;
    const t = setInterval(() => setIdx((p) => (p + 1) % filled.length), 5000);
    return () => clearInterval(t);
  }, [filled.length]);

  if (!filled.length) return null;

  const prev = () => setIdx((p) => (p - 1 + filled.length) % filled.length);
  const next = () => setIdx((p) => (p + 1) % filled.length);

  return (
    <div className="relative overflow-hidden group">
      <SlideLink slide={filled[idx]}>
        <img
          src={filled[idx].imageUrl}
          alt=""
          className="w-full block"
          loading="lazy"
        />
      </SlideLink>

      {filled.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous"
            className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {filled.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function VendorBannerGrid({ bannerGrid }) {
  if (!bannerGrid) return null;
  const { layout = 'single', mode = 'static', slides = [] } = bannerGrid;
  const filled = slides.filter((s) => s?.imageUrl);
  if (!filled.length) return null;

  return (
    <div className="mb-2 overflow-hidden">
      {mode === 'slider' ? (
        <Slider slides={slides} />
      ) : (
        <StaticGrid layout={layout} slides={slides} />
      )}
    </div>
  );
}
