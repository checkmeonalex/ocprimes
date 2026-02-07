import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { readStoredSiteInfo } from '../../../../utils/connector';
import {
  formatPrice,
  getCategoryLabel,
  getPrimaryImage,
  getProductStatusBadge,
  getStockMeta,
} from './productHelpers';
import ProductPreviewModal from './ProductPreviewModal';
import LoadingButton from '../../../../components/LoadingButton';
import { FILTER_OPTIONS, SORT_OPTIONS, applyProductFilters, applyProductSort } from './filters/productFilters';
import { deleteProduct, fetchProducts, updateProduct } from './functions/products';
import AdminSidebar from '@/components/AdminSidebar';
import { useAlerts } from '@/context/AlertContext';

const PRODUCT_PAGE_SIZE = 8;
const METRIC_DAYS = 7;

const STATUS_TABS = [
  { label: 'All Products', value: 'all', status: 'any' },
  { label: 'Active', value: 'publish', status: 'publish' },
  { label: 'Draft', value: 'draft', status: 'draft' },
  { label: 'Archived', value: 'archived', status: 'archived' },
];

const formatCount = (value) => {
  if (value === null || value === undefined) return '--';
  const num = Number(value);
  if (!Number.isFinite(num)) return '--';
  return num.toLocaleString();
};

const buildSparkPoints = (series, width = 120, height = 36) => {
  if (!Array.isArray(series) || !series.length) {
    const mid = height / 2;
    return `0,${mid} ${width},${mid}`;
  }
  const values = series.map((value) => (Number.isFinite(Number(value)) ? Number(value) : 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  return values
    .map((value, index) => {
      const x = step * index;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
};

const formatDelta = (current, previous) => {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return { label: 'No prior data', tone: 'text-slate-400' };
  }
  const diff = current - previous;
  const percent = (diff / previous) * 100;
  const sign = diff >= 0 ? '+' : '';
  return {
    label: `${sign}${percent.toFixed(0)}%`,
    tone: diff >= 0 ? 'text-emerald-600' : 'text-rose-600',
  };
};

function WooCommerceProductsPage() {
  const { confirmAlert } = useAlerts();
  const [siteInfo, setSiteInfo] = useState(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [metrics, setMetrics] = useState({
    revenue: null,
    sold: null,
    revenueSeries: [],
    soldSeries: [],
    previousRevenue: null,
    previousSold: null,
  });
  const [recentSoldProducts, setRecentSoldProducts] = useState([]);
  const [promoView, setPromoView] = useState('ads');
  const [reviews, setReviews] = useState([]);
  const [statusTab, setStatusTab] = useState('all');
  const [filterValue, setFilterValue] = useState('all');
  const [sortValue, setSortValue] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isMetricsLoading, setIsMetricsLoading] = useState(false);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [error, setError] = useState('');
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [overviewReveal, setOverviewReveal] = useState(false);
  const loadMoreRef = useRef(null);
  const [previewProduct, setPreviewProduct] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const actionMenuRef = useRef(null);
  const selectAllRef = useRef(null);
  const pendingScrollYRef = useRef(null);

  useEffect(() => {
    setSiteInfo(readStoredSiteInfo());
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === 'agentic_wp_site') {
        setSiteInfo(readStoredSiteInfo());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const loadSummary = useCallback(async () => {
    setIsSummaryLoading(true);
    try {
      setSummary({
        total_products: products.length,
        live_products: products.filter((product) => product.status === 'publish').length,
        low_stock_threshold: 3,
      });
    } finally {
      setIsSummaryLoading(false);
    }
  }, [products]);

  const loadMetrics = useCallback(async () => {
    setIsMetricsLoading(true);
    try {
      setRecentSoldProducts([]);
      setMetrics({
        revenue: 0,
        sold: 0,
        revenueSeries: Array(METRIC_DAYS).fill(0),
        soldSeries: Array(METRIC_DAYS).fill(0),
        previousRevenue: 0,
        previousSold: 0,
      });
    } finally {
      setIsMetricsLoading(false);
    }
  }, []);

  const loadProducts = useCallback(
    async (requestedPage, replace = false) => {
      if (!replace) {
        pendingScrollYRef.current = window.scrollY;
      }
      setIsLoading(true);
      setError('');
      try {
        const activeStatus = STATUS_TABS.find((tab) => tab.value === statusTab)?.status;
        const payload = await fetchProducts({
          page: requestedPage,
          perPage: PRODUCT_PAGE_SIZE,
          search: searchTerm.trim(),
          status: activeStatus === 'any' ? '' : activeStatus || '',
        });
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const normalized = items.map((item) => ({
          ...item,
          categories: item.admin_categories || item.categories || [],
          tags: item.admin_tags || item.tags || [],
          brands: item.admin_brands || item.brands || [],
          images: item.images || [],
          image_url: item.images?.[0]?.url || item.image_url || '',
          stock_status:
            Number(item.stock_quantity) <= 0 ? 'outofstock' : item.stock_status || 'instock',
        }));
        setProducts((prev) => {
          if (replace) return normalized;
          const combined = [...prev, ...normalized];
          const seen = new Set();
          return combined.filter((item) => {
            const id = item?.id;
            if (id === undefined || id === null) return true;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
        });
        setPage(requestedPage);
        setPages(payload?.pages ? Number(payload.pages) : 1);
        setSummary((prev) => ({
          ...prev,
          total_products: payload?.total_count ?? normalized.length,
          live_products: normalized.filter((product) => product.status === 'publish').length,
          low_stock_threshold: prev?.low_stock_threshold || 3,
        }));
      } catch (err) {
        setError(err?.message || 'Unable to load products.');
      } finally {
        setIsLoading(false);
      }
    },
    [searchTerm, statusTab],
  );

  const loadReviews = useCallback(async () => {
    setIsReviewsLoading(true);
    try {
      setReviews([]);
    } finally {
      setIsReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
    loadMetrics();
    loadReviews();
  }, [loadMetrics, loadReviews, loadSummary]);

  useEffect(() => {
    if (!overviewExpanded) {
      setOverviewReveal(false);
      return;
    }
    const timer = setTimeout(() => setOverviewReveal(true), 30);
    return () => clearTimeout(timer);
  }, [overviewExpanded]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setProducts([]);
      setPage(1);
      setPages(1);
      loadProducts(1, true);
    }, 300);
    return () => clearTimeout(handle);
  }, [loadProducts, searchTerm, statusTab]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return () => {};
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (isLoading) return;
        if (page >= pages) return;
        loadProducts(page + 1);
      },
      { rootMargin: '120px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isLoading, loadProducts, page, pages]);

  useEffect(() => {
    const handleClick = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActionMenuId(null);
      }
      if (showFilterMenu) {
        setShowFilterMenu(false);
      }
      if (showSortMenu) {
        setShowSortMenu(false);
      }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [showFilterMenu, showSortMenu]);

  useEffect(() => {
    setSelectedProductIds((prev) =>
      prev.filter((id) => products.some((product) => String(product.id) === String(id))),
    );
  }, [products]);

  useEffect(() => {
    if (pendingScrollYRef.current === null) return;
    const target = pendingScrollYRef.current;
    pendingScrollYRef.current = null;
    requestAnimationFrame(() => {
      window.scrollTo(0, target);
    });
  }, [products]);


  const productLookup = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      if (product?.id) {
        map.set(String(product.id), product);
      }
    });
    return map;
  }, [products]);

  const handleProductAction = useCallback(
    async (product, action) => {
      try {
        const updates = {};
        if (action === 'out_of_stock') updates.stock_quantity = 0;
        if (action === 'draft') updates.status = 'draft';
        if (action === 'delete') {
          await deleteProduct({ id: product.id });
          setProducts((prev) => prev.filter((item) => item.id !== product.id));
        } else {
          const updated = await updateProduct({
            id: product.id,
            updates,
          });
          setProducts((prev) =>
            prev.map((item) => (item.id === product.id ? { ...item, ...updated } : item)),
          );
        }
      } catch (err) {
        setError(err?.message || 'Unable to update product.');
      } finally {
        setActionMenuId(null);
      }
    },
    [],
  );

  const handleBulkAction = useCallback(
    async (action) => {
      if (!selectedProductIds.length || bulkAction) return;
      if (action === 'delete') {
        const confirmDelete = await confirmAlert({
          type: 'warning',
          title: 'Delete selected products?',
          message: `Delete ${selectedProductIds.length} product${selectedProductIds.length === 1 ? '' : 's'} permanently?`,
          confirmLabel: 'Allow',
          cancelLabel: 'Deny',
        });
        if (!confirmDelete) return;
      }
      setBulkAction(action);
      setError('');
      try {
        for (const id of selectedProductIds) {
          const product = productLookup.get(String(id));
          if (!product) continue;
          const updates = {};
          if (action === 'out_of_stock') updates.stock_quantity = 0;
          if (action === 'draft') updates.status = 'draft';
          if (action === 'delete') {
            await deleteProduct({ id: product.id });
            setProducts((prev) => prev.filter((item) => item.id !== product.id));
          } else {
            const updated = await updateProduct({
              id: product.id,
              updates,
            });
            setProducts((prev) =>
              prev.map((item) => (item.id === product.id ? { ...item, ...updated } : item)),
            );
          }
        }
        setSelectedProductIds([]);
      } catch (err) {
        setError(err?.message || 'Unable to update products.');
      } finally {
        setBulkAction('');
      }
    },
    [bulkAction, confirmAlert, productLookup, selectedProductIds],
  );

  const siteName = hasHydrated ? siteInfo?.name || 'Store' : 'Store';
  const siteLogo = hasHydrated ? siteInfo?.logoUrl || '' : '';
  const lowStockThreshold = summary?.low_stock_threshold || 3;
  const promotedProducts = products.slice(0, 4);
  const currencySymbol = useMemo(() => {
    const fromProducts = products.find((product) => product?.currency_symbol)?.currency_symbol;
    return fromProducts || '';
  }, [products]);
  const resolvedRecentSold = useMemo(() => {
    return recentSoldProducts.map((item) => {
      const match = item.product_id ? productLookup.get(String(item.product_id)) : null;
      return {
        ...item,
        imageUrl: match ? getPrimaryImage(match) : '',
        category: match ? getCategoryLabel(match) : '',
        currency_symbol: match?.currency_symbol || currencySymbol || '',
      };
    });
  }, [currencySymbol, productLookup, recentSoldProducts]);
  const totalSeries = useMemo(() => {
    const total = Number(summary?.total_products);
    if (!Number.isFinite(total)) {
      return [];
    }
    return Array(METRIC_DAYS).fill(total);
  }, [summary]);
  const liveSeries = useMemo(() => {
    const live = Number(summary?.live_products);
    if (!Number.isFinite(live)) {
      return [];
    }
    return Array(METRIC_DAYS).fill(live);
  }, [summary]);
  const revenueDelta = formatDelta(metrics.revenue, metrics.previousRevenue);
  const soldDelta = formatDelta(metrics.sold, metrics.previousSold);
  const hasMore = page < pages;
  const handleOpenPreview = (productItem) => {
    setPreviewProduct(productItem || null);
    setIsPreviewOpen(true);
  };
  const handleSavedProduct = (saved) => {
    if (!saved) return;
    setProducts((prev) => {
      const exists = prev.find((item) => String(item?.id) === String(saved?.id));
      if (exists) {
        return prev.map((item) => (String(item?.id) === String(saved?.id) ? saved : item));
      }
      return [saved, ...prev];
    });
  };

  const filteredProducts = applyProductFilters(products, filterValue, lowStockThreshold);
  const visibleProducts = applyProductSort(filteredProducts, sortValue);
  const visibleIds = useMemo(
    () => visibleProducts.map((product) => String(product.id)),
    [visibleProducts],
  );
  const selectedVisibleCount = useMemo(
    () => visibleIds.filter((id) => selectedProductIds.includes(id)).length,
    [selectedProductIds, visibleIds],
  );
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const hasSelection = selectedProductIds.length > 0;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = !allVisibleSelected && selectedVisibleCount > 0;
    }
  }, [allVisibleSelected, selectedVisibleCount]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Products</p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">Products</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Track inventory, pricing, and product health in one place.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="6" />
                    <path d="m15.5 15.5 4 4" />
                  </svg>
                  <input
                    className="w-56 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                    placeholder="Search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenPreview(null)}
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm"
                >
                  Add Product
                </button>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                  {siteLogo ? (
                    <img src={siteLogo} alt={siteName} className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <span className="h-7 w-7 rounded-full bg-slate-200" />
                  )}
                  {siteName}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 min-[266px]:grid-cols-2 md:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50 p-3 shadow-sm sm:p-4">
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 sm:text-xs">Total Products</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900 sm:mt-3 sm:text-2xl">
                      {isSummaryLoading ? '...' : formatCount(summary?.total_products)}
                    </p>
                  </div>
                  <svg viewBox="0 0 120 36" className="h-8 w-20 text-slate-400 sm:h-10 sm:w-24">
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={buildSparkPoints(totalSeries)}
                    />
                  </svg>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 sm:mt-3 sm:text-[11px]">Catalog size</div>
              </div>

              <div
                className={`rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-3 shadow-sm transition-opacity duration-300 sm:p-4 ${
                  overviewExpanded ? 'block' : 'hidden'
                } min-[266px]:block ${overviewExpanded && !overviewReveal ? 'opacity-0' : 'opacity-100'}`}
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 sm:text-xs">Live Products</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900 sm:mt-3 sm:text-2xl">
                      {isSummaryLoading ? '...' : formatCount(summary?.live_products)}
                    </p>
                  </div>
                  <svg viewBox="0 0 120 36" className="h-8 w-20 text-blue-400 sm:h-10 sm:w-24">
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={buildSparkPoints(liveSeries)}
                    />
                  </svg>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 sm:mt-3 sm:text-[11px]">Published products</div>
              </div>

              <div
                className={`rounded-3xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-3 shadow-sm transition-opacity duration-300 sm:p-4 ${
                  overviewExpanded ? 'block' : 'hidden'
                } min-[266px]:block ${overviewExpanded && !overviewReveal ? 'opacity-0' : 'opacity-100'}`}
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 sm:text-xs">Product Revenue</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900 sm:mt-3 sm:text-2xl">
                      {isMetricsLoading ? '...' : formatPrice(metrics.revenue, currencySymbol)}
                    </p>
                  </div>
                  <svg viewBox="0 0 120 36" className="h-8 w-20 text-emerald-500 sm:h-10 sm:w-24">
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={buildSparkPoints(metrics.revenueSeries)}
                    />
                  </svg>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400 sm:mt-3 sm:gap-2 sm:text-[11px]">
                  <span className={`font-semibold ${revenueDelta.tone}`}>{revenueDelta.label}</span>
                  <span>vs last 7 days</span>
                </div>
              </div>

              <div
                className={`rounded-3xl border border-slate-200 bg-gradient-to-br from-amber-50 to-white p-3 shadow-sm transition-opacity duration-300 sm:p-4 ${
                  overviewExpanded ? 'block' : 'hidden'
                } min-[266px]:block ${overviewExpanded && !overviewReveal ? 'opacity-0' : 'opacity-100'}`}
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 sm:text-xs">Products Sold</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900 sm:mt-3 sm:text-2xl">
                      {isMetricsLoading ? '...' : formatCount(metrics.sold)}
                    </p>
                  </div>
                  <svg viewBox="0 0 120 36" className="h-8 w-20 text-amber-500 sm:h-10 sm:w-24">
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={buildSparkPoints(metrics.soldSeries)}
                    />
                  </svg>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400 sm:mt-3 sm:gap-2 sm:text-[11px]">
                  <span className={`font-semibold ${soldDelta.tone}`}>{soldDelta.label}</span>
                  <span>vs last 7 days</span>
                </div>
              </div>

            </div>
            {!overviewExpanded && (
              <div className="mt-3 flex justify-center min-[266px]:hidden">
                <button
                  type="button"
                  onClick={() => setOverviewExpanded(true)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-1 text-[11px] font-semibold text-slate-500 shadow-sm"
                >
                  View all
                </button>
              </div>
            )}

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,_1fr)_320px]">
              <div className="space-y-6">
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
                          <LoadingButton
                            type="button"
                            onClick={() => handleBulkAction('out_of_stock')}
                            isLoading={bulkAction === 'out_of_stock'}
                            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
                          >
                            Mark out of stock
                          </LoadingButton>
                          <LoadingButton
                            type="button"
                            onClick={() => handleBulkAction('draft')}
                            isLoading={bulkAction === 'draft'}
                            className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-60"
                          >
                            Move to draft
                          </LoadingButton>
                          <LoadingButton
                            type="button"
                            onClick={() => handleBulkAction('delete')}
                            isLoading={bulkAction === 'delete'}
                            className="rounded-full bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 disabled:opacity-60"
                          >
                            Delete permanent
                          </LoadingButton>
                        </>
                      ) : (
                        STATUS_TABS.map((tab) => (
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
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 6h16" />
                          <path d="M7 12h10" />
                          <path d="M10 18h4" />
                        </svg>
                        Filter
                      </button>
                      {showFilterMenu && (
                        <div className="absolute right-24 top-12 z-20 w-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                          {FILTER_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setFilterValue(option.value);
                                setShowFilterMenu(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${
                                filterValue === option.value ? 'bg-slate-100 text-slate-700' : 'text-slate-500'
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
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 7h18" />
                          <path d="M6 12h12" />
                          <path d="M9 17h6" />
                        </svg>
                        Sort
                      </button>
                      {showSortMenu && (
                        <div className="absolute right-0 top-12 z-20 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                          {SORT_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setSortValue(option.value);
                                setShowSortMenu(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${
                                sortValue === option.value ? 'bg-slate-100 text-slate-700' : 'text-slate-500'
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
                          onChange={() => {
                            if (allVisibleSelected) {
                              setSelectedProductIds((prev) =>
                                prev.filter((id) => !visibleIds.includes(id)),
                              );
                            } else {
                              setSelectedProductIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
                            }
                          }}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          aria-label="Select all products"
                        />
                      </span>
                      <span>Product</span>
                      <span>Stock</span>
                      <span>Inventory</span>
                      <span>Price</span>
                      <span className="text-right">Actions</span>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {isLoading && !products.length &&
                      Array.from({ length: PRODUCT_PAGE_SIZE }).map((_, index) => (
                        <div
                          key={`product-skeleton-${index}`}
                          className="flex animate-pulse flex-col gap-3 px-6 py-4 sm:grid sm:grid-cols-[minmax(32px,_0.2fr)_minmax(140px,_1.6fr)_minmax(90px,_0.8fr)_minmax(80px,_0.6fr)_minmax(90px,_0.7fr)_minmax(64px,_0.4fr)] sm:items-center sm:gap-3"
                        >
                          <div className="hidden sm:block">
                            <span className="block h-4 w-4 rounded-sm bg-slate-200" />
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="h-12 w-12 rounded-2xl bg-slate-200" />
                            <div className="space-y-2">
                              <span className="block h-3 w-28 rounded-full bg-slate-200" />
                              <span className="block h-3 w-20 rounded-full bg-slate-100" />
                            </div>
                          </div>
                          <div className="hidden sm:block">
                            <span className="block h-6 w-20 rounded-full bg-slate-200" />
                          </div>
                          <div className="hidden sm:block">
                            <span className="block h-3 w-16 rounded-full bg-slate-200" />
                          </div>
                          <div className="hidden sm:block">
                            <span className="block h-3 w-14 rounded-full bg-slate-200" />
                          </div>
                          <div className="flex items-center gap-2 sm:justify-end">
                            <span className="h-8 w-8 rounded-full bg-slate-200" />
                            <span className="h-8 w-8 rounded-full bg-slate-200" />
                          </div>
                        </div>
                      ))}
                    {visibleProducts.map((product) => {
                      const imageUrl = getPrimaryImage(product);
                      const stockMeta = getStockMeta(product, lowStockThreshold);
                      const statusBadge = getProductStatusBadge(product.status);
                      return (
                        <div
                          key={product.id}
                          className="flex flex-col gap-3 px-6 py-4 text-sm sm:grid sm:grid-cols-[minmax(32px,_0.2fr)_minmax(140px,_1.6fr)_minmax(90px,_0.8fr)_minmax(80px,_0.6fr)_minmax(90px,_0.7fr)_minmax(64px,_0.4fr)] sm:items-center sm:gap-3"
                        >
                          <div className="hidden sm:flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedProductIds.includes(String(product.id))}
                              onChange={() =>
                                setSelectedProductIds((prev) =>
                                  prev.includes(String(product.id))
                                    ? prev.filter((id) => id !== String(product.id))
                                    : [...prev, String(product.id)],
                                )
                              }
                              className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                              aria-label={`Select ${product.name}`}
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedProductIds.includes(String(product.id))}
                              onChange={() =>
                                setSelectedProductIds((prev) =>
                                  prev.includes(String(product.id))
                                    ? prev.filter((id) => id !== String(product.id))
                                    : [...prev, String(product.id)],
                                )
                              }
                              className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 sm:hidden"
                              aria-label={`Select ${product.name}`}
                            />
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={product.name}
                                className="h-12 w-12 rounded-2xl object-cover"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="h-12 w-12 rounded-2xl bg-slate-200" />
                            )}
                            <div>
                              <p
                                title={product.name || ''}
                                className="max-w-[180px] truncate text-sm font-semibold text-slate-700 sm:max-w-[280px]"
                              >
                                {product.name}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                <span>{getCategoryLabel(product)}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge.tone}`}>
                                  {statusBadge.label}
                                </span>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:hidden">
                                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${stockMeta.tone}`}>
                                  {stockMeta.label}
                                </span>
                                <span>Inventory {stockMeta.inventoryLabel}</span>
                                <span>{formatPrice(product.price, product.currency_symbol)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="hidden sm:block">
                            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${stockMeta.tone}`}>
                              {stockMeta.label}
                            </span>
                          </div>
                          <div className="hidden sm:block text-[11px] font-semibold text-slate-600">
                            {stockMeta.inventoryLabel}
                          </div>
                          <div className="hidden sm:block text-[11px] font-semibold text-slate-700">
                            {formatPrice(product.price, product.currency_symbol)}
                          </div>
                          <div className="flex items-center gap-1.5 sm:justify-end">
                            <button
                              type="button"
                              onClick={() => handleOpenPreview(product)}
                              className="rounded-full border border-slate-200 p-2 text-slate-500"
                            >
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                            </button>
                            <div className="relative" ref={actionMenuId === product.id ? actionMenuRef : null}>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setActionMenuId((prev) => (prev === product.id ? null : product.id));
                                }}
                                className="rounded-full border border-slate-200 p-2 text-slate-500"
                              >
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="19" cy="12" r="1" />
                                <circle cx="5" cy="12" r="1" />
                              </svg>
                              </button>
                              {actionMenuId === product.id && (
                                <div className="absolute right-0 top-10 z-20 w-52 rounded-2xl border border-slate-200 bg-white p-2 text-xs shadow-lg">
                                  <button
                                    type="button"
                                    onClick={() => handleProductAction(product, 'out_of_stock')}
                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100"
                                  >
                                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M4 12h16" />
                                      <path d="M12 4v16" />
                                    </svg>
                                    Mark out of stock
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleProductAction(product, 'feature')}
                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100"
                                  >
                                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                                      <path d="M12 3.5 14.8 9l6 .9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6L3.2 9l6-.9L12 3.5Z" />
                                    </svg>
                                    Feature product
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleProductAction(product, 'add_to_menu')}
                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100"
                                  >
                                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M4 6h16" />
                                      <path d="M4 12h16" />
                                      <path d="M4 18h10" />
                                    </svg>
                                    Add to menu
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleProductAction(product, 'draft')}
                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100"
                                  >
                                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M4 6h16" />
                                      <path d="M4 12h10" />
                                      <path d="M4 18h8" />
                                    </svg>
                                    Move to draft
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleProductAction(product, 'delete')}
                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-rose-600 hover:bg-rose-50"
                                  >
                                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M3 6h18" />
                                      <path d="M8 6V4h8v2" />
                                      <path d="M6 6l1 14h10l1-14" />
                                      <path d="M10 11v6" />
                                      <path d="M14 11v6" />
                                    </svg>
                                    Delete permanently
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {!products.length && !isLoading && (
                      <div className="px-6 py-10 text-center text-sm text-slate-400">No products found.</div>
                    )}
                  </div>

                  {error && <p className="px-6 py-4 text-xs text-rose-500">{error}</p>}

                  <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 text-xs text-slate-400">
                    <span>
                      Showing {(page - 1) * PRODUCT_PAGE_SIZE + products.length} of{' '}
                      {summary?.total_products ? formatCount(summary.total_products) : formatCount(products.length)} products
                    </span>
                    {hasMore && (
                      <LoadingButton
                        type="button"
                        onClick={() => loadProducts(page + 1)}
                        isLoading={isLoading}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 disabled:opacity-50"
                      >
                        Load more
                      </LoadingButton>
                    )}
                  </div>
                  <div ref={loadMoreRef} className="h-1 w-full" />
                </div>
              </div>

              <div className="space-y-6">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Recently Sold Products</p>
                      <p className="text-[11px] text-slate-400">
                        {promoView === 'ads'
                          ? 'Ad placement until you switch to sales.'
                          : 'Latest sold items from your store.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center rounded-full border border-slate-200 bg-slate-50 p-1">
                        <button
                          type="button"
                          onClick={() => setPromoView('ads')}
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                            promoView === 'ads' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400'
                          }`}
                        >
                          Ads
                        </button>
                        <button
                          type="button"
                          onClick={() => setPromoView('sold')}
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                            promoView === 'sold' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400'
                          }`}
                        >
                          Sold
                        </button>
                      </div>
                      <button type="button" className="text-xs font-semibold text-slate-400">
                        {promoView === 'ads' ? 'Hide ads' : 'All Recent Sales'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {promoView === 'ads' && (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 text-[11px] text-slate-400">
                        Ad placement placeholder. Switch to Sold when you want real sales data.
                      </div>
                    )}
                    {promoView === 'ads' &&
                      promotedProducts.map((product) => (
                        <div key={product.id} className="flex items-center gap-3">
                          {getPrimaryImage(product) ? (
                            <img
                              src={getPrimaryImage(product)}
                              alt={product.name}
                              className="h-10 w-10 rounded-2xl object-cover"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="h-10 w-10 rounded-2xl bg-slate-200" />
                          )}
                          <div className="flex-1">
                            <p
                              title={product.name || ''}
                              className="truncate text-xs font-semibold text-slate-700"
                            >
                              {product.name}
                            </p>
                            <p className="text-[11px] text-slate-400">{getCategoryLabel(product)}</p>
                          </div>
                          <p className="text-xs font-semibold text-slate-700">
                            {formatPrice(product.price, product.currency_symbol)}
                          </p>
                        </div>
                      ))}

                    {promoView === 'sold' &&
                      resolvedRecentSold.map((item) => (
                        <div key={item.product_id || item.name} className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-10 w-10 rounded-2xl object-cover"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="h-10 w-10 rounded-2xl bg-slate-200" />
                          )}
                          <div className="flex-1">
                            <p
                              title={item.name || ''}
                              className="truncate text-xs font-semibold text-slate-700"
                            >
                              {item.name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {item.category ? item.category : `Qty ${item.quantity}`}
                            </p>
                          </div>
                          <p className="text-xs font-semibold text-slate-700">
                            {item.total !== '' ? formatPrice(item.total, item.currency_symbol) : '--'}
                          </p>
                        </div>
                      ))}

                    {promoView === 'ads' && !promotedProducts.length && (
                      <p className="text-xs text-slate-400">No promoted products yet.</p>
                    )}
                    {promoView === 'sold' && !resolvedRecentSold.length && !isMetricsLoading && (
                      <p className="text-xs text-slate-400">No recent sales yet.</p>
                    )}
                    {promoView === 'sold' && isMetricsLoading && (
                      <p className="text-xs text-slate-400">Loading recent sales...</p>
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Ratings and Reviews</p>
                    <button type="button" className="text-xs font-semibold text-slate-400">
                      All Reviews
                    </button>
                  </div>
                  <div className="mt-4 space-y-4">
                    {isReviewsLoading &&
                      Array.from({ length: 3 }).map((_, index) => (
                        <div key={`review-skeleton-${index}`} className="flex animate-pulse items-start gap-3">
                          <span className="h-9 w-9 rounded-full bg-slate-200" />
                          <div className="flex-1 space-y-2">
                            <span className="block h-3 w-24 rounded-full bg-slate-200" />
                            <span className="block h-3 w-full rounded-full bg-slate-100" />
                          </div>
                        </div>
                      ))}
                    {!isReviewsLoading && reviews.map((review) => (
                      <div key={review.id} className="flex items-start gap-3">
                        {review.author_avatar_url ? (
                          <img
                            src={review.author_avatar_url}
                            alt={review.author_name}
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <span className="h-9 w-9 rounded-full bg-slate-200" />
                        )}
                        <div>
                          <p className="text-xs font-semibold text-slate-700">{review.author_name}</p>
                          <p className="text-[11px] text-slate-400">{review.excerpt}</p>
                          <p className="text-[11px] text-slate-300">{review.post_title}</p>
                        </div>
                      </div>
                    ))}
                    {!isReviewsLoading && !reviews.length && (
                      <p className="text-xs text-slate-400">No reviews yet.</p>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </main>
      </div>
      <ProductPreviewModal
        isOpen={isPreviewOpen}
        product={previewProduct}
        onClose={() => setIsPreviewOpen(false)}
        onExpand={() => {
          const target = previewProduct?.id
            ? `/backend/admin/products/${previewProduct.id}`
            : '/backend/admin/products/new';
          window.open(target, '_blank', 'noopener,noreferrer');
        }}
        onSaved={handleSavedProduct}
      />
    </div>
  );
}

export default WooCommerceProductsPage;
