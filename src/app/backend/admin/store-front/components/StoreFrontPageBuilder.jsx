'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import MediaLibraryModal from './MediaLibraryModal';
import { VENDOR_TEMPLATES } from '@/lib/vendor/templateConfig.mjs';

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
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

const genId = () =>
  `block_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

const emptySlide = () => ({ imageUrl: '', linkUrl: '' });

const isSafeUrl = (v) =>
  v === '' ||
  v.startsWith('/') ||
  v.startsWith('http://') ||
  v.startsWith('https://');

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

// ─── Single block item ─────────────────────────────────────────────────────

function BlockItem({ block, isExpanded, onToggle, onDelete, onConfigChange, onDragStart, onDragOver, onDrop }) {
  const typeMeta = BLOCK_TYPES.find((t) => t.key === block.type);
  const layoutLabel = block.type === 'banner_grid'
    ? LAYOUTS.find((l) => l.key === block.config?.layout)?.label || 'Single'
    : '';
  const modeLabel = block.config?.mode === 'slider' ? 'Slider' : 'Static';
  const templateName = resolveTemplateName(block.template);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition hover:border-slate-300"
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Drag handle */}
        <svg
          className="h-4 w-4 text-slate-300 shrink-0 cursor-grab active:cursor-grabbing"
          fill="currentColor"
          viewBox="0 0 16 16"
        >
          <circle cx="5" cy="4" r="1.2" /><circle cx="11" cy="4" r="1.2" />
          <circle cx="5" cy="8" r="1.2" /><circle cx="11" cy="8" r="1.2" />
          <circle cx="5" cy="12" r="1.2" /><circle cx="11" cy="12" r="1.2" />
        </svg>

        {/* Type icon */}
        <span className="text-slate-400 shrink-0">{typeMeta?.icon}</span>

        {/* Labels */}
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 text-left min-w-0"
        >
          <p className="text-sm font-semibold text-slate-800 leading-none">
            {typeMeta?.label || block.type}
          </p>
          {layoutLabel && (
            <p className="text-[11px] text-slate-400 mt-0.5">
              {layoutLabel} · {modeLabel}
            </p>
          )}
        </button>

        {/* Template source label */}
        {templateName && (
          <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-500 ring-1 ring-violet-200">
            {templateName}
          </span>
        )}

        {/* Expand toggle */}
        <button
          type="button"
          onClick={onToggle}
          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition shrink-0"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition shrink-0"
          aria-label="Remove block"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Editor (expanded) */}
      {isExpanded && (
        <div className="border-t border-slate-100 px-4 pb-4">
          {block.type === 'banner_grid' && (
            <BannerGridEditor
              config={block.config}
              onChange={(nextConfig) => onConfigChange(block.id, nextConfig)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Block picker modal ────────────────────────────────────────────────────

function BlockPicker({ onAdd, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900">Add Component</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 transition">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-2">
          {BLOCK_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => { onAdd(t.key); onClose(); }}
              className="w-full flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-slate-400 hover:bg-white"
            >
              <span className="text-slate-500 shrink-0">{t.icon}</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{t.label}</p>
                <p className="text-[11px] text-slate-400">{t.description}</p>
              </div>
            </button>
          ))}
          {/* Coming soon placeholder */}
          <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 px-4 py-3 opacity-50">
            <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-slate-500">More coming soon</p>
              <p className="text-[11px] text-slate-400">Text blocks, video, announcements…</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main builder ──────────────────────────────────────────────────────────

export default function StoreFrontPageBuilder({ isLoading, brand, onSave }) {
  const [blocks, setBlocks] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const savedRef = useRef([]);
  const dragSrcRef = useRef(null);

  useEffect(() => {
    const raw = Array.isArray(brand?.storefront_blocks) ? brand.storefront_blocks : [];
    setBlocks(raw);
    savedRef.current = raw;
    setIsDirty(false);
  }, [brand?.storefront_blocks]);

  const markDirty = () => setIsDirty(true);

  const addBlock = (type) => {
    const typeMeta = BLOCK_TYPES.find((t) => t.key === type);
    if (!typeMeta) return;
    const newBlock = { id: genId(), type, config: typeMeta.defaultConfig() };
    setBlocks((prev) => [...prev, newBlock]);
    setExpandedId(newBlock.id);
    markDirty();
  };

  const removeBlock = (id) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (expandedId === id) setExpandedId(null);
    markDirty();
  };

  const updateConfig = (id, config) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, config } : b)));
    markDirty();
  };

  const toggleExpand = (id) =>
    setExpandedId((prev) => (prev === id ? null : id));

  // Drag handlers
  const handleDragStart = (e, id) => {
    dragSrcRef.current = id;
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    const srcId = dragSrcRef.current;
    if (!srcId || srcId === targetId) return;
    setBlocks((prev) => {
      const next = [...prev];
      const si = next.findIndex((b) => b.id === srcId);
      const ti = next.findIndex((b) => b.id === targetId);
      if (si === -1 || ti === -1) return prev;
      const [item] = next.splice(si, 1);
      next.splice(ti, 0, item);
      return next;
    });
    dragSrcRef.current = null;
    markDirty();
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

  // Split blocks into template-seeded vs manually added
  const templateBlocks = blocks.filter((b) => Boolean(b.template));
  const customBlocks = blocks.filter((b) => !b.template);

  const renderBlockItem = (block) => (
    <BlockItem
      key={block.id}
      block={block}
      isExpanded={expandedId === block.id}
      onToggle={() => toggleExpand(block.id)}
      onDelete={() => removeBlock(block.id)}
      onConfigChange={updateConfig}
      onDragStart={(e) => handleDragStart(e, block.id)}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, block.id)}
    />
  );

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Storefront Layout</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Build the top of your store page. Grab any block and drag it to rearrange.
          </p>
        </div>

        {/* ── Template blocks ─────────────────────────────────────────── */}
        {templateBlocks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
                {resolveTemplateName(templateBlocks[0].template)} Template
              </span>
              <div className="h-px flex-1 bg-violet-100" />
              <span className="text-[10px] text-slate-400">Built-in layout</span>
            </div>
            <div className="space-y-2">
              {templateBlocks.map(renderBlockItem)}
            </div>
          </div>
        )}

        {/* ── Custom blocks ────────────────────────────────────────────── */}
        <div className="space-y-2">
          {(templateBlocks.length > 0 || customBlocks.length > 0) && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Your Blocks
              </span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>
          )}

          {customBlocks.length > 0 ? (
            <div className="space-y-2">
              {customBlocks.map(renderBlockItem)}
            </div>
          ) : (
            blocks.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 py-10 text-center">
                <svg className="mx-auto h-8 w-8 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <p className="mt-2 text-sm font-medium text-slate-400">No components yet</p>
                <p className="text-xs text-slate-400">Click + Add Component below to get started.</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No custom blocks added yet.</p>
            )
          )}
        </div>

        {/* Add component button */}
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 text-xs font-bold uppercase tracking-widest text-slate-500 transition hover:border-slate-500 hover:text-slate-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Component
        </button>

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

      {showPicker && (
        <BlockPicker onAdd={addBlock} onClose={() => setShowPicker(false)} />
      )}
    </>
  );
}
