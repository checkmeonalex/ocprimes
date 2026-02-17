'use client';
import { useMemo, useState } from 'react';

const ProductBrandSelector = ({
  selectedBrands = [],
  onSelectBrands = () => {},
  brands = [],
  isLoading = false,
  errorMessage = '',
  onOpen = () => {},
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredBrands = useMemo(() => {
    if (!searchTerm) return brands;
    const term = searchTerm.toLowerCase();
    return brands.filter((brand) =>
      (brand.name || '').toLowerCase().includes(term) ||
      (brand.slug || '').toLowerCase().includes(term)
    );
  }, [brands, searchTerm]);

  const toggleBrand = (brandId) => {
    const newSelection = selectedBrands.includes(brandId)
      ? selectedBrands.filter((id) => id !== brandId)
      : [...selectedBrands, brandId];
    onSelectBrands(newSelection);
  };

  const isBrandSelected = (brandId) => selectedBrands.includes(brandId);

  const selectedBrandNames = useMemo(() => {
    return brands
      .filter((brand) => selectedBrands.includes(brand.id))
      .map((brand) => brand.name)
      .join(', ');
  }, [selectedBrands, brands]);

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
        <div className="flex items-center justify-between">
          <span className={selectedBrands.length > 0 ? 'text-slate-900' : 'text-slate-500'}>
            {selectedBrands.length > 0
              ? `${selectedBrands.length} brand${selectedBrands.length !== 1 ? 's' : ''} selected`
              : 'Select brands...'}
          </span>
          <span className="text-slate-500 truncate max-w-[50%]">
            {selectedBrandNames || 'None selected'}
          </span>
          <svg
            className={`ml-2 h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
            aria-label="Close brands"
          />
          <div className="relative z-10 w-full max-h-[86vh] overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:max-h-[calc(100vh-48px)] sm:max-w-2xl sm:rounded-[28px] sm:p-5">
            <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-200 sm:hidden" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Brands
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">Select product brands</p>
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
                  placeholder="Search brands..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 py-2 pl-8 pr-3 text-xs text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
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
              </div>
            </div>

            {isLoading && (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                  Loading brands...
                </span>
              </div>
            )}

            {!isLoading && errorMessage && (
              <div className="mt-4 rounded-2xl border border-dashed border-rose-200 bg-rose-50/60 px-3 py-6 text-center text-xs text-rose-500">
                {errorMessage}
              </div>
            )}

            {!isLoading && !errorMessage && (
              <div className="mt-4 space-y-1">
                {filteredBrands.map((brand) => (
                  <label
                    key={brand.id}
                    className="flex items-center rounded-2xl px-3 py-2 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={isBrandSelected(brand.id)}
                      onChange={() => toggleBrand(brand.id)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="ml-2 block truncate text-xs font-medium text-slate-700">
                      {brand.name}
                    </span>
                    {brand.count !== undefined && (
                      <span className="ml-auto text-xs text-slate-500">
                        {brand.count}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}

            {!isLoading && !errorMessage && filteredBrands.length === 0 && searchTerm && (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
                No brands found for "{searchTerm}"
              </div>
            )}

            {!isLoading && !errorMessage && brands.length === 0 && !searchTerm && (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
                No brands available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductBrandSelector;
