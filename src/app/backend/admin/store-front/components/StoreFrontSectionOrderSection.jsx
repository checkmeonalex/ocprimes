'use client';

import { useEffect, useRef, useState } from 'react';

const SECTION_META = {
  banner_grid: {
    label: 'Banner Grid',
    description: 'Image grid or slider displayed at the top of your store.',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="3" width="8" height="8" rx="1" />
        <rect x="13" y="3" width="8" height="8" rx="1" />
        <rect x="3" y="13" width="8" height="8" rx="1" />
        <rect x="13" y="13" width="8" height="8" rx="1" />
      </svg>
    ),
  },
  storefront_filter: {
    label: 'Featured Products',
    description: 'Curated product chips and showcase section.',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
      </svg>
    ),
  },
};

const DEFAULT_ORDER = ['banner_grid', 'storefront_filter'];

export default function StoreFrontSectionOrderSection({ isLoading, brand, onSave }) {
  const [order, setOrder] = useState(DEFAULT_ORDER);
  const [isSaving, setIsSaving] = useState(false);
  const dragSrcRef = useRef(null);

  useEffect(() => {
    const raw = brand?.storefront_section_order;
    if (Array.isArray(raw) && raw.length) {
      const valid = raw.filter((k) => k in SECTION_META);
      // ensure all known sections are present
      const merged = [
        ...valid,
        ...DEFAULT_ORDER.filter((k) => !valid.includes(k)),
      ];
      setOrder(merged);
    }
  }, [brand?.storefront_section_order]);

  const handleDragStart = (e, key) => {
    dragSrcRef.current = key;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetKey) => {
    e.preventDefault();
    const srcKey = dragSrcRef.current;
    if (!srcKey || srcKey === targetKey) return;
    setOrder((prev) => {
      const next = [...prev];
      const srcIdx = next.indexOf(srcKey);
      const tgtIdx = next.indexOf(targetKey);
      if (srcIdx === -1 || tgtIdx === -1) return prev;
      next.splice(srcIdx, 1);
      next.splice(tgtIdx, 0, srcKey);
      return next;
    });
    dragSrcRef.current = null;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ storefront_section_order: order });
    } finally {
      setIsSaving(false);
    }
  };

  const currentOrder = brand?.storefront_section_order || DEFAULT_ORDER;
  const isDirty = JSON.stringify(order) !== JSON.stringify(currentOrder);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Section Order</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Choose what order your store sections show up in — just drag them around. Your products will always anchor the bottom, everything else is yours to arrange.
        </p>
      </div>

      <div className="space-y-2">
        {order.map((key) => {
          const meta = SECTION_META[key];
          if (!meta) return null;
          return (
            <div
              key={key}
              draggable
              onDragStart={(e) => handleDragStart(e, key)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, key)}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 cursor-grab active:cursor-grabbing select-none transition hover:border-slate-300 hover:bg-white"
            >
              {/* Drag handle */}
              <svg className="h-4 w-4 text-slate-300 shrink-0" fill="currentColor" viewBox="0 0 16 16">
                <circle cx="5" cy="4" r="1.2" />
                <circle cx="11" cy="4" r="1.2" />
                <circle cx="5" cy="8" r="1.2" />
                <circle cx="11" cy="8" r="1.2" />
                <circle cx="5" cy="12" r="1.2" />
                <circle cx="11" cy="12" r="1.2" />
              </svg>
              <span className="text-slate-400 shrink-0">{meta.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{meta.label}</p>
                <p className="text-[11px] text-slate-400 truncate">{meta.description}</p>
              </div>
            </div>
          );
        })}

        {/* Product grid (always last, not draggable) */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 opacity-50 select-none">
          <svg className="h-4 w-4 text-slate-200 shrink-0" fill="currentColor" viewBox="0 0 16 16">
            <circle cx="5" cy="4" r="1.2" /><circle cx="11" cy="4" r="1.2" />
            <circle cx="5" cy="8" r="1.2" /><circle cx="11" cy="8" r="1.2" />
            <circle cx="5" cy="12" r="1.2" /><circle cx="11" cy="12" r="1.2" />
          </svg>
          <svg className="h-5 w-5 text-slate-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-slate-500">Product Grid</p>
            <p className="text-[11px] text-slate-400">Always displayed last.</p>
          </div>
        </div>
      </div>

      {isDirty && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="rounded-full bg-slate-900 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-slate-700 disabled:opacity-40"
          >
            {isSaving ? 'Saving…' : 'Save Order'}
          </button>
        </div>
      )}
    </section>
  );
}
