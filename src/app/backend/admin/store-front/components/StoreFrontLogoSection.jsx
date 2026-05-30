'use client';

import { useEffect, useState, useRef } from 'react';
import { VENDOR_LOGO_FONTS } from '@/components/vendor/VendorHeaderShared';

const FONT_KEYS = Object.keys(VENDOR_LOGO_FONTS);

function loadGoogleFont(fontKey) {
  const font = VENDOR_LOGO_FONTS[fontKey];
  if (!font || typeof document === 'undefined') return;
  const id = `gfont-${fontKey}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id; link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
  document.head.appendChild(link);
}

function usePreloadFonts() {
  useEffect(() => { FONT_KEYS.forEach(loadGoogleFont); }, []);
}

function Accordion({ title, hint, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
        </div>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="border-t border-slate-100 px-5 pb-5 pt-4">{children}</div>}
    </div>
  );
}

export default function StoreFrontLogoSection({
  isLoading, brand, brandName,
  logoUrl, logoFailed, onLogoError, initials, isLogoUploading, onOpenMediaLibrary, onRemoveLogo,
  logoFullUrl, logoFullFailed, onLogoFullError, isLogoFullUploading, onOpenLogoFullMediaLibrary, onRemoveLogoFull,
  logoFont, isFontSaving, onFontSelect,
}) {
  usePreloadFonts();
  const [hovered, setHovered] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  const DEFAULT_FONT = 'playfair';
  const activeKey = logoFont || DEFAULT_FONT;
  const previewKey = hovered || activeKey;
  const previewFont = VENDOR_LOGO_FONTS[previewKey];

  useEffect(() => {
    if (!pickerOpen) return;
    const close = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [pickerOpen]);
  const noLogo = !brand;

  if (isLoading) return (
    <section className="border-t border-slate-200 pt-6 space-y-5">
      {[160, 130, 200].map((w) => (
        <div key={w} className="h-10 animate-pulse rounded-xl bg-slate-100" style={{ width: w }} />
      ))}
    </section>
  );

  return (
    <section className="border-t border-slate-200 pt-6 space-y-2">

      {/* ── Store Icon ─────────────────────────────────────── */}
      <Accordion title="Store Icon" hint="Shows next to your store name across the platform.">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0">
            {logoUrl && !logoFailed ? (
              <img src={logoUrl} alt="" className="h-full w-full rounded-xl object-cover border border-slate-200" onError={onLogoError} />
            ) : (
              <span className="flex h-full w-full items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-lg font-bold text-slate-500">{initials}</span>
            )}
            {isLogoUploading && (
              <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onOpenMediaLibrary} disabled={isLogoUploading || noLogo}
                className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">
                {isLogoUploading ? 'Saving…' : 'Upload'}
              </button>
              {logoUrl && (
                <button type="button" onClick={onRemoveLogo} disabled={isLogoUploading || noLogo}
                  className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-rose-400 hover:text-rose-600 transition disabled:opacity-50">
                  Remove
                </button>
              )}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Best at 512×512 px · Max 5 MB</p>
          </div>
        </div>
      </Accordion>

      {/* ── Header Logo ────────────────────────────────────── */}
      <Accordion title="Header Logo" hint="Appears at the top of your store. Skip this and we'll use your store name + font instead.">
        <div className="flex flex-col items-center gap-4">
          {/* Preview — natural size, no box */}
          <div className="relative flex min-h-10 w-full items-center justify-center py-2">
            {logoFullUrl && !logoFullFailed ? (
              <img src={logoFullUrl} alt="" className="max-h-14 w-auto max-w-full object-contain" onError={onLogoFullError} />
            ) : (
              <span className="text-sm font-bold uppercase tracking-widest text-slate-300">{brandName}</span>
            )}
            {isLogoFullUploading && (
              <span className="absolute inset-0 flex items-center justify-center bg-white/70">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
              </span>
            )}
          </div>
          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button type="button" onClick={onOpenLogoFullMediaLibrary} disabled={isLogoFullUploading || noLogo}
              className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">
              {isLogoFullUploading ? 'Saving…' : 'Upload'}
            </button>
            {logoFullUrl && (
              <button type="button" onClick={onRemoveLogoFull} disabled={isLogoFullUploading || noLogo}
                className="rounded-full px-4 py-1.5 text-xs font-semibold text-rose-400 hover:text-rose-600 transition disabled:opacity-50">
                Remove
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400">Transparent PNG · Max 5 MB</p>
        </div>
      </Accordion>

      {/* ── Store Name Font ────────────────────────────────── */}
      <Accordion
        title="Store Name Font"
        hint={`How your store name looks when there's no logo.${isFontSaving ? ' Saving…' : ''}`}
      >
        <div ref={pickerRef}>
          {/* Current selection trigger */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex-1 overflow-hidden">
              <span
                className={`block truncate text-xl leading-none ${previewFont?.cls ?? ''} text-slate-900`}
                style={{ fontFamily: previewFont?.family }}
              >
                {brandName}
              </span>
              <span className="mt-1 block text-[11px] text-slate-400">
                {logoFont ? VENDOR_LOGO_FONTS[logoFont]?.label : `${VENDOR_LOGO_FONTS[DEFAULT_FONT]?.label} (default)`}
              </span>
            </div>
            <button type="button" onClick={() => setPickerOpen((o) => !o)} disabled={noLogo}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50">
              {pickerOpen ? 'Close' : logoFont ? 'Change' : 'Pick a font'}
            </button>
          </div>

          {/* Font grid */}
          {pickerOpen && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex h-14 items-center justify-center overflow-hidden rounded-lg bg-slate-900 px-6">
                <span className={`truncate text-2xl leading-none ${previewFont?.cls ?? ''} text-white`} style={{ fontFamily: previewFont?.family }}>
                  {brandName}
                </span>
              </div>
              <p className="mb-3 text-center text-[11px] text-slate-400">
                {hovered ? `${VENDOR_LOGO_FONTS[hovered]?.label} — click to select` : 'Hover to preview'}
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {FONT_KEYS.map((key) => {
                  const font = VENDOR_LOGO_FONTS[key];
                  const selected = logoFont === key;
                  return (
                    <button key={key} type="button"
                      onClick={() => { onFontSelect(selected ? '' : key); setPickerOpen(false); setHovered(null); }}
                      onMouseEnter={() => setHovered(key)}
                      onMouseLeave={() => setHovered(null)}
                      disabled={isFontSaving}
                      className={`relative flex flex-col items-center justify-center gap-1 rounded-xl border px-3 py-3 text-center transition-all disabled:opacity-50 ${
                        selected ? 'border-slate-900 bg-slate-900' : 'border-slate-200 bg-white hover:border-slate-400'
                      }`}
                    >
                      <span className={`block w-full truncate text-sm leading-snug ${font.cls} ${selected ? 'text-white' : 'text-slate-800'}`} style={{ fontFamily: font.family }}>
                        {brandName}
                      </span>
                      <span className={`text-[10px] ${selected ? 'text-white/50' : 'text-slate-400'}`}>{font.label}</span>
                      {selected && (
                        <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-white/20">
                          <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 10" stroke="currentColor" strokeWidth="2">
                            <path d="M1 5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                    )}
                  </button>
                );
              })}
            </div>

              {logoFont && (
                <button type="button" onClick={() => { onFontSelect(''); setPickerOpen(false); }} disabled={isFontSaving}
                  className="mt-3 text-xs text-slate-400 hover:text-slate-600 transition disabled:opacity-50">
                  Reset to default
                </button>
              )}
            </div>
          )}
        </div>
      </Accordion>

    </section>
  );
}
