'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import MediaLibraryModal from './MediaLibraryModal';
import { VENDOR_TEMPLATES } from '@/lib/vendor/templateConfig.mjs';
import BlockListBuilder from '@/components/admin/page-builder/BlockListBuilder';
import {
  HeroSliderEditor,
  FeaturedStripEditor,
  ProductCatalogEditor,
  BrowseCardsEditor,
  LogoGridEditor,
  CustomHtmlEditor,
} from '../../pages/home/components/HomePageBuilder.jsx';

const resolveTemplateName = (templateId) => {
  if (!templateId) return null;
  return VENDOR_TEMPLATES.find((t) => t.id === templateId)?.name ?? templateId;
};

// ─── Layout definitions ────────────────────────────────────────────────────

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
    single: (
      <svg viewBox="0 0 40 24" className="w-8 h-5">
        <rect x="1" y="1" width="38" height="22" rx="1.5" className={base} />
      </svg>
    ),
    'two-col': (
      <svg viewBox="0 0 40 24" className="w-8 h-5">
        <rect x="1" y="1" width="18" height="22" rx="1.5" className={base} />
        <rect x="21" y="1" width="18" height="22" rx="1.5" className={base} />
      </svg>
    ),
    'hero-duo': (
      <svg viewBox="0 0 40 24" className="w-8 h-5">
        <rect x="1" y="1" width="24" height="22" rx="1.5" className={base} />
        <rect x="27" y="1" width="12" height="10" rx="1.5" className={base} />
        <rect x="27" y="13" width="12" height="10" rx="1.5" className={base} />
      </svg>
    ),
    'two-by-two': (
      <svg viewBox="0 0 40 24" className="w-8 h-5">
        <rect x="1" y="1" width="18" height="10" rx="1.5" className={base} />
        <rect x="21" y="1" width="18" height="10" rx="1.5" className={base} />
        <rect x="1" y="13" width="18" height="10" rx="1.5" className={base} />
        <rect x="21" y="13" width="18" height="10" rx="1.5" className={base} />
      </svg>
    ),
    'three-col': (
      <svg viewBox="0 0 40 24" className="w-8 h-5">
        <rect x="1" y="1" width="11" height="22" rx="1.5" className={base} />
        <rect x="14" y="1" width="12" height="22" rx="1.5" className={base} />
        <rect x="28" y="1" width="11" height="22" rx="1.5" className={base} />
      </svg>
    ),
    'four-col': (
      <svg viewBox="0 0 40 24" className="w-8 h-5">
        <rect x="1" y="1" width="8" height="22" rx="1.5" className={base} />
        <rect x="11" y="1" width="8" height="22" rx="1.5" className={base} />
        <rect x="21" y="1" width="8" height="22" rx="1.5" className={base} />
        <rect x="31" y="1" width="8" height="22" rx="1.5" className={base} />
      </svg>
    ),
  };
  return previews[layoutKey] || null;
}

// ─── Block type registry ───────────────────────────────────────────────────

const BLOCK_TYPES = [
  {
    key: 'banner_grid',
    label: 'Banner Grid',
    description: 'Image grid or slider with clickable links.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="3" width="8" height="8" rx="1" />
        <rect x="13" y="3" width="8" height="8" rx="1" />
        <rect x="3" y="13" width="8" height="8" rx="1" />
        <rect x="13" y="13" width="8" height="8" rx="1" />
      </svg>
    ),
    defaultConfig: () => ({
      layout: 'single',
      mode: 'static',
      slides: [{ imageUrl: '', linkUrl: '' }],
    }),
    subtitle: (cfg) => {
      const layoutLabel = LAYOUTS.find((l) => l.key === cfg?.layout)?.label || 'Single';
      const modeLabel = cfg?.mode === 'slider' ? 'Slider' : 'Static';
      return `${layoutLabel} · ${modeLabel}`;
    },
  },
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
    subtitle: (cfg) => {
      const count = (Array.isArray(cfg?.slides) ? cfg.slides : []).filter((s) => s.desktopUrl).length;
      return `${count} slide${count !== 1 ? 's' : ''}`;
    },
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
    subtitle: (cfg) => {
      const count = Array.isArray(cfg?.cards) ? cfg.cards.length : 0;
      return `${count} card${count !== 1 ? 's' : ''}`;
    },
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
    subtitle: (cfg) => cfg?.titleMain || 'No title',
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
    subtitle: (cfg) => {
      const count = Array.isArray(cfg?.items) ? cfg.items.length : 0;
      return `${count} logo${count !== 1 ? 's' : ''}${cfg?.title ? ` · ${cfg.title}` : ''}`;
    },
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
    subtitle: (cfg) => cfg?.title || 'No title',
  },
  {
    key: 'custom_html',
    label: 'Custom HTML',
    description: 'Paste your own HTML (inline styles only) and optional JS for a fully custom section.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 8.25-3 3.75 3 3.75m4.5-7.5 3 3.75-3 3.75M13.5 4.5l-3 15" />
      </svg>
    ),
    defaultConfig: () => ({ html: '', js: '', mobile: { enabled: false, html: '', js: '' } }),
    subtitle: (cfg) => {
      const len = String(cfg?.html || '').length;
      const hasJs = String(cfg?.js || '').trim().length > 0;
      const hasMobile = Boolean(cfg?.mobile?.enabled);
      if (!len) return 'Empty';
      return `${len.toLocaleString()} characters${hasJs ? ' · with JS' : ''}${hasMobile ? ' · mobile variant' : ''}`;
    },
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

const emptySlide = () => ({ imageUrl: '', linkUrl: '' });

const isSafeUrl = (v) =>
  v === '' ||
  v.startsWith('/') ||
  v.startsWith('http://') ||
  v.startsWith('https://');

// custom_html blocks are stored with a FLAT config shape on the storefront
// (mobileEnabled/mobileHtml/mobileJs, matching CustomSectionRunner's own prop
// contract and this feature's existing zod schema), while the reused
// CustomHtmlEditor component reads/writes a NESTED shape
// (mobile: {enabled, html, js}). These adapters translate at the editor
// boundary only — storage stays flat end-to-end.
const toNestedCustomHtmlConfig = (cfg = {}) => ({
  html: cfg.html || '',
  js: cfg.js || '',
  mobile: {
    enabled: Boolean(cfg.mobileEnabled),
    html: cfg.mobileHtml || '',
    js: cfg.mobileJs || '',
  },
});

const toFlatCustomHtmlConfig = (cfg = {}) => ({
  html: cfg.html || '',
  js: cfg.js || '',
  mobileEnabled: Boolean(cfg.mobile?.enabled),
  mobileHtml: cfg.mobile?.html || '',
  mobileJs: cfg.mobile?.js || '',
});

// ─── Banner Grid block editor ──────────────────────────────────────────────

function BannerGridEditor({ config, onChange }) {
  const layout = config?.layout || 'single';
  const mode = config?.mode || 'static';
  const slotCount = LAYOUTS.find((l) => l.key === layout)?.slots ?? 1;
  const slides = Array.from({ length: slotCount }, (_, i) =>
    config?.slides?.[i] || emptySlide(),
  );

  const [mediaPickerSlot, setMediaPickerSlot] = useState(null);

  const update = (patch) => onChange({ ...config, ...patch });

  const handleLayoutChange = (nextLayout) => {
    const nextSlots = LAYOUTS.find((l) => l.key === nextLayout)?.slots ?? 1;
    const nextSlides = Array.from({ length: nextSlots }, (_, i) =>
      config?.slides?.[i] || emptySlide(),
    );
    onChange({ ...config, layout: nextLayout, slides: nextSlides });
  };

  const updateSlide = useCallback((index, field, value) => {
    const nextSlides = slides.map((s, i) =>
      i === index ? { ...s, [field]: value } : s,
    );
    onChange({ ...config, ...{ slides: nextSlides } });
  }, [slides, config, onChange]);

  const handleMediaSelect = useCallback((url) => {
    if (mediaPickerSlot !== null) updateSlide(mediaPickerSlot, 'imageUrl', url);
  }, [mediaPickerSlot, updateSlide]);

  return (
    <div className="space-y-5 pt-1">
      {/* Layout */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Layout</p>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {LAYOUTS.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => handleLayoutChange(l.key)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-2.5 transition ${
                layout === l.key
                  ? 'border-slate-900 bg-slate-900'
                  : 'border-slate-200 hover:border-slate-400 bg-white'
              }`}
            >
              <LayoutPreview layoutKey={l.key} active={layout === l.key} />
              <span className={`text-[9px] font-bold uppercase tracking-wide leading-none ${layout === l.key ? 'text-white' : 'text-slate-400'}`}>
                {l.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Mode */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Display</p>
        <div className="flex gap-2">
          {['static', 'slider'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => update({ mode: m })}
              className={`flex-1 rounded-xl border-2 py-2 text-xs font-bold uppercase tracking-wider transition ${
                mode === m
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 text-slate-500 hover:border-slate-400'
              }`}
            >
              {m === 'static' ? 'Static Grid' : 'Slider'}
            </button>
          ))}
        </div>
        {mode === 'slider' && (
          <p className="mt-1 text-[11px] text-slate-400">Images cycle as a full-width carousel.</p>
        )}
      </div>

      {/* Image slots */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Images — {slotCount} slot{slotCount !== 1 ? 's' : ''}
        </p>
        {slides.map((slide, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {slide.imageUrl ? (
                <div className="relative group">
                  <img src={slide.imageUrl} alt="" className="w-full block max-h-40 object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMediaPickerSlot(i)}
                      className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-slate-900"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSlide(i, 'imageUrl', '')}
                      className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={() => setMediaPickerSlot(i)}
                    className="w-full flex flex-col items-center gap-1.5 py-6 text-slate-400 hover:bg-slate-100 transition"
                  >
                    <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                    <span className="text-xs font-medium">Choose image {i + 1}</span>
                  </button>
                  <div className="px-3 pb-2">
                    <input
                      type="url"
                      placeholder="Or paste image URL…"
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && isSafeUrl(v)) {
                          updateSlide(i, 'imageUrl', v);
                          e.target.value = '';
                        }
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
              )}
              <div className="border-t border-slate-200 px-3 py-2">
                <input
                  type="text"
                  placeholder="Link URL (e.g. /category/sale)"
                  value={slide.linkUrl}
                  onChange={(e) => updateSlide(i, 'linkUrl', e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
        ))}
      </div>

      <MediaLibraryModal
        isOpen={mediaPickerSlot !== null}
        onClose={() => setMediaPickerSlot(null)}
        onSelect={handleMediaSelect}
      />
    </div>
  );
}

// ─── Main builder ──────────────────────────────────────────────────────────

export default function StoreFrontPageBuilder({ isLoading, brand, onSave, categoryOptions = [], tags = [] }) {
  const [blocks, setBlocks] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const savedRef = useRef([]);

  useEffect(() => {
    const raw = Array.isArray(brand?.storefront_blocks) ? brand.storefront_blocks : [];
    setBlocks(raw);
    savedRef.current = raw;
    setIsDirty(false);
  }, [brand?.storefront_blocks]);

  const markDirty = (nextBlocks) => {
    setBlocks(nextBlocks);
    setIsDirty(true);
  };

  const renderEditor = (block, { onConfigChange }) => {
    switch (block.type) {
      case 'banner_grid':
        return <BannerGridEditor config={block.config} onChange={onConfigChange} />;
      case 'hero_slider':
        return <HeroSliderEditor config={block.config} onChange={onConfigChange} />;
      case 'featured_strip':
        return <FeaturedStripEditor config={block.config} onChange={onConfigChange} categoryOptions={categoryOptions} tags={tags} />;
      case 'product_catalog':
        return <ProductCatalogEditor config={block.config} onChange={onConfigChange} categoryOptions={categoryOptions} tags={tags} />;
      case 'browse_cards':
        return <BrowseCardsEditor config={block.config} onChange={onConfigChange} />;
      case 'logo_grid':
        return <LogoGridEditor config={block.config} onChange={onConfigChange} />;
      case 'custom_html':
        return (
          <CustomHtmlEditor
            config={toNestedCustomHtmlConfig(block.config)}
            onChange={(nextNested) => onConfigChange(toFlatCustomHtmlConfig(nextNested))}
          />
        );
      default:
        return null;
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ storefront_blocks: blocks });
      savedRef.current = blocks;
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Storefront Layout</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Build the top of your store page. Grab any block and drag it to rearrange.
          </p>
        </div>

        <BlockListBuilder
          blocks={blocks}
          onBlocksChange={markDirty}
          blockTypes={BLOCK_TYPES}
          renderEditor={renderEditor}
          expandedId={expandedId}
          onExpandedIdChange={setExpandedId}
          pickerTitle="Add Component"
          groupBy={(b) => (b.template ? b.template : null)}
          renderGroupHeader={(groupKey, groupBlocks) => (
            groupKey ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
                  {resolveTemplateName(groupKey)} Template
                </span>
                <div className="h-px flex-1 bg-violet-100" />
                <span className="text-[10px] text-slate-400">Built-in layout</span>
              </div>
            ) : blocks.some((b) => b.template) ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Your Blocks
                </span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
            ) : null
          )}
          renderEmptyGroup={
            blocks.length > 0 && !blocks.some((b) => !b.template) ? (
              <p className="text-xs text-slate-400 italic">No custom blocks added yet.</p>
            ) : null
          }
          emptyState={
            <div className="rounded-2xl border-2 border-dashed border-slate-200 py-10 text-center">
              <svg className="mx-auto h-8 w-8 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <p className="mt-2 text-sm font-medium text-slate-400">No components yet</p>
              <p className="text-xs text-slate-400">Click + Add Component below to get started.</p>
            </div>
          }
          renderAddTrigger={(openPicker) => (
            <button
              type="button"
              onClick={openPicker}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 text-xs font-bold uppercase tracking-widest text-slate-500 transition hover:border-slate-500 hover:text-slate-700 mt-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Component
            </button>
          )}
        />

        {/* Save bar */}
        {isDirty && (
          <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3">
            <p className="text-xs font-medium text-slate-300">You have unsaved changes.</p>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-full bg-white px-5 py-1.5 text-xs font-bold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save Layout'}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
