'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { VENDOR_TEMPLATES } from '@/lib/vendor/templateConfig.mjs';

/* ─────────────────────────────────────────────
   Mini browser mockup previews
   Each template has a unique preview that looks
   like a shrunken screenshot of the storefront.
───────────────────────────────────────────── */

function DefaultPreview() {
  return (
    <div className="pointer-events-none select-none overflow-hidden rounded-lg border border-slate-200 bg-white">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <div className="h-2 w-2 rounded-full bg-red-300" />
        <div className="h-2 w-2 rounded-full bg-yellow-300" />
        <div className="h-2 w-2 rounded-full bg-green-300" />
        <div className="ml-2 flex h-4 max-w-[110px] flex-1 items-center rounded-md border border-slate-200 bg-white px-2">
          <span className="text-[6px] text-slate-400">mystore.alxora.ng</span>
        </div>
      </div>
      {/* Vendor header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-2">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full bg-slate-200" />
          <div className="h-2 w-14 rounded bg-slate-800" />
        </div>
        <div className="flex gap-2">
          <div className="h-5 w-14 rounded-full border border-slate-200 bg-white" />
          <div className="h-5 w-14 rounded-full border border-slate-200 bg-white" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-sm bg-slate-100" />
          <div className="h-5 w-14 rounded-full border border-slate-800" />
        </div>
      </div>
      {/* Banner grid (2-col) */}
      <div className="grid grid-cols-3 gap-1 bg-white px-3 py-2">
        <div className="col-span-2 rounded bg-slate-200" style={{ height: 40 }} />
        <div className="rounded bg-slate-100" style={{ height: 40 }} />
      </div>
      {/* Content: sidebar + product grid */}
      <div className="flex gap-2 px-3 pb-3">
        {/* Sidebar */}
        <div className="w-14 shrink-0 space-y-1.5 pt-1">
          <div className="h-2 w-10 rounded bg-slate-300" />
          <div className="h-1.5 w-9 rounded bg-slate-200" />
          <div className="h-1.5 w-8 rounded bg-slate-200" />
          <div className="mt-2 h-2 w-10 rounded bg-slate-300" />
          <div className="h-4 w-12 rounded bg-slate-100" />
        </div>
        {/* Masonry grid */}
        <div className="grid flex-1 grid-cols-3 gap-1">
          <div className="rounded bg-slate-200" style={{ height: 36 }} />
          <div className="rounded bg-slate-100" style={{ height: 52 }} />
          <div className="rounded bg-slate-200" style={{ height: 40 }} />
          <div className="rounded bg-slate-100" style={{ height: 44 }} />
          <div className="rounded bg-slate-200" style={{ height: 32 }} />
          <div className="rounded bg-slate-100" style={{ height: 48 }} />
        </div>
      </div>
    </div>
  );
}

function PrestigePreview() {
  return (
    <div className="pointer-events-none select-none overflow-hidden rounded-lg border border-slate-200 bg-[#f5f4f2]">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 border-b border-slate-300 bg-[#111] px-3 py-2">
        <div className="h-2 w-2 rounded-full bg-red-400/60" />
        <div className="h-2 w-2 rounded-full bg-yellow-400/60" />
        <div className="h-2 w-2 rounded-full bg-green-400/60" />
        <div className="ml-2 flex h-4 max-w-[110px] flex-1 items-center rounded-md bg-white/10 px-2">
          <span className="text-[6px] text-white/50">mystore.alxora.ng</span>
        </div>
      </div>
      {/* Dark vendor header */}
      <div className="relative flex items-center justify-between bg-[#0a0a0a] px-4 py-2.5">
        <div className="h-2 w-10 rounded bg-white/20" />
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          <div className="h-4 w-4 rounded-full bg-white/20" />
          <div className="h-2 w-14 rounded bg-white/60" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded-sm bg-white/10" />
          <div className="h-4 w-12 rounded-full border border-white/30" />
        </div>
      </div>
      {/* Full-width hero image */}
      <div className="relative w-full bg-gradient-to-br from-slate-600 to-slate-400" style={{ height: 52 }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-2 w-20 rounded bg-white/30" />
        </div>
      </div>
      {/* 4-column portrait product grid */}
      <div className="grid grid-cols-4 gap-px bg-[#f5f4f2] px-2 pt-2 pb-3">
        {[70, 90, 75, 85].map((h, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-sm bg-slate-300"
            style={{ aspectRatio: '2/3' }}
          >
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
          </div>
        ))}
      </div>
    </div>
  );
}

function BiadPreview() {
  return (
    <div className="pointer-events-none select-none overflow-hidden rounded-lg border border-slate-700 bg-[#0a0a0a]">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-[#0a0a0a] px-3 py-2">
        <div className="h-2 w-2 rounded-full bg-red-400/60" />
        <div className="h-2 w-2 rounded-full bg-yellow-400/60" />
        <div className="h-2 w-2 rounded-full bg-green-400/60" />
        <div className="ml-2 flex h-4 max-w-[110px] flex-1 items-center rounded-md bg-white/10 px-2">
          <span className="text-[6px] text-white/40">mystore.alxora.ng</span>
        </div>
      </div>
      {/* White header with centered name */}
      <div className="relative flex items-center justify-between border-b border-white/10 bg-white px-4 py-2">
        <div className="h-2 w-8 rounded bg-slate-300" />
        <div className="absolute left-1/2 -translate-x-1/2 h-2.5 w-16 rounded bg-slate-900" />
        <div className="h-5 w-12 rounded-full bg-slate-900" />
      </div>
      {/* Marquee strip */}
      <div className="flex items-center gap-4 overflow-hidden bg-slate-900 px-3 py-1">
        {[1,2,3,4].map((i) => (
          <div key={i} className="h-1.5 w-10 shrink-0 rounded bg-white/20" />
        ))}
      </div>
      {/* Giant heading */}
      <div className="px-3 pt-3 pb-1">
        <div className="h-6 w-36 rounded bg-white/90" />
        <div className="mt-1 h-1.5 w-16 rounded bg-white/20" />
      </div>
      {/* Category tabs */}
      <div className="flex items-center gap-3 border-b border-white/10 px-3 pb-2 pt-1">
        {['All','Tops','Hoodies','Bottoms'].map((tab, i) => (
          <div
            key={tab}
            className={`h-1.5 rounded ${i === 0 ? 'w-5 bg-white' : 'w-8 bg-white/25'}`}
          />
        ))}
      </div>
      {/* 4-column product grid */}
      <div className="grid grid-cols-4 gap-1 px-2 pt-2 pb-3">
        {[80, 95, 75, 88].map((h, i) => (
          <div key={i} className="overflow-hidden rounded-sm bg-slate-700" style={{ aspectRatio: '3/4' }}>
            <div className="h-full w-full bg-gradient-to-b from-slate-600 to-slate-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

const PREVIEWS = {
  default: <DefaultPreview />,
  prestige: <PrestigePreview />,
  biad: <BiadPreview />,
};

/* ─────────────────────────────────────────────
   Template card
───────────────────────────────────────────── */

function TemplateCard({ template, isActive, isSaving, onSelect }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white transition ${
        isActive
          ? 'border-slate-900 shadow-md ring-1 ring-slate-900/10'
          : 'border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
      }`}
    >
      {/* Active badge */}
      {isActive && (
        <div className="flex items-center gap-1.5 border-b border-slate-100 bg-emerald-50 px-4 py-2">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Active template</span>
        </div>
      )}

      {/* Preview */}
      <div className="border-b border-slate-100 bg-slate-50 p-3">
        {PREVIEWS[template.id] || <div className="h-40 rounded-lg bg-slate-100" />}
      </div>

      {/* Info */}
      <div className="p-5">
        <h3 className="text-base font-semibold text-slate-900">{template.name}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{template.description}</p>

        {/* Feature chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {template.features.map((f) => (
            <span
              key={f}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600"
            >
              {f}
            </span>
          ))}
        </div>

        {/* Action */}
        <div className="mt-5">
          {isActive ? (
            <a
              href="/backend/admin/store-front"
              className="block w-full rounded-xl bg-slate-900 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Customize
            </a>
          ) : (
            <button
              type="button"
              onClick={() => onSelect(template.id)}
              disabled={isSaving}
              className="w-full rounded-xl border border-slate-900 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
            >
              {isSaving ? 'Applying…' : `Switch to ${template.name}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */

export default function TemplatesPage() {
  const [activeTemplate, setActiveTemplate] = useState('default');
  const [savingTemplate, setSavingTemplate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load the vendor's current template from their brand settings.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/store-front', { credentials: 'include', cache: 'no-store' });
        const payload = await res.json().catch(() => null);
        const templateValue = payload?.item?.template || payload?.template;
        if (!cancelled && templateValue) {
          setActiveTemplate(String(templateValue));
        }
      } catch {
        // Leave default as fallback — non-critical
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const handleSelect = async (templateId) => {
    if (templateId === activeTemplate || savingTemplate) return;
    setSavingTemplate(templateId);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/brand/template', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ template: templateId }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Failed to apply template.');
      setActiveTemplate(templateId);
      const templateName = VENDOR_TEMPLATES.find((t) => t.id === templateId)?.name ?? templateId;
      const blocksNote = payload?.blocks_added
        ? ' New layout blocks were added to your Storefront — go there to add images and customise them.'
        : '';
      setSuccess(`"${templateName}" template is now active.${blocksNote} Refresh your storefront to see the changes.`);
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSavingTemplate('');
    }
  };

  return (
    <AdminShell bg="bg-white">
      <div className="mx-auto w-full max-w-[1250px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10">

            {/* Page header */}
            <div className="mb-8">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">Store Templates</h1>
                <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)' }}>
                  Beta
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Switch your store's look in one click. Changes go live instantly for all your visitors.
              </p>
            </div>

            {/* Status messages */}
            {success && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-800">
                <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {success}
              </div>
            )}
            {error && (
              <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {/* Template grid */}
            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1].map((i) => (
                  <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="h-48 bg-slate-100" />
                    <div className="p-5 space-y-3">
                      <div className="h-4 w-24 rounded bg-slate-200" />
                      <div className="h-3 w-full rounded bg-slate-100" />
                      <div className="h-3 w-3/4 rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {VENDOR_TEMPLATES.filter((t) => t.isAvailable).map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isActive={activeTemplate === template.id}
                    isSaving={savingTemplate === template.id}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}

            {/* Info section */}
            <div className="mt-10 rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
              <h2 className="text-sm font-semibold text-slate-700">What gets a new look?</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span><strong className="text-slate-700">Your store header</strong> — the top of your page, including the banner and background.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span><strong className="text-slate-700">Product listing layout</strong> — how your products are arranged when customers browse.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span><strong className="text-slate-700">Product cards</strong> — how each product looks in the grid.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span><strong className="text-slate-700">Storefront layout blocks</strong> — templates that include a hero banner or custom sections will automatically add those blocks to your <a href="/backend/admin/store-front" className="font-semibold text-slate-700 underline underline-offset-2">Storefront</a> so you can add images and adjust them. Each store's blocks are independent — changes only affect your own store.</span>
                </li>
              </ul>
            </div>

      </div>
    </AdminShell>
  );
}
