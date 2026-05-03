'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { prepareWebpUpload } from '../../image/utils/webpUtils.mjs';

const LAYOUTS = [
  { key: 'single',     label: 'Single',       slots: 1, icon: <LayoutIconSingle /> },
  { key: 'two-col',    label: '2 Column',     slots: 2, icon: <LayoutIconTwoCol /> },
  { key: 'hero-duo',   label: 'Hero + 2',     slots: 3, icon: <LayoutIconHeroDuo /> },
  { key: 'two-by-two', label: '2 × 2',        slots: 4, icon: <LayoutIconTwoByTwo /> },
  { key: 'three-col',  label: '3 Column',     slots: 3, icon: <LayoutIconThreeCol /> },
  { key: 'four-col',   label: '4 Column',     slots: 4, icon: <LayoutIconFourCol /> },
];

function LayoutIconSingle() {
  return (
    <svg viewBox="0 0 40 24" className="w-10 h-6">
      <rect x="1" y="1" width="38" height="22" rx="1" fill="currentColor" opacity=".25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function LayoutIconTwoCol() {
  return (
    <svg viewBox="0 0 40 24" className="w-10 h-6">
      <rect x="1" y="1" width="18" height="22" rx="1" fill="currentColor" opacity=".25" stroke="currentColor" strokeWidth="1.5" />
      <rect x="21" y="1" width="18" height="22" rx="1" fill="currentColor" opacity=".25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function LayoutIconHeroDuo() {
  return (
    <svg viewBox="0 0 40 24" className="w-10 h-6">
      <rect x="1" y="1" width="24" height="22" rx="1" fill="currentColor" opacity=".25" stroke="currentColor" strokeWidth="1.5" />
      <rect x="27" y="1" width="12" height="10" rx="1" fill="currentColor" opacity=".25" stroke="currentColor" strokeWidth="1.5" />
      <rect x="27" y="13" width="12" height="10" rx="1" fill="currentColor" opacity=".25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function LayoutIconTwoByTwo() {
  return (
    <svg viewBox="0 0 40 24" className="w-10 h-6">
      <rect x="1" y="1" width="18" height="10" rx="1" fill="currentColor" opacity=".25" stroke="currentColor" strokeWidth="1.5" />
      <rect x="21" y="1" width="18" height="10" rx="1" fill="currentColor" opacity=".25" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="13" width="18" height="10" rx="1" fill="currentColor" opacity=".25" stroke="currentColor" strokeWidth="1.5" />
      <rect x="21" y="13" width="18" height="10" rx="1" fill="currentColor" opacity=".25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function LayoutIconThreeCol() {
  return (
    <svg viewBox="0 0 40 24" className="w-10 h-6">
      <rect x="1" y="1" width="11" height="22" rx="1" fill="currentColor" opacity=".25" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14" y="1" width="12" height="22" rx="1" fill="currentColor" opacity=".25" stroke="currentColor" strokeWidth="1.5" />
      <rect x="28" y="1" width="11" height="22" rx="1" fill="currentColor" opacity=".25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function LayoutIconFourCol() {
  return (
    <svg viewBox="0 0 40 24" className="w-10 h-6">
      <rect x="1" y="1" width="8" height="22" rx="1" fill="currentColor" opacity=".25" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="1" width="8" height="22" rx="1" fill="currentColor" opacity=".25" stroke="currentColor" strokeWidth="1.5" />
      <rect x="21" y="1" width="8" height="22" rx="1" fill="currentColor" opacity=".25" stroke="currentColor" strokeWidth="1.5" />
      <rect x="31" y="1" width="8" height="22" rx="1" fill="currentColor" opacity=".25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

const emptySlide = () => ({ imageUrl: '', linkUrl: '' });

const isSafeUrl = (v) =>
  v === '' || v.startsWith('/') || v.startsWith('http://') || v.startsWith('https://');

export default function StoreFrontBannerGridSection({
  isLoading,
  brand,
  onSave,
}) {
  const [layout, setLayout] = useState('single');
  const [mode, setMode] = useState('static');
  const [slides, setSlides] = useState([emptySlide()]);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const fileInputRef = useRef(null);
  const activeSlotRef = useRef(null);

  const activeLayout = LAYOUTS.find((l) => l.key === layout) || LAYOUTS[0];

  // Sync from brand
  useEffect(() => {
    const grid = brand?.banner_grid;
    if (!grid) return;
    const nextLayout = LAYOUTS.find((l) => l.key === grid.layout) ? grid.layout : 'single';
    const nextMode = grid.mode === 'slider' ? 'slider' : 'static';
    const slotCount = LAYOUTS.find((l) => l.key === nextLayout)?.slots ?? 1;
    const nextSlides = Array.from({ length: slotCount }, (_, i) => ({
      imageUrl: String(grid.slides?.[i]?.imageUrl || ''),
      linkUrl: String(grid.slides?.[i]?.linkUrl || ''),
    }));
    setLayout(nextLayout);
    setMode(nextMode);
    setSlides(nextSlides);
  }, [brand?.banner_grid]);

  // When layout changes, resize slides array
  const handleLayoutChange = (nextLayout) => {
    setLayout(nextLayout);
    const slotCount = LAYOUTS.find((l) => l.key === nextLayout)?.slots ?? 1;
    setSlides((prev) =>
      Array.from({ length: slotCount }, (_, i) => prev[i] || emptySlide()),
    );
  };

  const updateSlide = (index, field, value) => {
    setSlides((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleUploadClick = (slotIndex) => {
    activeSlotRef.current = slotIndex;
    fileInputRef.current?.click();
  };

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!String(file.type).startsWith('image/')) return;
    const slotIndex = activeSlotRef.current;
    if (slotIndex === null) return;

    setUploadingSlot(slotIndex);
    try {
      const { webpFile } = await prepareWebpUpload(file, 10 * 1024 * 1024);
      const form = new FormData();
      form.set('file', webpFile);
      form.set('alt_text', `Banner grid image ${slotIndex + 1}`);
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Upload failed.');
      const url = String(data?.url || '').trim();
      if (!url) throw new Error('No URL returned.');
      updateSlide(slotIndex, 'imageUrl', url);
    } catch {
      // silently fail — user sees empty slot
    } finally {
      setUploadingSlot(null);
    }
  }, []);

  const handleSave = async () => {
    const cleanSlides = slides.map((s) => ({
      imageUrl: String(s.imageUrl || '').trim(),
      linkUrl: String(s.linkUrl || '').trim(),
    }));
    setIsSaving(true);
    try {
      await onSave({ banner_grid: { layout, mode, slides: cleanSlides } });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    try {
      await onSave({ banner_grid: null });
      setSlides(Array.from({ length: activeLayout.slots }, emptySlide));
    } finally {
      setIsSaving(false);
    }
  };

  const hasAnyImage = slides.some((s) => s.imageUrl);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Banner Grid</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Choose a layout, add images with links, then pick static or slider display.
          </p>
        </div>
        {hasAnyImage && (
          <button
            type="button"
            onClick={handleClear}
            disabled={isSaving || isLoading}
            className="text-xs font-medium text-red-500 hover:text-red-700 transition disabled:opacity-40"
          >
            Clear
          </button>
        )}
      </div>

      {/* Layout picker */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Layout</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {LAYOUTS.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => handleLayoutChange(l.key)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition ${
                layout === l.key
                  ? 'border-slate-900 bg-slate-50 text-slate-900'
                  : 'border-slate-200 text-slate-400 hover:border-slate-400'
              }`}
            >
              {l.icon}
              <span className="text-[10px] font-semibold uppercase tracking-wide leading-none">
                {l.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Mode toggle */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Display Mode</p>
        <div className="flex gap-2">
          {(['static', 'slider'] ).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-xl border-2 py-2.5 text-xs font-semibold uppercase tracking-wider transition ${
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
          <p className="mt-1.5 text-[11px] text-slate-400">
            All images cycle as a full-width carousel on the storefront.
          </p>
        )}
      </div>

      {/* Image slots */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Images ({activeLayout.slots} slot{activeLayout.slots !== 1 ? 's' : ''})
        </p>
        <div className="space-y-3">
          {Array.from({ length: activeLayout.slots }, (_, i) => {
            const slide = slides[i] || emptySlide();
            const isUploading = uploadingSlot === i;
            return (
              <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                {/* Image area */}
                <div className="relative">
                  {slide.imageUrl ? (
                    <div className="relative group">
                      <img
                        src={slide.imageUrl}
                        alt=""
                        className="w-full block max-h-48 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleUploadClick(i)}
                          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSlide(i, 'imageUrl', '')}
                          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUploadClick(i)}
                      disabled={isUploading}
                      className="w-full flex flex-col items-center justify-center gap-2 py-8 text-slate-400 hover:bg-slate-100 transition"
                    >
                      {isUploading ? (
                        <div className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
                      ) : (
                        <>
                          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                          </svg>
                          <span className="text-xs font-medium">
                            Click to upload image {i + 1}
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                {/* URL paste fallback */}
                {!slide.imageUrl && (
                  <div className="px-3 pb-2">
                    <input
                      type="url"
                      placeholder="Or paste image URL…"
                      value=""
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        if (isSafeUrl(v)) updateSlide(i, 'imageUrl', v);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-slate-400"
                    />
                  </div>
                )}
                {/* Link URL */}
                <div className="border-t border-slate-200 px-3 py-2">
                  <input
                    type="text"
                    placeholder="Link URL (e.g. /collections/sale or https://…)"
                    value={slide.linkUrl}
                    onChange={(e) => updateSlide(i, 'linkUrl', e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Save */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="rounded-full bg-slate-900 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-slate-700 disabled:opacity-40"
        >
          {isSaving ? 'Saving…' : 'Save Banner Grid'}
        </button>
      </div>
    </section>
  );
}
