'use client';

import { useState } from 'react';
import { getSwatchStyle } from '../product/colorUtils.mjs';
import PriceRangeSlider from '../product/filters/PriceRangeSlider';

const EMPTY_SET = new Set();

/**
 * VendorStoreSidebar - A professional, boutique-style sidebar for brand storefronts.
 * Focuses on vendor-specific navigation and refined attribute filtering.
 */
export default function VendorStoreSidebar({
  categories,
  colors = [],
  sizes = [],
  priceBounds,
  priceRange,
  selectedCategories,
  selectedColors,
  selectedSizes,
  onToggleCategory,
  onToggleColor,
  onToggleSize,
  onPriceChange,
  onClear,
  currencyCode = 'USD',
  formatPrice,
}) {
  const [openSections, setOpenSections] = useState({
    categories: true,
    colors: true,
    sizes: true,
    price: true,
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside className="flex h-full flex-col bg-white pr-4 lg:pr-8">
      {/* Sidebar Header */}
      <div className="mb-8 flex items-center justify-between border-b border-gray-100 pb-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-900">
          Filter By
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition"
        >
          Reset All
        </button>
      </div>

      <div className="space-y-8">
        {/* Categories Accordion */}
        <section className="group">
          <button
            type="button"
            onClick={() => toggleSection('categories')}
            className="flex w-full items-center justify-between text-[11px] font-bold uppercase tracking-widest text-gray-900"
          >
            <span>Collections</span>
            <svg
              className={`h-3 w-3 transition-transform duration-300 ${openSections.categories ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {openSections.categories && (
            <ul className="mt-4 space-y-2.5">
              {categories.map((cat) => {
                const isActive = selectedCategories.has(cat);
                return (
                  <li key={cat}>
                    <button
                      type="button"
                      onClick={() => onToggleCategory(cat)}
                      className={`flex w-full items-center justify-between text-sm transition ${
                        isActive 
                          ? 'font-bold text-black translate-x-1' 
                          : 'text-gray-500 hover:text-gray-900 hover:translate-x-1'
                      }`}
                    >
                      <span>{cat}</span>
                      {isActive && (
                        <span className="h-1 w-1 rounded-full bg-black" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Color Palette */}
        <section>
          <button
            type="button"
            onClick={() => toggleSection('colors')}
            className="flex w-full items-center justify-between text-[11px] font-bold uppercase tracking-widest text-gray-900"
          >
            <span>Color Palette</span>
            <svg
              className={`h-3 w-3 transition-transform duration-300 ${openSections.colors ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {openSections.colors && (
            <div className="mt-5 grid grid-cols-5 gap-3">
              {colors.map((color) => {
                const isActive = selectedColors.has(color);
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onToggleColor(color)}
                    title={color}
                    className={`relative flex h-8 w-8 items-center justify-center rounded-full border transition ${
                      isActive ? 'border-black' : 'border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <span 
                      className="h-6 w-6 rounded-full" 
                      style={getSwatchStyle(color)} 
                    />
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-black" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Size Guide */}
        <section>
          <button
            type="button"
            onClick={() => toggleSection('sizes')}
            className="flex w-full items-center justify-between text-[11px] font-bold uppercase tracking-widest text-gray-900"
          >
            <span>Size Selection</span>
            <svg
              className={`h-3 w-3 transition-transform duration-300 ${openSections.sizes ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {openSections.sizes && (
            <div className="mt-5 flex flex-wrap gap-2">
              {sizes.map((size) => {
                const isActive = selectedSizes.has(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => onToggleSize(size)}
                    className={`flex h-9 min-w-[36px] items-center justify-center rounded-sm border px-2 text-[10px] font-bold uppercase tracking-widest transition ${
                      isActive 
                        ? 'border-black bg-black text-white' 
                        : 'border-gray-100 bg-white text-gray-900 hover:border-gray-400'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Price Range */}
        <section>
          <button
            type="button"
            onClick={() => toggleSection('price')}
            className="flex w-full items-center justify-between text-[11px] font-bold uppercase tracking-widest text-gray-900"
          >
            <span>Price Range</span>
            <svg
              className={`h-3 w-3 transition-transform duration-300 ${openSections.price ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {openSections.price && (
            <div className="mt-6 px-1">
              <PriceRangeSlider
                priceBounds={priceBounds}
                priceRange={priceRange}
                onPriceChange={onPriceChange}
                formatPrice={formatPrice}
              />
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
