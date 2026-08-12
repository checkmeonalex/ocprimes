'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  PreferenceRowList,
  PreferenceOptionsList,
  PREFERENCE_LABELS,
} from '@/components/sidebar/PreferencePicker';

const getInitials = (name = '') =>
  String(name || '')
    .trim()
    .slice(0, 2)
    .toUpperCase();

function CategoryAvatar({ name, imageUrl, imageAlt }) {
  if (imageUrl) {
    return (
      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-100">
        <img src={imageUrl} alt={imageAlt || name || ''} className="h-full w-full object-cover" loading="lazy" />
      </span>
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold uppercase text-gray-500" aria-hidden="true">
      {getInitials(name)}
    </span>
  );
}

function CategoryTile({ name, imageUrl, imageAlt, href, active, onClick }) {
  return (
    <Link href={href} onClick={onClick} className="flex flex-col items-center gap-2 text-center group">
      <span
        className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gray-100 ring-2 transition ${
          active ? 'ring-gray-900' : 'ring-transparent group-hover:ring-gray-300'
        }`}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={imageAlt || name || ''} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-base font-bold uppercase text-gray-500">
            {getInitials(name)}
          </span>
        )}
      </span>
      <span className={`text-[11px] font-semibold leading-tight transition ${active ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'}`}>
        {name}
      </span>
    </Link>
  );
}

export default function VendorMobileCollectionsDropdown({
  isOpen,
  onClose,
  categoryTree = [],
  vendorSlug,
  storeName = '',
  mode = 'grouped',
  activeCategorySlug = '',
}) {
  const [activeRoot, setActiveRoot] = useState(null);
  const [activePreference, setActivePreference] = useState(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setActiveRoot(null);
      setActivePreference(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  const buildHref = (slug) =>
    slug ? `/${vendorSlug}?category=${slug}` : `/${vendorSlug}`;

  const isActive = (slug) =>
    Boolean(slug && activeCategorySlug && slug === activeCategorySlug);

  const flatItems = mode === 'flat'
    ? categoryTree.flatMap((node) => {
        if (!node.children || node.children.length === 0) {
          return [{ type: 'leaf', id: node.id, name: node.name, slug: node.slug, image_url: node.image_url, image_alt: node.image_alt }];
        }
        return [
          { type: 'header', id: `h-${node.id}`, name: node.name, slug: node.slug },
          ...node.children.map((c) => ({ type: 'child', id: c.id, name: c.name, slug: c.slug, image_url: c.image_url, image_alt: c.image_alt })),
        ];
      })
    : [];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[2147483040] bg-black/40 md:hidden"
        onClick={onClose}
      />

      {/* Full-height panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Collections menu"
        className="fixed inset-0 z-[2147483050] flex flex-col bg-white md:hidden"
      >
        {!activeRoot && !activePreference ? (
          <>
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-[#1a140d] px-5 py-4">
              <span className="text-sm font-bold uppercase tracking-widest text-white">Menu</span>
              {storeName ? (
                <span className="truncate px-3 text-xs font-semibold text-white/50">{storeName}</span>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close collections"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white transition"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Category list */}
            <nav className="flex-1 overflow-y-auto">
              {categoryTree.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-gray-400">No collections found.</p>
              ) : mode === 'flat' ? (
                /* ── FLAT MODE ── */
                <ul>
                  <li className="border-b border-gray-100">
                    <Link
                      href={`/${vendorSlug}`}
                      onClick={onClose}
                      className="flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                    >
                      <CategoryAvatar name={storeName || 'Home'} />
                      Home
                    </Link>
                  </li>
                  {flatItems.map((item) => {
                    if (item.type === 'header') {
                      return (
                        <li key={item.id}>
                          <Link
                            href={buildHref(item.slug)}
                            onClick={onClose}
                            className={`flex items-center px-5 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[0.2em] ${
                              isActive(item.slug) ? 'text-black' : 'text-gray-400'
                            }`}
                          >
                            {item.name}
                          </Link>
                        </li>
                      );
                    }
                    return (
                      <li key={item.id} className="border-b border-gray-50 last:border-0">
                        <Link
                          href={buildHref(item.slug)}
                          onClick={onClose}
                          className={`flex items-center gap-3 py-3 pr-5 transition ${
                            item.type === 'child' ? 'pl-9' : 'pl-5'
                          } ${isActive(item.slug) ? 'bg-gray-50' : ''}`}
                        >
                          <CategoryAvatar name={item.name} imageUrl={item.image_url} imageAlt={item.image_alt} />
                          <span className={`text-sm font-semibold ${isActive(item.slug) ? 'text-black' : 'text-gray-800'}`}>
                            {item.name}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                /* ── GROUPED MODE (drill-down) ── */
                <ul>
                  <li className="border-b border-gray-100">
                    <Link
                      href={`/${vendorSlug}`}
                      onClick={onClose}
                      className="flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                    >
                      <CategoryAvatar name={storeName || 'Home'} />
                      Home
                    </Link>
                  </li>
                  {categoryTree.map((node) => {
                    const hasChildren = node.children && node.children.length > 0;
                    const nodeActive = isActive(node.slug);

                    return (
                      <li key={node.id} className="border-b border-gray-100 last:border-0">
                        {hasChildren ? (
                          <div className={`flex items-center ${nodeActive ? 'bg-gray-50' : ''}`}>
                            <Link
                              href={buildHref(node.slug)}
                              onClick={onClose}
                              className="flex flex-1 items-center gap-3 pl-5 py-3.5"
                            >
                              <CategoryAvatar name={node.name} imageUrl={node.image_url} imageAlt={node.image_alt} />
                              <span className={`text-sm font-semibold ${nodeActive ? 'text-black' : 'text-gray-800'}`}>
                                {node.name}
                              </span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => setActiveRoot(node)}
                              aria-label={`See ${node.name} subcategories`}
                              className="flex items-center justify-center h-full px-4 py-3.5 border-l border-gray-100 text-gray-400 transition"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <Link
                            href={buildHref(node.slug)}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-5 py-3.5 transition ${nodeActive ? 'bg-gray-50' : ''}`}
                          >
                            <CategoryAvatar name={node.name} imageUrl={node.image_url} imageAlt={node.image_alt} />
                            <span className={`text-sm font-semibold ${nodeActive ? 'text-black' : 'text-gray-800'}`}>
                              {node.name}
                            </span>
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </nav>

            {/* Region and language footer */}
            <PreferenceRowList
              sectionClassName="border-t border-gray-100"
              titleClassName="px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400"
              onOpenPreference={setActivePreference}
            />
          </>
        ) : activeRoot ? (
          <>
            {/* Sub-category panel */}
            <div className="flex items-center gap-2 border-b border-gray-100 bg-[#1a140d] px-3 py-4">
              <button
                type="button"
                onClick={() => setActiveRoot(null)}
                aria-label="Back to collections"
                className="rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="flex-1 truncate text-sm font-bold uppercase tracking-widest text-white">
                {activeRoot.name}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close collections"
                className="rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {activeRoot.image_url ? (
              <Link href={buildHref(activeRoot.slug)} onClick={onClose} className="block">
                <div className="relative h-32 w-full overflow-hidden bg-gray-100">
                  <img
                    src={activeRoot.image_url}
                    alt={activeRoot.image_alt || activeRoot.name || ''}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              </Link>
            ) : null}

            <Link
              href={buildHref(activeRoot.slug)}
              onClick={onClose}
              className={`flex items-center px-5 py-3 border-b border-gray-100 text-xs font-semibold uppercase tracking-wider transition ${
                isActive(activeRoot.slug) ? 'text-black bg-gray-50' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {isActive(activeRoot.slug) && <span className="mr-2 h-1.5 w-1.5 rounded-full bg-black flex-shrink-0" />}
              All {activeRoot.name}
            </Link>

            <nav className="flex-1 overflow-y-auto px-5 py-5">
              <div className="grid grid-cols-3 gap-x-3 gap-y-5">
                {(activeRoot.children || []).map((child) => (
                  <CategoryTile
                    key={child.id}
                    name={child.name}
                    imageUrl={child.image_url}
                    imageAlt={child.image_alt}
                    href={buildHref(child.slug)}
                    active={isActive(child.slug)}
                    onClick={onClose}
                  />
                ))}
              </div>
            </nav>
          </>
        ) : (
          <>
            {/* Region/language preference panel */}
            <div className="flex items-center gap-2 border-b border-gray-100 bg-[#1a140d] px-3 py-4">
              <button
                type="button"
                onClick={() => setActivePreference(null)}
                aria-label="Back to collections"
                className="rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="flex-1 truncate text-sm font-bold uppercase tracking-widest text-white">
                {PREFERENCE_LABELS[activePreference] || ''}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close collections"
                className="rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-4 py-3">
              <PreferenceOptionsList
                preferenceKey={activePreference}
                onSelected={() => setActivePreference(null)}
              />
            </nav>
          </>
        )}
      </div>
    </>
  );
}
