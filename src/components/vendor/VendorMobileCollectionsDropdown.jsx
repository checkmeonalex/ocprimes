'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function VendorMobileCollectionsDropdown({
  isOpen,
  onClose,
  categoryTree = [],
  vendorSlug,
  mode = 'grouped',
  activeCategorySlug = '',
}) {
  const [expandedRootId, setExpandedRootId] = useState(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) setExpandedRootId(null);
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
          return [{ type: 'leaf', id: node.id, name: node.name, slug: node.slug }];
        }
        return [
          { type: 'header', id: `h-${node.id}`, name: node.name, slug: node.slug },
          ...node.children.map((c) => ({ type: 'child', id: c.id, name: c.name, slug: c.slug })),
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
        className={`fixed inset-0 z-[2147483050] flex flex-col bg-white md:hidden`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-900">
            Collections
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close collections"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Home row */}
        <Link
          href={`/${vendorSlug}`}
          onClick={onClose}
          className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-5 py-4"
        >
          <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-700">Home</span>
        </Link>

        {/* Category list */}
        <nav className="flex-1 overflow-y-auto">
          {categoryTree.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-400">No collections found.</p>
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
                      className={`flex items-center gap-3 py-4 pr-5 transition ${
                        item.type === 'child' ? 'pl-9' : 'pl-5'
                      } ${isActive(item.slug) ? 'bg-gray-50' : ''}`}
                    >
                      {isActive(item.slug) && (
                        <span className="h-1.5 w-1.5 rounded-full bg-black flex-shrink-0" />
                      )}
                      <span className={`text-sm font-semibold uppercase tracking-wider ${
                        isActive(item.slug) ? 'text-black' : 'text-gray-800'
                      }`}>
                        {item.name}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

          ) : (

            /* ── GROUPED MODE (accordion) ── */
            <ul>
              {categoryTree.map((node) => {
                const hasChildren = node.children && node.children.length > 0;
                const isExpanded = expandedRootId === node.id;
                const nodeActive = isActive(node.slug);

                return (
                  <li key={node.id} className="border-b border-gray-100 last:border-0">
                    {hasChildren ? (
                      <>
                        {/* Split row */}
                        <div className={`flex items-center ${nodeActive ? 'bg-gray-50' : ''}`}>
                          <Link
                            href={buildHref(node.slug)}
                            onClick={onClose}
                            className="flex flex-1 items-center gap-3 pl-5 py-4"
                          >
                            {nodeActive && (
                              <span className="h-1.5 w-1.5 rounded-full bg-black flex-shrink-0" />
                            )}
                            <span className={`text-sm font-semibold uppercase tracking-wider ${
                              nodeActive ? 'text-black' : 'text-gray-800'
                            }`}>
                              {node.name}
                            </span>
                          </Link>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedRootId((prev) => (prev === node.id ? null : node.id))
                            }
                            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${node.name}`}
                            className="flex items-center justify-center h-full px-5 py-4 border-l border-gray-100 text-gray-400 transition"
                          >
                            <svg
                              className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth="2"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>

                        {/* Accordion children */}
                        {isExpanded && (
                          <ul className="border-t border-gray-100 bg-gray-50">
                            <li className="border-b border-gray-100">
                              <Link
                                href={buildHref(node.slug)}
                                onClick={onClose}
                                className="flex items-center gap-3 pl-9 pr-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500 transition hover:text-black"
                              >
                                All {node.name}
                              </Link>
                            </li>
                            {node.children.map((child) => (
                              <li key={child.id} className="border-b border-gray-100 last:border-0">
                                <Link
                                  href={buildHref(child.slug)}
                                  onClick={onClose}
                                  className={`flex items-center gap-3 pl-9 pr-5 py-3.5 transition ${
                                    isActive(child.slug) ? 'bg-white' : ''
                                  }`}
                                >
                                  {isActive(child.slug) && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-black flex-shrink-0" />
                                  )}
                                  <span className={`text-sm font-semibold uppercase tracking-wider ${
                                    isActive(child.slug) ? 'text-black' : 'text-gray-700'
                                  }`}>
                                    {child.name}
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    ) : (
                      <Link
                        href={buildHref(node.slug)}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-5 py-4 transition ${
                          nodeActive ? 'bg-gray-50' : ''
                        }`}
                      >
                        {nodeActive && (
                          <span className="h-1.5 w-1.5 rounded-full bg-black flex-shrink-0" />
                        )}
                        <span className={`text-sm font-semibold uppercase tracking-wider ${
                          nodeActive ? 'text-black' : 'text-gray-800'
                        }`}>
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
      </div>
    </>
  );
}
