'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function VendorCollectionsMenu({
  isOpen,
  onClose,
  categoryTree = [],
  vendorSlug,
  mode = 'grouped',
  activeCategorySlug = '',
}) {
  const [activeRoot, setActiveRoot] = useState(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) setActiveRoot(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const buildHref = (slug) =>
    slug ? `/${vendorSlug}?category=${slug}` : `/${vendorSlug}`;

  const isActive = (slug) =>
    slug && activeCategorySlug && slug === activeCategorySlug;

  // Flat list: roots + all their children interleaved with a header label
  const flatItems = mode === 'flat'
    ? categoryTree.flatMap((node) => {
        if (!node.children || node.children.length === 0) {
          return [{ type: 'leaf', id: node.id, name: node.name, slug: node.slug }];
        }
        return [
          { type: 'header', id: `h-${node.id}`, name: node.name, slug: node.slug },
          ...node.children.map((c) => ({ type: 'child', id: c.id, name: c.name, slug: c.slug })),
        ];
      })
    : [];

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-[2147483010] bg-black/30 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Main panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Collections"
        className={`fixed top-0 right-0 z-[2147483020] h-full w-72 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-900">Collections</span>
          <button
            onClick={onClose}
            aria-label="Close collections"
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Back to home */}
        <Link
          href={`/${vendorSlug}`}
          onClick={onClose}
          className="flex items-center gap-3 px-5 py-3.5 bg-[#e0f4f4] text-teal-900 text-xs font-semibold uppercase tracking-wider hover:bg-[#c8ecec] transition"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        {/* Category list */}
        <nav className="flex-1 overflow-y-auto">
          {categoryTree.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">No collections found.</p>
          ) : mode === 'flat' ? (
            /* ── FLAT MODE ── */
            <ul>
              {flatItems.map((item) => {
                if (item.type === 'header') {
                  return (
                    <li key={item.id}>
                      <Link
                        href={buildHref(item.slug)}
                        onClick={onClose}
                        className={`flex w-full items-center px-5 pt-5 pb-2 text-[10px] font-bold uppercase tracking-widest transition ${
                          isActive(item.slug) ? 'text-black' : 'text-gray-400 hover:text-gray-700'
                        }`}
                      >
                        {item.name}
                      </Link>
                    </li>
                  );
                }
                const indent = item.type === 'child' ? 'pl-8' : 'pl-5';
                return (
                  <li key={item.id} className="border-b border-gray-100 last:border-0">
                    <Link
                      href={buildHref(item.slug)}
                      onClick={onClose}
                      className={`flex w-full items-center ${indent} pr-5 py-3.5 text-xs font-semibold uppercase tracking-wider transition ${
                        isActive(item.slug)
                          ? 'text-black bg-gray-50'
                          : 'text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      {isActive(item.slug) && (
                        <span className="mr-2 h-1.5 w-1.5 rounded-full bg-black flex-shrink-0" />
                      )}
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            /* ── GROUPED MODE (drill-down) ── */
            <ul>
              {categoryTree.map((node) => {
                const hasChildren = node.children && node.children.length > 0;
                const nodeActive = isActive(node.slug);
                return (
                  <li key={node.id} className="border-b border-gray-100 last:border-0">
                    {hasChildren ? (
                      /* Split row: name = link to category, arrow = open sub-panel */
                      <div className={`flex items-center ${nodeActive ? 'bg-gray-50' : ''}`}>
                        <Link
                          href={buildHref(node.slug)}
                          onClick={onClose}
                          className={`flex flex-1 items-center gap-2 pl-5 py-4 text-xs font-semibold uppercase tracking-wider transition hover:bg-gray-50 ${
                            nodeActive ? 'text-black' : 'text-gray-800'
                          }`}
                        >
                          {nodeActive && <span className="h-1.5 w-1.5 rounded-full bg-black flex-shrink-0" />}
                          {node.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => setActiveRoot(node)}
                          aria-label={`See ${node.name} subcategories`}
                          className="flex h-full items-center px-4 py-4 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition border-l border-gray-100"
                        >
                          <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <Link
                        href={buildHref(node.slug)}
                        onClick={onClose}
                        className={`flex w-full items-center px-5 py-4 text-xs font-semibold uppercase tracking-wider transition hover:bg-gray-50 ${
                          nodeActive ? 'text-black bg-gray-50' : 'text-gray-800'
                        }`}
                      >
                        {nodeActive && <span className="mr-2 h-1.5 w-1.5 rounded-full bg-black flex-shrink-0" />}
                        {node.name}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      </div>

      {/* Sub-category panel — only shown in grouped mode */}
      {mode === 'grouped' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeRoot ? `${activeRoot.name} subcategories` : 'Subcategories'}
          className={`fixed top-0 right-0 z-[2147483030] h-full w-72 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
            activeRoot ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-900">
              {activeRoot?.name || ''}
            </span>
            <button
              onClick={onClose}
              aria-label="Close collections"
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setActiveRoot(null)}
            className="flex items-center gap-3 px-5 py-3.5 bg-[#e0f4f4] text-teal-900 text-xs font-semibold uppercase tracking-wider hover:bg-[#c8ecec] transition text-left"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Collections
          </button>

          {activeRoot && (
            <Link
              href={buildHref(activeRoot.slug)}
              onClick={onClose}
              className={`flex items-center px-5 py-3.5 border-b border-gray-100 text-xs font-semibold uppercase tracking-wider transition ${
                isActive(activeRoot.slug) ? 'text-black bg-gray-50' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {isActive(activeRoot.slug) && <span className="mr-2 h-1.5 w-1.5 rounded-full bg-black flex-shrink-0" />}
              All {activeRoot.name}
            </Link>
          )}

          <nav className="flex-1 overflow-y-auto">
            <ul>
              {(activeRoot?.children || []).map((child) => (
                <li key={child.id} className="border-b border-gray-100 last:border-0">
                  <Link
                    href={buildHref(child.slug)}
                    onClick={onClose}
                    className={`flex w-full items-center px-5 py-4 text-xs font-semibold uppercase tracking-wider transition ${
                      isActive(child.slug) ? 'text-black bg-gray-50' : 'text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    {isActive(child.slug) && <span className="mr-2 h-1.5 w-1.5 rounded-full bg-black flex-shrink-0" />}
                    {child.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
