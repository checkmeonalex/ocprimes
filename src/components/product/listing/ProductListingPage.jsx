'use client';
import { useMemo, useState } from 'react';
import ProductListingHeader from './ProductListingHeader';
import ProductListingOverview from './ProductListingOverview';
import ProductListingSidebar from './ProductListingSidebar';
import ProductListingTable from './ProductListingTable';
import mockProductListingData from './mockProductListingData.mjs';
import { normalizeProductListingData } from './productListingHelpers.mjs';

const ProductListingSideNav = () => (
  <aside className="sticky top-0 hidden h-screen w-20 flex-col items-center gap-4 border-r border-slate-100 bg-white py-6 sm:flex">
    <div className="h-10 w-10 rounded-2xl bg-slate-100" />
    <div className="h-10 w-10 rounded-2xl bg-slate-100" />
    <div className="h-10 w-10 rounded-2xl bg-slate-200" />
    <div className="h-10 w-10 rounded-2xl bg-slate-100" />
  </aside>
);

const ProductListingPage = ({ data }) => {
  const normalizedData = useMemo(
    () => normalizeProductListingData(data, mockProductListingData),
    [data]
  );
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [promoView, setPromoView] = useState('ads');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <ProductListingSideNav />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <ProductListingHeader
              eyebrow={normalizedData.header.eyebrow}
              title={normalizedData.header.title}
              subtitle={normalizedData.header.subtitle}
              searchPlaceholder={normalizedData.header.searchPlaceholder}
              primaryActionLabel={normalizedData.header.primaryActionLabel}
              assistantLabel={normalizedData.header.assistantLabel}
            />

            <ProductListingOverview
              cards={normalizedData.overviewCards}
              overviewExpanded={overviewExpanded}
              onExpand={() => setOverviewExpanded(true)}
            />

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,_1fr)_320px]">
              <div className="space-y-6">
                <ProductListingTable
                  statusTabs={normalizedData.statusTabs}
                  filterOptions={normalizedData.filterOptions}
                  sortOptions={normalizedData.sortOptions}
                  products={normalizedData.products}
                  pagination={normalizedData.pagination}
                  notices={normalizedData.notices}
                />
              </div>
              <ProductListingSidebar
                promoView={promoView}
                onPromoChange={setPromoView}
                promotedProducts={normalizedData.promotedProducts}
                recentSoldProducts={normalizedData.recentSoldProducts}
                reviews={normalizedData.reviews}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProductListingPage;
