'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import MediaLibraryModal from '../../../store-front/components/MediaLibraryModal';

// ─── Layout definitions (for banner_grid) ─────────────────────────────────

const LAYOUTS = [
  { key: 'single',     label: 'Single',   slots: 1 },
  { key: 'two-col',    label: '2 Column', slots: 2 },
  { key: 'hero-duo',   label: 'Hero + 2', slots: 3 },
  { key: 'two-by-two', label: '2 × 2',    slots: 4 },
  { key: 'three-col',  label: '3 Column', slots: 3 },
  { key: 'four-col',   label: '4 Column', slots: 4 },
];

function LayoutPreview({ layoutKey, active }) {
  const base = `w-full h-full rounded transition ${active ? 'fill-slate-900' : 'fill-slate-300'}`;
  const previews = {
    single: <svg viewBox="0 0 40 24" className="w-8 h-5"><rect x="1" y="1" width="38" height="22" rx="1.5" className={base} /></svg>,
    'two-col': <svg viewBox="0 0 40 24" className="w-8 h-5"><rect x="1" y="1" width="18" height="22" rx="1.5" className={base} /><rect x="21" y="1" width="18" height="22" rx="1.5" className={base} /></svg>,
    'hero-duo': <svg viewBox="0 0 40 24" className="w-8 h-5"><rect x="1" y="1" width="24" height="22" rx="1.5" className={base} /><rect x="27" y="1" width="12" height="10" rx="1.5" className={base} /><rect x="27" y="13" width="12" height="10" rx="1.5" className={base} /></svg>,
    'two-by-two': <svg viewBox="0 0 40 24" className="w-8 h-5"><rect x="1" y="1" width="18" height="10" rx="1.5" className={base} /><rect x="21" y="1" width="18" height="10" rx="1.5" className={base} /><rect x="1" y="13" width="18" height="10" rx="1.5" className={base} /><rect x="21" y="13" width="18" height="10" rx="1.5" className={base} /></svg>,
    'three-col': <svg viewBox="0 0 40 24" className="w-8 h-5"><rect x="1" y="1" width="11" height="22" rx="1.5" className={base} /><rect x="14" y="1" width="12" height="22" rx="1.5" className={base} /><rect x="28" y="1" width="11" height="22" rx="1.5" className={base} /></svg>,
    'four-col': <svg viewBox="0 0 40 24" className="w-8 h-5"><rect x="1" y="1" width="8" height="22" rx="1.5" className={base} /><rect x="11" y="1" width="8" height="22" rx="1.5" className={base} /><rect x="21" y="1" width="8" height="22" rx="1.5" className={base} /><rect x="31" y="1" width="8" height="22" rx="1.5" className={base} /></svg>,
  };
  return previews[layoutKey] || null;
}

// ─── Block type registry ───────────────────────────────────────────────────

const BLOCK_TYPES = [
  {
    key: 'hero_slider',
    label: 'Hero Slider',
    description: 'Full-width hero banner with desktop & mobile image slots.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
      </svg>
    ),
    defaultConfig: () => ({ slides: [{ desktopUrl: '', mobileUrl: '', linkUrl: '' }] }),
  },
  {
    key: 'browse_cards',
    label: 'Browse Categories',
    description: 'Category card grid with All / Men / Women tabs.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
      </svg>
    ),
    defaultConfig: () => ({ title: '', cards: [] }),
  },
  {
    key: 'banner_grid',
    label: 'Banner Grid',
    description: 'Image grid or slider with clickable links.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" />
        <rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" />
      </svg>
    ),
    defaultConfig: () => ({ layout: 'four-col', mode: 'slider', displayStyle: 'banner', title: '', autoPlay: true, autoPlayMs: 5000, heightPreset: 'normal', slides: [{ imageUrl: '', linkUrl: '', label: '' }] }),
  },
  {
    key: 'featured_strip',
    label: 'Featured Strip',
    description: 'Side image with a product grid filtered by category or tag.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="2" y="3" width="8" height="18" rx="1.5" /><rect x="12" y="3" width="4" height="4" rx="1" />
        <rect x="18" y="3" width="4" height="4" rx="1" /><rect x="12" y="10" width="4" height="4" rx="1" />
        <rect x="18" y="10" width="4" height="4" rx="1" />
      </svg>
    ),
    defaultConfig: () => ({ imageUrl: '', imageKey: '', titleMain: '', filterType: 'none', categoryId: '', tagId: '' }),
  },
  {
    key: 'logo_grid',
    label: 'Logo Grid',
    description: 'Brand logo grid with title and colors.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="2" y="7" width="6" height="4" rx="1" /><rect x="9" y="7" width="6" height="4" rx="1" />
        <rect x="16" y="7" width="6" height="4" rx="1" /><rect x="2" y="13" width="6" height="4" rx="1" />
        <rect x="9" y="13" width="6" height="4" rx="1" /><rect x="16" y="13" width="6" height="4" rx="1" />
      </svg>
    ),
    defaultConfig: () => ({ title: '', titleBgColor: '#111827', titleTextColor: '#ffffff', items: [] }),
  },
  {
    key: 'product_catalog',
    label: 'Product Catalog',
    description: 'Product grid with title, description, and filter.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    ),
    defaultConfig: () => ({ title: '', subtitle: '', filterMode: 'none', categoryId: '', tagId: '', limit: 12 }),
  },
];

const genId = () => `block_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
const genCardId = () => `card_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
const emptySlide = () => ({ imageUrl: '', linkUrl: '', label: '' });
const isSafeUrl = (v) => v === '' || v.startsWith('/') || v.startsWith('http://') || v.startsWith('https://');

// ─── Image slot helper ─────────────────────────────────────────────────────

function ImageSlot({ url, onPick, onClear, label, heightClass = 'h-28' }) {
  return url ? (
    <div className={`relative group rounded-xl overflow-hidden ${heightClass}`}>
      <img src={url} alt="" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
        <button type="button" onClick={onPick} className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-900">Replace</button>
        <button type="button" onClick={onClear} className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-red-600">Remove</button>
      </div>
    </div>
  ) : (
    <button type="button" onClick={onPick}
      className={`w-full ${heightClass} rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:bg-slate-50 hover:border-slate-400 transition`}>
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
      {label && <span className="text-xs font-medium">{label}</span>}
    </button>
  );
}

// ─── Banner Grid editor ────────────────────────────────────────────────────

// aspect ratio per layout slot
const LAYOUT_ASPECT = {
  single:     'aspect-[21/8]',
  'two-col':  'aspect-[4/5]',
  'hero-duo': null, // handled manually
  'two-by-two': 'aspect-square',
  'three-col':  'aspect-[3/4]',
  'four-col':   'aspect-[3/4]',
};

const LAYOUT_GRID_COLS = {
  single:       'grid-cols-1',
  'two-col':    'grid-cols-2',
  'two-by-two': 'grid-cols-2',
  'three-col':  'grid-cols-3',
  'four-col':   'grid-cols-4',
};

function BannerSlotCell({ slide, index, aspectClass, onPick, onClear, onLinkChange, onLabelChange, onRemove, fullHeight = false, showLabel = false }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      {/* image area */}
      {slide.imageUrl ? (
        <div className={`relative group ${fullHeight ? 'flex-1' : aspectClass}`}>
          <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
            <button type="button" onClick={onPick} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-900">Replace</button>
            <button type="button" onClick={onClear} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-red-600">Clear</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={onPick}
          className={`${fullHeight ? 'flex-1 min-h-[80px]' : aspectClass} w-full flex flex-col items-center justify-center gap-1 text-slate-400 hover:bg-slate-100 transition`}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z" />
          </svg>
          <span className="text-[10px] font-medium">Slot {index + 1}</span>
        </button>
      )}
      {/* label input (card strip mode only) */}
      {showLabel && (
        <div className="border-t border-slate-200 px-2 py-1.5">
          <input type="text" placeholder="Label (e.g. Men's fashion)" value={slide.label || ''}
            onChange={(e) => onLabelChange?.(e.target.value)}
            className="w-full bg-transparent text-[10px] text-slate-700 outline-none placeholder:text-slate-400 font-medium" />
        </div>
      )}
      {/* link input */}
      <div className="border-t border-slate-200 px-2 py-1.5">
        <input type="text" placeholder="Link URL (optional)" value={slide.linkUrl}
          onChange={(e) => onLinkChange(e.target.value)}
          className="w-full bg-transparent text-[10px] text-slate-700 outline-none placeholder:text-slate-400" />
      </div>
      {/* remove button */}
      {onRemove && (
        <button type="button" onClick={onRemove}
          className="w-full border-t border-slate-200 py-1 text-[10px] font-semibold text-slate-400 hover:bg-red-50 hover:text-red-500 transition">
          Remove slide
        </button>
      )}
    </div>
  );
}

const HEIGHT_PRESETS = [
  { key: 'mini',    label: 'Mini',    hint: 'Short landscape strips — very wide, low height' },
  { key: 'compact', label: 'Compact', hint: 'Square cards — like product thumbnails' },
  { key: 'normal',  label: 'Normal',  hint: 'Portrait cards (default proportions)' },
  { key: 'large',   label: 'Large',   hint: 'Tall portrait banners' },
  { key: 'full',    label: 'Full',    hint: 'Maximum height — near full-screen tall' },
];

const AUTOPLAY_SPEEDS = [
  { ms: 2000,  label: '2s' },
  { ms: 3000,  label: '3s' },
  { ms: 5000,  label: '5s' },
  { ms: 7000,  label: '7s' },
  { ms: 10000, label: '10s' },
];

function BannerGridEditor({ config, onChange }) {
  const layout = config?.layout || 'single';
  const mode = config?.mode || 'static';
  const displayStyle = config?.displayStyle || 'banner';
  const title = config?.title || '';
  const autoPlay = config?.autoPlay !== false;
  const autoPlayMs = config?.autoPlayMs || 5000;
  const heightPreset = config?.heightPreset || 'normal';
  const slotCount = LAYOUTS.find((l) => l.key === layout)?.slots ?? 1;
  const [mediaPickerSlot, setMediaPickerSlot] = useState(null);
  const [adminPage, setAdminPage] = useState(0);

  const rawSlides = Array.isArray(config?.slides) ? config.slides : [];

  const slides = mode === 'slider'
    ? Array.from({ length: Math.max(slotCount, rawSlides.length) }, (_, i) => rawSlides[i] || emptySlide())
    : Array.from({ length: slotCount }, (_, i) => rawSlides[i] || emptySlide());

  // Admin pagination (slider mode only)
  const pageCount = mode === 'slider' ? Math.ceil(slides.length / slotCount) : 1;
  const safePage = Math.min(adminPage, Math.max(0, pageCount - 1));
  const pageStart = safePage * slotCount;
  const visibleSlides = mode === 'slider' ? slides.slice(pageStart, pageStart + slotCount) : slides;

  const update = (patch) => onChange({ ...config, ...patch });

  const handleLayoutChange = (nextLayout) => {
    const nextSlots = LAYOUTS.find((l) => l.key === nextLayout)?.slots ?? 1;
    const nextSlides = mode === 'slider'
      ? Array.from({ length: Math.max(nextSlots, rawSlides.length) }, (_, i) => rawSlides[i] || emptySlide())
      : Array.from({ length: nextSlots }, (_, i) => rawSlides[i] || emptySlide());
    setAdminPage(0);
    onChange({ ...config, layout: nextLayout, slides: nextSlides });
  };

  const handleModeChange = (nextMode) => {
    setAdminPage(0);
    if (nextMode === 'static') {
      const trimmed = Array.from({ length: slotCount }, (_, i) => slides[i] || emptySlide());
      onChange({ ...config, mode: nextMode, slides: trimmed });
    } else {
      update({ mode: nextMode });
    }
  };

  const updateSlide = useCallback((index, field, value) => {
    const nextSlides = slides.map((s, i) => i === index ? { ...s, [field]: value } : s);
    onChange({ ...config, slides: nextSlides });
  }, [slides, config, onChange]);

  const addSlide = useCallback(() => {
    const nextSlides = [...slides, emptySlide()];
    onChange({ ...config, slides: nextSlides });
    // Jump to the page that contains the new slide
    setAdminPage(Math.floor((nextSlides.length - 1) / slotCount));
  }, [slides, slotCount, config, onChange]);

  const removeSlide = useCallback((globalIdx) => {
    const next = slides.filter((_, i) => i !== globalIdx);
    const padded = Array.from({ length: Math.max(slotCount, next.length) }, (_, i) => next[i] || emptySlide());
    onChange({ ...config, slides: padded });
    const newPageCount = Math.ceil(padded.length / slotCount);
    if (safePage >= newPageCount) setAdminPage(Math.max(0, newPageCount - 1));
  }, [slides, slotCount, safePage, config, onChange]);

  const handleMediaSelect = useCallback((url) => {
    if (mediaPickerSlot !== null) updateSlide(mediaPickerSlot, 'imageUrl', url);
  }, [mediaPickerSlot, updateSlide]);

  const aspectClass = LAYOUT_ASPECT[layout] || 'aspect-[4/3]';
  const gridColsClass = LAYOUT_GRID_COLS[layout];

  // Build cell props using the global index (so callbacks always target the right slide)
  const cellAt = (globalIdx, slide) => ({
    slide: slide || emptySlide(),
    index: globalIdx,
    aspectClass,
    showLabel: displayStyle === 'cards',
    onPick: () => setMediaPickerSlot(globalIdx),
    onClear: () => updateSlide(globalIdx, 'imageUrl', ''),
    onLinkChange: (v) => updateSlide(globalIdx, 'linkUrl', v),
    onLabelChange: (v) => updateSlide(globalIdx, 'label', v),
    onRemove: (mode === 'slider' && slides.length > slotCount) ? () => removeSlide(globalIdx) : undefined,
  });

  const renderImageGrid = () => {
    if (layout === 'hero-duo') {
      const s = visibleSlides;
      const g = pageStart;
      return (
        <div className="grid gap-1.5" style={{ gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr' }}>
          <div style={{ gridRow: '1 / 3' }} className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {s[0]?.imageUrl ? (
              <div className="relative group flex-1 min-h-[200px]">
                <img src={s[0].imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <button type="button" onClick={() => setMediaPickerSlot(g)} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-900">Replace</button>
                  <button type="button" onClick={() => updateSlide(g, 'imageUrl', '')} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-red-600">Remove</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setMediaPickerSlot(g)}
                className="flex-1 min-h-[200px] flex flex-col items-center justify-center gap-1 text-slate-400 hover:bg-slate-100 transition">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z" /></svg>
                <span className="text-[10px] font-medium">Slot 1 (large)</span>
              </button>
            )}
            <div className="border-t border-slate-200 px-2 py-1.5">
              <input type="text" placeholder="Link URL" value={s[0]?.linkUrl || ''}
                onChange={(e) => updateSlide(g, 'linkUrl', e.target.value)}
                className="w-full bg-transparent text-[10px] text-slate-700 outline-none placeholder:text-slate-400" />
            </div>
          </div>
          <BannerSlotCell {...cellAt(g + 1, s[1])} fullHeight />
          <BannerSlotCell {...cellAt(g + 2, s[2])} fullHeight />
        </div>
      );
    }

    return (
      <div className={`grid gap-1.5 ${gridColsClass}`}>
        {visibleSlides.map((slide, localIdx) => (
          <BannerSlotCell key={pageStart + localIdx} {...cellAt(pageStart + localIdx, slide)} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5 pt-1">

      {/* ── Display Style ─────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Style</p>
        <div className="flex gap-2">
          {[
            { key: 'banner', label: 'Banner', desc: 'Full-bleed image blocks' },
            { key: 'cards',  label: 'Card Strip', desc: 'Square thumbnails with labels' },
          ].map((s) => (
            <button key={s.key} type="button" onClick={() => update({ displayStyle: s.key })}
              className={`flex-1 rounded-xl border-2 py-2.5 px-3 text-left transition ${displayStyle === s.key ? 'border-slate-900 bg-slate-900' : 'border-slate-200 bg-white hover:border-slate-400'}`}>
              <p className={`text-xs font-bold ${displayStyle === s.key ? 'text-white' : 'text-slate-700'}`}>{s.label}</p>
              <p className={`text-[10px] mt-0.5 ${displayStyle === s.key ? 'text-slate-400' : 'text-slate-400'}`}>{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Section title (both modes, optional) ─────────────── */}
      <label className="block">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Section title <span className="font-normal normal-case">(optional)</span></span>
        <input value={title} onChange={(e) => update({ title: e.target.value })}
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
          placeholder={displayStyle === 'cards' ? 'e.g. Shop by category' : 'e.g. New arrivals'} />
      </label>

      {/* ── Banner-only controls: Layout, Display, Auto-play, Height ── */}
      {displayStyle === 'banner' && (
        <>
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Layout</p>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
              {LAYOUTS.map((l) => (
                <button key={l.key} type="button" onClick={() => handleLayoutChange(l.key)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-2.5 transition ${layout === l.key ? 'border-slate-900 bg-slate-900' : 'border-slate-200 hover:border-slate-400 bg-white'}`}>
                  <LayoutPreview layoutKey={l.key} active={layout === l.key} />
                  <span className={`text-[9px] font-bold uppercase tracking-wide leading-none ${layout === l.key ? 'text-white' : 'text-slate-400'}`}>{l.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Display</p>
            <div className="flex gap-2">
              {['static', 'slider'].map((m) => (
                <button key={m} type="button" onClick={() => handleModeChange(m)}
                  className={`flex-1 rounded-xl border-2 py-2 text-xs font-bold uppercase tracking-wider transition ${mode === m ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-500 hover:border-slate-400'}`}>
                  {m === 'static' ? 'Static Grid' : 'Slider'}
                </button>
              ))}
            </div>
            {mode === 'slider' && (
              <p className="mt-1.5 text-[10px] text-slate-400">
                Cycles {slotCount > 1 ? `${slotCount} images` : '1 image'} at a time · add as many slides as you like
              </p>
            )}
          </div>

          {mode === 'slider' && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Auto-play</p>
              <div className="flex items-center gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => update({ autoPlay: !autoPlay })}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-colors ${autoPlay ? 'border-slate-900 bg-slate-900' : 'border-slate-300 bg-slate-200'}`}
                  role="switch"
                  aria-checked={autoPlay}
                >
                  <span className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform mt-[1px] ${autoPlay ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-xs font-medium text-slate-600">{autoPlay ? 'Auto-advances slides' : 'Manual only'}</span>
              </div>
              {autoPlay && (
                <div>
                  <p className="mb-1.5 text-[10px] text-slate-400">Advance every</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {AUTOPLAY_SPEEDS.map((s) => (
                      <button key={s.ms} type="button" onClick={() => update({ autoPlayMs: s.ms })}
                        className={`rounded-lg border-2 px-3 py-1 text-xs font-bold transition ${autoPlayMs === s.ms ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-500 hover:border-slate-400'}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Height</p>
            <div className="grid grid-cols-5 gap-1.5">
              {HEIGHT_PRESETS.map((h) => (
                <button key={h.key} type="button" onClick={() => update({ heightPreset: h.key })}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 px-1.5 py-2.5 transition ${heightPreset === h.key ? 'border-slate-900 bg-slate-900' : 'border-slate-200 bg-white hover:border-slate-400'}`}>
                  <div className={`w-6 rounded bg-current transition ${heightPreset === h.key ? 'text-white/40' : 'text-slate-200'} ${h.key === 'mini' ? 'h-1.5' : h.key === 'compact' ? 'h-2.5' : h.key === 'normal' ? 'h-4' : h.key === 'large' ? 'h-5' : 'h-7'}`} />
                  <span className={`text-[8px] font-bold uppercase tracking-wide leading-none ${heightPreset === h.key ? 'text-white' : 'text-slate-400'}`}>{h.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400">{HEIGHT_PRESETS.find((h) => h.key === heightPreset)?.hint}</p>
          </div>
        </>
      )}

      <div>
        {/* Header row: label + page indicator */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {mode === 'slider'
              ? `Images — ${slides.length} slide${slides.length !== 1 ? 's' : ''}`
              : `Images — ${slotCount} slot${slotCount !== 1 ? 's' : ''}`}
          </p>
          {mode === 'slider' && pageCount > 1 && (
            <span className="text-[10px] font-semibold text-slate-500">
              Page {safePage + 1} / {pageCount}
            </span>
          )}
        </div>

        {/* Prev / dots / Next nav (slider mode, multiple pages) */}
        {mode === 'slider' && pageCount > 1 && (
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => setAdminPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex flex-1 items-center justify-center gap-1.5">
              {Array.from({ length: pageCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAdminPage(i)}
                  className={`h-1.5 rounded-full transition-all ${i === safePage ? 'w-6 bg-slate-900' : 'w-1.5 bg-slate-300 hover:bg-slate-500'}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setAdminPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage === pageCount - 1}
              className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {renderImageGrid()}

        {mode === 'slider' && (
          <button
            type="button"
            onClick={addSlide}
            className="mt-2 w-full rounded-xl border-2 border-dashed border-slate-200 py-3 text-xs font-semibold text-slate-400 hover:border-slate-400 hover:text-slate-600 transition flex items-center justify-center gap-1.5"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Slide
          </button>
        )}
      </div>

      <MediaLibraryModal
        isOpen={mediaPickerSlot !== null}
        onClose={() => setMediaPickerSlot(null)}
        onSelect={handleMediaSelect}
      />
    </div>
  );
}

// ─── Hero Slider editor ────────────────────────────────────────────────────

function HeroSliderEditor({ config, onChange }) {
  const [picker, setPicker] = useState(null); // { slot: number, target: 'desktop'|'mobile' }
  const MAX_SLIDES = 5;
  const rawSlides = Array.isArray(config?.slides) ? config.slides : [];
  const slides = Array.from({ length: MAX_SLIDES }, (_, i) => rawSlides[i] || { desktopUrl: '', mobileUrl: '', linkUrl: '' });

  const updateSlide = useCallback((i, field, value) => {
    const next = slides.map((s, idx) => idx === i ? { ...s, [field]: value } : s);
    onChange({ ...config, slides: next });
  }, [slides, config, onChange]);

  const handleMediaSelect = useCallback((url) => {
    if (!picker) return;
    updateSlide(picker.slot, picker.target === 'desktop' ? 'desktopUrl' : 'mobileUrl', url);
  }, [picker, updateSlide]);

  return (
    <div className="space-y-3 pt-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Slides — up to {MAX_SLIDES}</p>
      {slides.map((slide, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Slide {i + 1}</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 mb-1.5">Desktop</p>
              <ImageSlot
                url={slide.desktopUrl}
                onPick={() => setPicker({ slot: i, target: 'desktop' })}
                onClear={() => updateSlide(i, 'desktopUrl', '')}
                label="Choose desktop image"
                heightClass="h-20"
              />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 mb-1.5">Mobile <span className="font-normal normal-case">(optional)</span></p>
              <ImageSlot
                url={slide.mobileUrl}
                onPick={() => setPicker({ slot: i, target: 'mobile' })}
                onClear={() => updateSlide(i, 'mobileUrl', '')}
                label="Choose mobile image"
                heightClass="h-20"
              />
            </div>
          </div>
          <input type="text" placeholder="Link URL (optional)"
            value={slide.linkUrl}
            onChange={(e) => updateSlide(i, 'linkUrl', e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400" />
        </div>
      ))}

      <MediaLibraryModal
        isOpen={picker !== null}
        onClose={() => setPicker(null)}
        onSelect={handleMediaSelect}
      />
    </div>
  );
}

// ─── Featured Strip editor ─────────────────────────────────────────────────

function FeaturedStripEditor({ config, onChange, categoryOptions = [], tags = [] }) {
  const [picking, setPicking] = useState(false);
  const filterType = config?.filterType || 'none';
  const update = (patch) => onChange({ ...config, ...patch });
  const handleMediaSelect = useCallback((url) => { update({ imageUrl: url }); }, [config]);

  return (
    <div className="space-y-4 pt-1">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Strip Image</p>
        <ImageSlot
          url={config?.imageUrl}
          onPick={() => setPicking(true)}
          onClear={() => update({ imageUrl: '', imageKey: '' })}
          label="Choose strip image"
          heightClass="h-40"
        />
      </div>

      <label className="block">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Title</span>
        <input value={config?.titleMain || ''} onChange={(e) => update({ titleMain: e.target.value })}
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
          placeholder="Premium picks" />
      </label>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Filter</label>
          <select value={filterType} onChange={(e) => update({ filterType: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none">
            <option value="none">None</option>
            <option value="category">Category</option>
            <option value="tag">Tag</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Category</label>
          <select value={config?.categoryId || ''} onChange={(e) => update({ categoryId: e.target.value })}
            disabled={filterType !== 'category'}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none disabled:bg-slate-50 disabled:text-slate-400">
            <option value="">Select</option>
            {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tag</label>
          <select value={config?.tagId || ''} onChange={(e) => update({ tagId: e.target.value })}
            disabled={filterType !== 'tag'}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none disabled:bg-slate-50 disabled:text-slate-400">
            <option value="">Select</option>
            {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      <MediaLibraryModal isOpen={picking} onClose={() => setPicking(false)} onSelect={handleMediaSelect} />
    </div>
  );
}

// ─── Product Catalog editor ────────────────────────────────────────────────

function ProductCatalogEditor({ config, onChange, categoryOptions = [], tags = [] }) {
  const filterMode = config?.filterMode || 'none';
  const update = (patch) => onChange({ ...config, ...patch });

  return (
    <div className="space-y-4 pt-1">
      <label className="block">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Section title</span>
        <input value={config?.title || ''} onChange={(e) => update({ title: e.target.value })}
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
          placeholder="Fashion Collection" />
      </label>

      <label className="block">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</span>
        <textarea value={config?.subtitle || ''} onChange={(e) => update({ subtitle: e.target.value })}
          rows={2}
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400 resize-none"
          placeholder="Discover our latest trends and bestsellers" />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Filter mode</label>
          <select value={filterMode} onChange={(e) => update({ filterMode: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none">
            <option value="none">None — show all</option>
            <option value="category">Category</option>
            <option value="tag">Tag</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Product limit</label>
          <input type="number" min={1} max={30}
            value={config?.limit || 12}
            onChange={(e) => update({ limit: Math.max(1, Math.min(30, Number(e.target.value) || 12)) })}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Category</label>
          <select value={config?.categoryId || ''} onChange={(e) => update({ categoryId: e.target.value })}
            disabled={filterMode !== 'category'}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none disabled:bg-slate-50 disabled:text-slate-400">
            <option value="">Select category</option>
            {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tag</label>
          <select value={config?.tagId || ''} onChange={(e) => update({ tagId: e.target.value })}
            disabled={filterMode !== 'tag'}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none disabled:bg-slate-50 disabled:text-slate-400">
            <option value="">Select tag</option>
            {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Browse Cards editor ───────────────────────────────────────────────────

const SEGMENTS = ['all', 'men', 'women'];

function BrowseCardsEditor({ config, onChange }) {
  const [activeSegment, setActiveSegment] = useState('all');
  const [pickerCardId, setPickerCardId] = useState(null);
  const cards = Array.isArray(config?.cards) ? config.cards : [];
  const segmentCards = cards.filter((c) => c.segment === activeSegment);

  const updateCards = (next) => onChange({ ...config, cards: next });
  const addCard = () => updateCards([...cards, { id: genCardId(), segment: activeSegment, name: '', link: '', imageUrl: '', imageKey: '', imageAlt: '' }]);
  const updateCard = (id, patch) => updateCards(cards.map((c) => c.id === id ? { ...c, ...patch } : c));
  const removeCard = (id) => updateCards(cards.filter((c) => c.id !== id));

  const handleMediaSelect = useCallback((url) => {
    if (pickerCardId) updateCard(pickerCardId, { imageUrl: url });
  }, [pickerCardId, cards]);

  return (
    <div className="space-y-4 pt-1">
      <label className="block">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Section title</span>
        <input value={config?.title || ''} onChange={(e) => onChange({ ...config, title: e.target.value })}
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
          placeholder="People's Favorite" />
      </label>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Segment</p>
        <div className="flex gap-2">
          {SEGMENTS.map((seg) => (
            <button key={seg} type="button" onClick={() => setActiveSegment(seg)}
              className={`flex-1 rounded-xl border-2 py-1.5 text-xs font-bold uppercase tracking-wide transition ${activeSegment === seg ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-500 hover:border-slate-400'}`}>
              {seg}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {segmentCards.map((card) => (
          <div key={card.id} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="shrink-0 w-16 h-16">
              <ImageSlot
                url={card.imageUrl}
                onPick={() => setPickerCardId(card.id)}
                onClear={() => updateCard(card.id, { imageUrl: '', imageKey: '' })}
                heightClass="h-16"
              />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <input type="text" placeholder="Category name"
                value={card.name} onChange={(e) => updateCard(card.id, { name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400" />
              <input type="text" placeholder="Link URL (e.g. /category/men)"
                value={card.link} onChange={(e) => updateCard(card.id, { link: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400" />
            </div>
            <button type="button" onClick={() => removeCard(card.id)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition self-start">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        <button type="button" onClick={addCard}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 py-3 text-xs font-semibold text-slate-400 hover:border-slate-400 hover:text-slate-600 transition">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add card to {activeSegment}
        </button>
      </div>

      <MediaLibraryModal
        isOpen={pickerCardId !== null}
        onClose={() => setPickerCardId(null)}
        onSelect={handleMediaSelect}
      />
    </div>
  );
}

// ─── Logo Grid editor (fully self-contained) ──────────────────────────────

const genLogoId = () => `logo_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

function LogoGridEditor({ config, onChange }) {
  const [picking, setPicking] = useState(false);
  const update = (patch) => onChange({ ...config, ...patch });
  const items = Array.isArray(config?.items) ? config.items : [];

  const handleMediaSelect = useCallback((url) => {
    const newItem = { id: genLogoId(), image_url: url, image_key: '', image_alt: '' };
    onChange({ ...config, items: [...items, newItem] });
  }, [config, items, onChange]);

  const removeItem = (id) => onChange({ ...config, items: items.filter((item) => item.id !== id) });

  return (
    <div className="space-y-4 pt-1">
      <label className="block">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Title</span>
        <input value={config?.title || ''} onChange={(e) => update({ title: e.target.value })}
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
          placeholder="Our Brands" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Title background</span>
          <div className="mt-1.5 flex items-center gap-2">
            <input type="color" value={config?.titleBgColor || '#111827'} onChange={(e) => update({ titleBgColor: e.target.value })}
              className="h-9 w-12 rounded-lg border border-slate-200 p-0.5 cursor-pointer" />
            <span className="text-xs text-slate-500 font-mono">{config?.titleBgColor || '#111827'}</span>
          </div>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Title text</span>
          <div className="mt-1.5 flex items-center gap-2">
            <input type="color" value={config?.titleTextColor || '#ffffff'} onChange={(e) => update({ titleTextColor: e.target.value })}
              className="h-9 w-12 rounded-lg border border-slate-200 p-0.5 cursor-pointer" />
            <span className="text-xs text-slate-500 font-mono">{config?.titleTextColor || '#ffffff'}</span>
          </div>
        </label>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
          Logos — {items.length} added
        </p>
        {items.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-2 sm:grid-cols-4">
            {items.map((item) => (
              <div key={item.id} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                <img src={item.image_url} alt={item.image_alt || ''} className="w-full h-16 object-contain p-1" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <button type="button" onClick={() => removeItem(item.id)}
                    className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-red-600">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={() => setPicking(true)}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 py-3 text-xs font-semibold text-slate-400 hover:border-slate-400 hover:text-slate-600 transition">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add logo from library
        </button>
      </div>

      <MediaLibraryModal isOpen={picking} onClose={() => setPicking(false)} onSelect={handleMediaSelect} />
    </div>
  );
}

// ─── Block subtitle helper ─────────────────────────────────────────────────

function blockSubtitle(block) {
  const cfg = block.config || {};
  switch (block.type) {
    case 'banner_grid': {
      const layoutLabel = LAYOUTS.find((l) => l.key === cfg.layout)?.label || 'Single';
      return `${layoutLabel} · ${cfg.mode === 'slider' ? 'Slider' : 'Static'}`;
    }
    case 'hero_slider': {
      const count = (Array.isArray(cfg.slides) ? cfg.slides : []).filter((s) => s.desktopUrl).length;
      return `${count} slide${count !== 1 ? 's' : ''}`;
    }
    case 'featured_strip': return cfg.titleMain || 'No title';
    case 'product_catalog': return cfg.title || 'No title';
    case 'browse_cards': {
      const count = Array.isArray(cfg.cards) ? cfg.cards.length : 0;
      return `${count} card${count !== 1 ? 's' : ''}`;
    }
    case 'logo_grid': {
      const count = Array.isArray(cfg.items) ? cfg.items.length : 0;
      return `${count} logo${count !== 1 ? 's' : ''}${cfg.title ? ` · ${cfg.title}` : ''}`;
    }
    default: return '';
  }
}

// ─── Block item row ────────────────────────────────────────────────────────

function BlockItem({ block, isExpanded, onToggle, onDelete, onConfigChange, onDragStart, onDragOver, onDrop, categoryOptions, tags }) {
  const typeMeta = BLOCK_TYPES.find((t) => t.key === block.type);
  const subtitle = blockSubtitle(block);

  return (
    <div draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop}
      className="group rounded-xl border border-slate-200 bg-white overflow-hidden transition-shadow hover:shadow-sm">
      {/* Row */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {/* drag handle */}
        <svg className="h-3.5 w-3.5 text-slate-300 shrink-0 cursor-grab active:cursor-grabbing" fill="currentColor" viewBox="0 0 16 16">
          <circle cx="5" cy="4" r="1.2" /><circle cx="11" cy="4" r="1.2" />
          <circle cx="5" cy="8" r="1.2" /><circle cx="11" cy="8" r="1.2" />
          <circle cx="5" cy="12" r="1.2" /><circle cx="11" cy="12" r="1.2" />
        </svg>
        {/* icon */}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 [&>svg]:h-4 [&>svg]:w-4">
          {typeMeta?.icon}
        </span>
        {/* label + meta */}
        <button type="button" onClick={onToggle} className="flex-1 min-w-0 text-left">
          <span className="text-[13px] font-medium text-slate-800">{typeMeta?.label || block.type}</span>
          {subtitle && <span className="ml-2 text-[11px] text-slate-400">{subtitle}</span>}
        </button>
        {/* chevron */}
        <button type="button" onClick={onToggle}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition shrink-0">
          <svg className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
          </svg>
        </button>
        {/* delete — visible on hover */}
        <button type="button" onClick={onDelete}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500 transition shrink-0">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {/* Expanded editor */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-white px-4 pb-6 pt-4">
          {block.type === 'banner_grid'    && <BannerGridEditor    config={block.config} onChange={onConfigChange} />}
          {block.type === 'hero_slider'    && <HeroSliderEditor    config={block.config} onChange={onConfigChange} />}
          {block.type === 'featured_strip' && <FeaturedStripEditor config={block.config} onChange={onConfigChange} categoryOptions={categoryOptions} tags={tags} />}
          {block.type === 'product_catalog'&& <ProductCatalogEditor config={block.config} onChange={onConfigChange} categoryOptions={categoryOptions} tags={tags} />}
          {block.type === 'browse_cards'   && <BrowseCardsEditor   config={block.config} onChange={onConfigChange} />}
          {block.type === 'logo_grid'      && <LogoGridEditor      config={block.config} onChange={onConfigChange} />}
        </div>
      )}
    </div>
  );
}

// ─── Block picker modal ────────────────────────────────────────────────────

function BlockPicker({ onAdd, onClose }) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 w-full bg-white shadow-2xl sm:max-w-md sm:rounded-2xl overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-900">Add section</p>
          <button type="button" onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* list */}
        <div className="overflow-y-auto max-h-[60vh] py-2">
          {BLOCK_TYPES.map((t) => (
            <button key={t.key} type="button" onClick={() => { onAdd(t.key); onClose(); }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 [&>svg]:h-4 [&>svg]:w-4">
                {t.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-slate-800 leading-tight">{t.label}</p>
                <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">{t.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main HomePageBuilder ──────────────────────────────────────────────────

export default function HomePageBuilder({ homePage, categoryOptions = [], tags = [] }) {
  const [blocks, setBlocks] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const savedRef = useRef(null);
  const dragSrcRef = useRef(null);

  useEffect(() => {
    const raw = Array.isArray(homePage?.home_blocks) ? homePage.home_blocks : [];
    const normalized = raw.map((b) => ({
      id: String(b?.id || genId()),
      type: String(b?.type || 'banner_grid'),
      config: b?.config && typeof b.config === 'object' ? b.config : {},
    }));
    setBlocks(normalized);
    savedRef.current = JSON.stringify(normalized);
    setIsDirty(false);
  }, [homePage?.home_blocks]);

  const markDirty = (nextBlocks) => {
    setBlocks(nextBlocks);
    setIsDirty(JSON.stringify(nextBlocks) !== savedRef.current);
  };

  const handleAddBlock = (typeKey) => {
    const typeMeta = BLOCK_TYPES.find((t) => t.key === typeKey);
    if (!typeMeta) return;
    const newBlock = { id: genId(), type: typeKey, config: typeMeta.defaultConfig() };
    const next = [...blocks, newBlock];
    markDirty(next);
    setExpandedId(newBlock.id);
  };

  const handleDeleteBlock = (id) => {
    markDirty(blocks.filter((b) => b.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const handleConfigChange = (id, config) => {
    markDirty(blocks.map((b) => (b.id === id ? { ...b, config } : b)));
  };

  const handleDragStart = (id) => { dragSrcRef.current = id; };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (targetId) => {
    const srcId = dragSrcRef.current;
    if (!srcId || srcId === targetId) return;
    const srcIdx = blocks.findIndex((b) => b.id === srcId);
    const tgtIdx = blocks.findIndex((b) => b.id === targetId);
    if (srcIdx < 0 || tgtIdx < 0) return;
    const next = [...blocks];
    const [moved] = next.splice(srcIdx, 1);
    next.splice(tgtIdx, 0, moved);
    markDirty(next);
    dragSrcRef.current = null;
  };

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/admin/home', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ home_blocks: blocks }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Save failed.');
      const saved = Array.isArray(data?.item?.home_blocks) ? data.item.home_blocks : blocks;
      savedRef.current = JSON.stringify(saved);
      setIsDirty(false);
    } catch (err) {
      setSaveError(err?.message || 'Save failed.');
    } finally {
      setIsSaving(false);
    }
  }, [blocks]);

  return (
    <div className="space-y-2">
      {/* Block list */}
      {blocks.length === 0 ? (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-14 text-slate-400 hover:border-slate-300 hover:text-slate-500 transition"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="text-xs font-medium">Add your first section</span>
        </button>
      ) : (
        <>
          <div className="space-y-1.5">
            {blocks.map((block) => (
              <BlockItem
                key={block.id}
                block={block}
                isExpanded={expandedId === block.id}
                onToggle={() => setExpandedId((prev) => (prev === block.id ? null : block.id))}
                onDelete={() => handleDeleteBlock(block.id)}
                onConfigChange={(config) => handleConfigChange(block.id, config)}
                onDragStart={() => handleDragStart(block.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(block.id)}
                categoryOptions={categoryOptions}
                tags={tags}
              />
            ))}
          </div>

          {/* Add section — always at the bottom */}
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 py-2.5 text-[11px] font-medium text-slate-400 hover:border-slate-300 hover:text-slate-600 transition"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add section
          </button>
        </>
      )}

      {/* Save error */}
      {saveError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{saveError}</div>
      )}

      {/* Unsaved changes bar */}
      {isDirty && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl bg-slate-900 shadow-2xl px-4 py-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
          <span className="text-xs font-medium text-white">Unsaved changes</span>
          <button type="button" onClick={handleSave} disabled={isSaving}
            className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-slate-900 disabled:opacity-50 hover:bg-slate-100 transition">
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}

      {showPicker && <BlockPicker onAdd={handleAddBlock} onClose={() => setShowPicker(false)} />}
    </div>
  );
}
