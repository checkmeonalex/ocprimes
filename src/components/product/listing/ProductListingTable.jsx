import { useEffect, useMemo, useRef, useState } from 'react';
import { formatCount } from './productListingHelpers';
import ProductListingTableRow from './ProductListingTableRow';

const ProductListingTable = ({
  statusTabs,
  filterOptions,
  sortOptions,
  products,
  pagination,
  notices,
  onAction,
}) => {
  const [statusTab, setStatusTab] = useState(statusTabs[0]?.value || 'all');
  const [filterValue, setFilterValue] = useState(
    filterOptions[0]?.value || 'all'
  );
  const [sortValue, setSortValue] = useState(sortOptions[0]?.value || 'newest');
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const selectAllRef = useRef(null);
  const actionMenuRef = useRef(null);
  const filterMenuRef = useRef(null);
  const sortMenuRef = useRef(null);

  const visibleIds = useMemo(
    () => products.map((product) => Number(product.id)),
    [products]
  );
  const selectedVisibleCount = useMemo(
    () =>
      visibleIds.filter((id) => selectedProductIds.includes(id)).length,
    [visibleIds, selectedProductIds]
  );
  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const hasSelection = selectedProductIds.length > 0;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        !allVisibleSelected && selectedVisibleCount > 0;
    }
  }, [allVisibleSelected, selectedVisibleCount]);

  useEffect(() => {
    const handleClick = (event) => {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target)
      ) {
        setActionMenuId(null);
      }
      if (
        filterMenuRef.current &&
        !filterMenuRef.current.contains(event.target)
      ) {
        setShowFilterMenu(false);
      }
      if (
        sortMenuRef.current &&
        !sortMenuRef.current.contains(event.target)
      ) {
        setShowSortMenu(false);
      }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedProductIds((prev) =>
        prev.filter((id) => !visibleIds.includes(id))
      );
      return;
    }
    setSelectedProductIds((prev) =>
      Array.from(new Set([...prev, ...visibleIds]))
    );
  };

  const shownCount = pagination?.shownCount ?? products.length;
  const totalCount = pagination?.totalCount ?? products.length;

  return (
    <div
      id="product-list"
      className="rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div className="flex flex-wrap gap-2">
          {hasSelection ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedProductIds([])}
                className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Deselect
              </button>
              <button
                type="button"
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm"
              >
                Mark out of stock
              </button>
              <button
                type="button"
                className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Move to draft
              </button>
              <button
                type="button"
                className="rounded-full bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600"
              >
                Delete permanent
              </button>
            </>
          ) : (
            statusTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusTab(tab.value)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  statusTab === tab.value
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tab.label}
              </button>
            ))
          )}
        </div>
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setShowFilterMenu((prev) => !prev);
              setShowSortMenu(false);
            }}
            className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 6h16" />
              <path d="M7 12h10" />
              <path d="M10 18h4" />
            </svg>
            Filter
          </button>
          {showFilterMenu && (
            <div
              ref={filterMenuRef}
              className="absolute right-24 top-12 z-20 w-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg"
            >
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setFilterValue(option.value);
                    setShowFilterMenu(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${
                    filterValue === option.value
                      ? 'bg-slate-100 text-slate-700'
                      : 'text-slate-500'
                  }`}
                >
                  {option.label}
                  {filterValue === option.value && <span>•</span>}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setShowSortMenu((prev) => !prev);
              setShowFilterMenu(false);
            }}
            className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 7h18" />
              <path d="M6 12h12" />
              <path d="M9 17h6" />
            </svg>
            Sort
          </button>
          {showSortMenu && (
            <div
              ref={sortMenuRef}
              className="absolute right-0 top-12 z-20 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg"
            >
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setSortValue(option.value);
                    setShowSortMenu(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${
                    sortValue === option.value
                      ? 'bg-slate-100 text-slate-700'
                      : 'text-slate-500'
                  }`}
                >
                  {option.label}
                  {sortValue === option.value && <span>•</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        <div className="hidden sm:grid sm:grid-cols-[minmax(32px,_0.2fr)_minmax(140px,_1.6fr)_minmax(90px,_0.8fr)_minmax(80px,_0.6fr)_minmax(90px,_0.7fr)_minmax(64px,_0.4fr)] sm:gap-3">
          <span>
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allVisibleSelected}
              onChange={handleSelectAll}
              className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              aria-label="Select all products"
            />
          </span>
          <span>Product</span>
          <span>Stock</span>
          <span>Quantity</span>
          <span>Price</span>
          <span className="text-right">Actions</span>
        </div>
      </div>

      <div className="relative">
        {actionMenuId && (
          <div className="fixed inset-0 z-10 bg-white/60 backdrop-blur-sm" />
        )}
        <div className="divide-y divide-slate-100">
          {products.map((product) => (
            <div
              key={product.id}
              ref={actionMenuId === product.id ? actionMenuRef : null}
            >
              <ProductListingTableRow
                product={product}
                isSelected={selectedProductIds.includes(Number(product.id))}
                onToggleSelect={() =>
                  setSelectedProductIds((prev) =>
                    prev.includes(Number(product.id))
                      ? prev.filter((id) => id !== Number(product.id))
                      : [...prev, Number(product.id)]
                  )
                }
                actionMenuOpen={actionMenuId === product.id}
                onActionMenuToggle={(event) => {
                  event.stopPropagation();
                  setActionMenuId((prev) =>
                    prev === product.id ? null : product.id
                  );
                }}
                onAction={onAction}
              />
            </div>
          ))}
          {!products.length && (
            <div className="px-6 py-10 text-center text-sm text-slate-400">
              {notices?.emptyStateText || 'No products found.'}
            </div>
          )}
          {statusTab === 'trash' && products.length > 0 && (
            <div className="px-6 py-6 text-center text-xs text-slate-400">
              {notices?.trashNotice ||
                'Trash items are auto-removed after 30 days.'}
            </div>
          )}
        </div>
      </div>

      {notices?.featuredNotice && (
        <p className="px-6 pt-4 text-xs text-amber-600">
          {notices.featuredNotice}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 text-xs text-slate-400">
        <span>
          Showing {formatCount(shownCount)} of {formatCount(totalCount)} products
        </span>
        {pagination?.hasMore && (
          <button
            type="button"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500"
          >
            {pagination?.loadMoreLabel || 'Load more'}
          </button>
        )}
      </div>
      <div className="h-1 w-full" />
    </div>
  );
};

export default ProductListingTable;
