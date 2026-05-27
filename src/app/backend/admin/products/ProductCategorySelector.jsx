import { useState, useMemo } from 'react';

const ProductCategorySelector = ({
  selectedCategories = [],
  onSelectCategories = () => {},
  categories = [],
  pendingCategoryRequestIds = [],
  isLoading = false,
  errorMessage = '',
  onOpen = () => {},
  onRequestCategory = null,
  isRequestingCategory = false,
  requestCategoryError = '',
  pendingCategoryRequests = [],
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [navPath, setNavPath] = useState([]);
  const [isRequestConfirmOpen, setIsRequestConfirmOpen] = useState(false);
  const normalizedSearch = String(searchTerm || '').trim().toLowerCase();
  
  const treeNodes = useMemo(() => {
    const map = new Map();
    categories.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [] });
    });
    const roots = [];
    map.forEach((node) => {
      if (node.parent_id && map.has(node.parent_id)) {
        map.get(node.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    });
    const sortNodes = (list) => {
      list.sort((a, b) => a.name.localeCompare(b.name));
      list.forEach((child) => sortNodes(child.children));
    };
    sortNodes(roots);
    return { map, roots };
  }, [categories]);

  const breadcrumb = useMemo(() => {
    if (!navPath.length) return 'All Categories';
    return navPath
      .map((id) => treeNodes.map.get(id)?.name)
      .filter(Boolean)
      .join(' > ');
  }, [navPath, treeNodes.map]);

  const currentNodes = useMemo(() => {
    if (!navPath.length) return treeNodes.roots;
    const active = treeNodes.map.get(navPath[navPath.length - 1]);
    return active?.children || [];
  }, [navPath, treeNodes]);

  const flattenedWithPath = useMemo(() => {
    const parents = new Map(categories.map((cat) => [cat.id, cat.parent_id]));
    const names = new Map(categories.map((cat) => [cat.id, cat.name]));
    const buildPath = (id) => {
      const parts = [];
      let cursor = id;
      while (cursor) {
        const name = names.get(cursor);
        if (name) parts.unshift(name);
        cursor = parents.get(cursor);
      }
      return parts.join(' > ');
    };
    return categories.map((cat) => ({
      ...cat,
      breadcrumb: buildPath(cat.id),
    }));
  }, [categories]);

  const filteredNodes = useMemo(() => {
    if (!searchTerm) return currentNodes;
    const term = searchTerm.toLowerCase();
    return flattenedWithPath.filter((cat) => {
      const name = (cat.name || '').toLowerCase();
      const slug = (cat.slug || '').toLowerCase();
      const crumb = (cat.breadcrumb || '').toLowerCase();
      return name.includes(term) || slug.includes(term) || crumb.includes(term);
    });
  }, [currentNodes, flattenedWithPath, searchTerm]);

  const categoryById = useMemo(() => {
    const map = new Map();
    categories.forEach((cat) => {
      map.set(String(cat.id), cat);
    });
    return map;
  }, [categories]);

  const normalizeId = (value) => String(value ?? '').trim();

  const getAncestorIds = (categoryId) => {
    const lineage = [];
    let cursor = categoryById.get(normalizeId(categoryId));
    while (cursor?.parent_id) {
      const parentId = normalizeId(cursor.parent_id);
      if (!parentId) break;
      lineage.push(parentId);
      cursor = categoryById.get(parentId);
    }
    return lineage;
  };

  const toggleCategory = (categoryId) => {
    const targetId = normalizeId(categoryId);
    const selectedSet = new Set((selectedCategories || []).map((id) => normalizeId(id)));
    const isSelected = selectedSet.has(targetId);

    if (isSelected) {
      selectedSet.delete(targetId);
    } else {
      selectedSet.add(targetId);
      const ancestorIds = getAncestorIds(targetId);
      ancestorIds.forEach((ancestorId) => selectedSet.add(ancestorId));
    }

    const newSelection = Array.from(selectedSet);
    onSelectCategories(newSelection);
  };

  const isCategorySelected = (categoryId) =>
    (selectedCategories || []).some((id) => normalizeId(id) === normalizeId(categoryId));

  const selectedCategoryNames = useMemo(() => {
    const selectedIdSet = new Set((selectedCategories || []).map((id) => normalizeId(id)));
    const buildBreadcrumb = (category) => {
      const parts = [];
      let cursor = category;
      while (cursor) {
        parts.unshift(cursor.name);
        const parentId = normalizeId(cursor.parent_id);
        if (!parentId) break;
        cursor = categoryById.get(parentId);
      }
      return parts.join(' > ');
    };
    return categories
      .filter((cat) => selectedIdSet.has(normalizeId(cat.id)))
      .map((cat) => buildBreadcrumb(cat))
      .join(' • ');
  }, [categories, categoryById, selectedCategories]);
  const selectedPendingRequests = useMemo(() => {
    const idSet = new Set((pendingCategoryRequestIds || []).map((id) => String(id)));
    return (pendingCategoryRequests || []).filter((item) => idSet.has(String(item?.id || '')));
  }, [pendingCategoryRequestIds, pendingCategoryRequests]);
  const pendingPlaceholderCount = Array.isArray(pendingCategoryRequestIds)
    ? pendingCategoryRequestIds.length
    : 0;
  const selectedPendingNames = useMemo(() => (
    selectedPendingRequests
      .map((item) => item?.name || item?.slug || '')
      .filter(Boolean)
      .map((name) => `${name} (Pending)`)
      .join(' • ')
  ), [selectedPendingRequests]);
  const effectiveSelectedCount = selectedCategories.length + pendingPlaceholderCount;
  const pendingFallbackLabel = pendingPlaceholderCount > 0 && !selectedPendingNames
    ? `${pendingPlaceholderCount} pending request${pendingPlaceholderCount > 1 ? 's' : ''}`
    : '';
  const selectedDisplayLabel = [selectedCategoryNames, selectedPendingNames || pendingFallbackLabel]
    .filter(Boolean)
    .join(' • ');
  const selectedCategorySummaryLabel = selectedDisplayLabel
    || (effectiveSelectedCount > 0
      ? `${effectiveSelectedCount} category${effectiveSelectedCount !== 1 ? 'ies' : ''} selected`
      : 'None selected');

  const canRequestFromSearch = useMemo(() => {
    if (!normalizedSearch) return false;
    const hasExactCategory = categories.some((cat) => {
      const name = String(cat?.name || '').trim().toLowerCase();
      const slug = String(cat?.slug || '').trim().toLowerCase();
      return name === normalizedSearch || slug === normalizedSearch;
    });
    if (hasExactCategory) return false;
    const hasPendingRequest = Array.isArray(pendingCategoryRequests) && pendingCategoryRequests.some((item) => {
      const name = String(item?.name || '').trim().toLowerCase();
      const slug = String(item?.slug || '').trim().toLowerCase();
      return name === normalizedSearch || slug === normalizedSearch;
    });
    return !hasPendingRequest;
  }, [categories, normalizedSearch, pendingCategoryRequests]);

  return (
    <div className={`relative w-full ${className}`}>
      <button
        type="button"
        onClick={() => {
          if (!isOpen) {
            onOpen();
          }
          setIsOpen((prev) => !prev);
        }}
        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <div className="flex min-w-0 items-center justify-between gap-1">
          <span className={`min-w-0 max-w-[46%] truncate ${effectiveSelectedCount > 0 ? 'text-slate-900' : 'text-slate-500'}`}>
            {effectiveSelectedCount > 0
              ? `${effectiveSelectedCount} category${effectiveSelectedCount !== 1 ? 'ies' : ''} selected`
              : 'Select categories...'}
          </span>
          <span className="min-w-0 flex-1 truncate px-1 text-right text-slate-500">
            {selectedCategorySummaryLabel}
          </span>
          <svg
            className={`ml-1 h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center px-0 py-0 sm:items-center sm:px-4 sm:py-6">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            aria-label="Close categories"
          />
          <div className="relative z-10 w-full max-h-[86vh] overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:max-h-[calc(100vh-48px)] sm:max-w-2xl sm:rounded-[28px] sm:p-5">
            <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-200 sm:hidden" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Categories
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">Select product categories</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500"
              >
                Done
              </button>
            </div>

            <div className="mt-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search or create category..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (e.target.value) {
                      setNavPath([]);
                    }
                  }}
                  className="w-full rounded-2xl border border-slate-200 py-2 pl-8 pr-10 text-xs text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                />
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg
                    className="h-4 w-4 text-slate-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                {canRequestFromSearch ? (
                  <button
                    type="button"
                    onClick={() => setIsRequestConfirmOpen(true)}
                    className="absolute inset-y-0 right-1.5 my-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                    aria-label="Request category from search"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                  </button>
                ) : null}
              </div>
              {requestCategoryError ? (
                <p className="mt-1 text-[11px] text-rose-600">{requestCategoryError}</p>
              ) : null}
              {Array.isArray(selectedPendingRequests) && selectedPendingRequests.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedPendingRequests.map((item) => (
                    <span
                      key={item.id || item.slug || item.name}
                      className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700"
                    >
                      {item.name || item.slug || 'Pending'} · Pending
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {isLoading && (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                  Loading categories...
                </span>
              </div>
            )}

            {!isLoading && errorMessage && (
              <div className="mt-4 rounded-2xl border border-dashed border-rose-200 bg-rose-50/60 px-3 py-6 text-center text-xs text-rose-500">
                {errorMessage}
              </div>
            )}

            {!isLoading && !errorMessage && (
              <div className="mt-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.5px] text-slate-500">
                    {breadcrumb}
                  </h3>
                  {navPath.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setNavPath((prev) => prev.slice(0, -1))}
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-800"
                    >
                      Back
                    </button>
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  {filteredNodes.map((category) => {
                    const hasChildren =
                      !searchTerm &&
                      Array.isArray(category.children) &&
                      category.children.length > 0;
                    const label = searchTerm ? category.breadcrumb : category.name;
                    return (
                      <div
                        key={category.id}
                        className="flex items-center rounded-2xl px-3 py-2 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={isCategorySelected(category.id)}
                          onChange={() => toggleCategory(category.id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (hasChildren) {
                              setNavPath((prev) => [...prev, category.id]);
                              setSearchTerm('');
                              return;
                            }
                            toggleCategory(category.id);
                          }}
                          className="ml-2 flex flex-1 items-center justify-between text-left"
                        >
                          <span className="block truncate text-xs font-medium text-slate-700">
                            {label}
                          </span>
                          {hasChildren && (
                            <svg
                              viewBox="0 0 24 24"
                              className="h-3.5 w-3.5 text-slate-400"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M9 6l6 6-6 6" />
                            </svg>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!isLoading && !errorMessage && filteredNodes.length === 0 && searchTerm && (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
                No categories found for "{searchTerm}"
              </div>
            )}

            {!isLoading && !errorMessage && categories.length === 0 && !searchTerm && (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
                No categories available
              </div>
            )}
          </div>
        </div>
      )}
      {isRequestConfirmOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-3">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl">
            <p className="text-sm font-semibold text-slate-900">Send category request?</p>
            <p className="mt-1 text-xs text-slate-600">
              "{searchTerm.trim()}" is not listed yet. Request to add this category.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRequestConfirmOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canRequestFromSearch || !onRequestCategory || isRequestingCategory}
                onClick={async () => {
                  if (!onRequestCategory || !canRequestFromSearch) return;
                  const requested = await onRequestCategory(searchTerm.trim());
                  if (requested) {
                    setSearchTerm('');
                    setIsRequestConfirmOpen(false);
                  }
                }}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRequestingCategory ? 'Submitting...' : 'Send request'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ProductCategorySelector;
