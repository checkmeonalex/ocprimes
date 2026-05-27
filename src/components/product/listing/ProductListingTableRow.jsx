import { formatPrice } from './productListingHelpers';

const ProductListingTableRow = ({
  product,
  isSelected,
  onToggleSelect,
  actionMenuOpen,
  onActionMenuToggle,
  onAction,
}) => {
  const statusBadge = product.statusBadge || {};
  const stockBadge = product.stockBadge || {};
  const currencySymbol = product.currencySymbol || '$';
  const isTrashed = product.status === 'trash';

  return (
    <div
      className={`flex flex-col gap-3 px-6 py-4 text-sm sm:grid sm:grid-cols-[minmax(32px,_0.2fr)_minmax(140px,_1.6fr)_minmax(90px,_0.8fr)_minmax(80px,_0.6fr)_minmax(90px,_0.7fr)_minmax(64px,_0.4fr)] sm:items-center sm:gap-3 ${
        actionMenuOpen ? 'relative z-20' : 'relative'
      }`}
    >
      <div className="hidden sm:flex items-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          aria-label={`Select ${product.name}`}
        />
      </div>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 sm:hidden"
          aria-label={`Select ${product.name}`}
        />
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-12 w-12 rounded-2xl object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="h-12 w-12 rounded-2xl bg-slate-200" />
        )}
        <div>
          <div className="flex items-start gap-2">
            {product.isFeatured && (
              <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <svg
                  viewBox="0 0 24 24"
                  className="h-3 w-3"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 3.5 14.8 9l6 .9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6L3.2 9l6-.9L12 3.5Z" />
                </svg>
              </span>
            )}
            <p
              className="text-sm font-semibold text-slate-700"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {product.name}
            </p>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>{product.category}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                statusBadge.tone || 'bg-slate-100 text-slate-600'
              }`}
            >
              {statusBadge.label || 'Status'}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:hidden">
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                stockBadge.tone || 'bg-slate-100 text-slate-600'
              }`}
            >
              {stockBadge.label || 'Stock'}
            </span>
            <span>Quantity {product.inventoryLabel}</span>
            <span>{formatPrice(product.price, currencySymbol)}</span>
          </div>
        </div>
      </div>
      <div className="hidden sm:block">
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
            stockBadge.tone || 'bg-slate-100 text-slate-600'
          }`}
        >
          {stockBadge.label || 'Stock'}
        </span>
      </div>
      <div className="hidden sm:block text-[11px] font-semibold text-slate-600">
        {product.inventoryLabel}
      </div>
      <div className="hidden sm:block text-[11px] font-semibold text-slate-700">
        {formatPrice(product.price, currencySymbol)}
      </div>
      <div className="flex items-center gap-1.5 sm:justify-end">
        {!isTrashed && (
          <button
            type="button"
            onClick={() => onAction?.(product, 'edit')}
            className="rounded-full border border-slate-200 p-2 text-slate-500"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        )}
        <div className="relative">
          <button
            type="button"
            onClick={onActionMenuToggle}
            className="rounded-full border border-slate-200 p-2 text-slate-500"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button>
          {actionMenuOpen && (
            <div className="absolute right-0 top-10 z-20 w-52 rounded-2xl border border-slate-200 bg-white p-2 text-xs shadow-lg">
              {!isTrashed && (
                <button
                  type="button"
                  onClick={() => onAction?.(product, 'out_of_stock')}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 12h16" />
                    <path d="M12 4v16" />
                  </svg>
                  Mark out of stock
                </button>
              )}
              {!isTrashed && (
                <button
                  type="button"
                  onClick={() => onAction?.(product, 'feature')}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M12 3.5 14.8 9l6 .9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6L3.2 9l6-.9L12 3.5Z" />
                  </svg>
                  {product.isFeatured ? 'Unfeature product' : 'Feature product'}
                </button>
              )}
              {!isTrashed && (
                <button
                  type="button"
                  onClick={() => onAction?.(product, 'view')}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  View on site
                </button>
              )}
              {!isTrashed && product.status === 'draft' && (
                <button
                  type="button"
                  onClick={() => onAction?.(product, 'publish')}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                  Move to active
                </button>
              )}
              {!isTrashed && product.status !== 'draft' && (
                <button
                  type="button"
                  onClick={() => onAction?.(product, 'draft')}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 6h16" />
                    <path d="M4 12h10" />
                    <path d="M4 18h8" />
                  </svg>
                  Move to draft
                </button>
              )}
              {!isTrashed && (
                <button
                  type="button"
                  onClick={() => onAction?.(product, 'trash')}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M6 6l1 14h10l1-14" />
                  </svg>
                  Move to trash
                </button>
              )}
              {isTrashed && (
                <>
                  <button
                    type="button"
                    onClick={() => onAction?.(product, 'restore')}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M4 12a8 8 0 1 0 2.3-5.7" />
                      <path d="M4 4v6h6" />
                    </svg>
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => onAction?.(product, 'delete')}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-rose-600 hover:bg-rose-50"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M6 6l1 14h10l1-14" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                    </svg>
                    Delete permanently
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductListingTableRow;
