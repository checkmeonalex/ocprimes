import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { createProduct, deleteProduct, fetchProducts, updateProduct } from './functions/products';
import AdminSidebar from '@/components/AdminSidebar';
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader';
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
    tone: diff >= 0 ? 'text-zinc-700' : 'text-zinc-500',
  };
};

const getStorefrontOrigin = () => {
  if (typeof window === 'undefined') return '';
  return window.location?.origin || '';
};

const buildPublicProductUrl = (product) => {
  const status = String(product?.status || '').toLowerCase();
  const isLive = status === 'publish';
  if (isLive && product?.permalink) return product.permalink;
  if (!isLive && product?.preview_link) return product.preview_link;
  const baseUrl = getStorefrontOrigin();
  if (!baseUrl) return '';
  if (product?.slug) {
    const base = `${baseUrl.replace(/\/+$/, '')}/product/${product.slug}`;
    return isLive ? base : `${base}?preview=1`;
  }
  if (product?.id) {
    const base = `${baseUrl.replace(/\/+$/, '')}/?post_type=product&p=${product.id}`;
    return isLive ? base : `${base}&preview=1`;
  }
  return '';
};

const collectRelationIds = (items = []) =>
  Array.from(
    new Set(
      (items || [])
        .map((item) => {
          if (item && typeof item === 'object') {
            return item.id ?? item.term_id ?? item.category_id ?? item.wp_id ?? '';
          }
          return item;
        })
        .map((value) => String(value || '').trim())
        .filter(Boolean),
    ),
  );

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function WooCommerceProductsPage() {
  const router = useRouter();
  const { confirmAlert, pushAlert } = useAlerts();
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
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [overviewReveal, setOverviewReveal] = useState(false);
  const loadMoreRef = useRef(null);
  const [previewProduct, setPreviewProduct] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [duplicatingProductId, setDuplicatingProductId] = useState(null);
  const [duplicateProgressMessage, setDuplicateProgressMessage] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showMobileBulkMenu, setShowMobileBulkMenu] = useState(false);
  const [sortSheetOffset, setSortSheetOffset] = useState(0);
  const [isSortSheetDragging, setIsSortSheetDragging] = useState(false);
  const [actionSheetOffset, setActionSheetOffset] = useState(0);
  const [isActionSheetDragging, setIsActionSheetDragging] = useState(false);
  const actionMenuRef = useRef(null);
  const sortSheetDragRef = useRef({ startY: 0, dragging: false });
  const actionSheetDragRef = useRef({ startY: 0, dragging: false });
  const sortSheetCloseTimerRef = useRef(null);
  const actionSheetCloseTimerRef = useRef(null);
  const selectAllRef = useRef(null);
  const pendingScrollYRef = useRef(null);
  const notifyError = useCallback(
    (message) => {
      if (!message) return;
      pushAlert({
        type: 'error',
        title: 'Request failed',
        message,
      });
    },
    [pushAlert],
  );

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
        notifyError(err?.message || 'Unable to load products.');
      } finally {
        setIsLoading(false);
      }
    },
    [notifyError, searchTerm, statusTab],
  );

  useEffect(() => {
    loadSummary();
    loadMetrics();
  }, [loadMetrics, loadSummary]);

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
      if (showMobileBulkMenu) {
        setShowMobileBulkMenu(false);
      }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [showFilterMenu, showMobileBulkMenu, showSortMenu]);

  useEffect(() => {
    return () => {
      if (sortSheetCloseTimerRef.current) {
        window.clearTimeout(sortSheetCloseTimerRef.current);
      }
      if (actionSheetCloseTimerRef.current) {
        window.clearTimeout(actionSheetCloseTimerRef.current);
      }
    };
  }, []);

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
        notifyError(err?.message || 'Unable to update product.');
      } finally {
        setActionMenuId(null);
      }
    },
    [notifyError],
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
        notifyError(err?.message || 'Unable to update products.');
      } finally {
        setBulkAction('');
      }
    },
    [bulkAction, confirmAlert, notifyError, productLookup, selectedProductIds],
  );

  const siteName = hasHydrated ? siteInfo?.name || 'Store' : 'Store';
  const siteLogo = hasHydrated ? siteInfo?.logoUrl || '' : '';
  const lowStockThreshold = summary?.low_stock_threshold || 3;
  const currencySymbol = useMemo(() => {
    const fromProducts = products.find((product) => product?.currency_symbol)?.currency_symbol;
    return fromProducts || '';
  }, [products]);
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
  const handleOpenEditorPage = useCallback(
    (productItem) => {
      const target = productItem?.id
        ? `/backend/admin/products/${productItem.id}`
        : '/backend/admin/products/new';
      router.push(target);
    },
    [router],
  );
  const handleOpenPreview = (productItem) => {
    const isMobileViewport =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(max-width: 1023px)').matches;
    if (isMobileViewport) {
      handleOpenEditorPage(productItem);
      return;
    }
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
  const handleDuplicateProduct = useCallback(async (productItem) => {
    if (!productItem?.name || duplicatingProductId) return;
    setDuplicatingProductId(String(productItem.id || 'new'));
    setDuplicateProgressMessage('Wait while we build an AI-ready copy of this product...');
    try {
      const categoryIds = collectRelationIds([
        ...(Array.isArray(productItem.category_ids) ? productItem.category_ids : []),
        ...(productItem.admin_categories || productItem.categories || []),
      ]);
      if (!categoryIds.length) {
        notifyError('This product has no category. Add at least one category before duplicating.');
        return;
      }
      const tagIds = collectRelationIds([
        ...(Array.isArray(productItem.tag_ids) ? productItem.tag_ids : []),
        ...(productItem.admin_tags || productItem.tags || []),
      ]);
      const brandIds = collectRelationIds([
        ...(Array.isArray(productItem.brand_ids) ? productItem.brand_ids : []),
        ...(productItem.admin_brands || productItem.brands || []),
      ]);
      const imageIds = collectRelationIds([
        ...(Array.isArray(productItem.image_ids) ? productItem.image_ids : []),
        ...(productItem.images || []),
      ]);
      const duplicateForm = {
        name: `${productItem.name} (Copy)`,
        sku: '',
        description: productItem.description || '',
        short_description: productItem.short_description || '',
        condition_check: productItem.condition_check || '',
        packaging_style: productItem.packaging_style || 'in_wrap_nylon',
        return_policy: productItem.return_policy || 'not_returnable',
        status: 'draft',
        product_type: productItem.product_type || '',
        price: productItem.price || productItem.regular_price || '',
        regular_price: productItem.regular_price || productItem.price || '',
        sale_price: productItem.discount_price || productItem.sale_price || '',
        category_ids: categoryIds,
        tag_ids: tagIds,
        brand_ids: brandIds,
        image_id: imageIds[0] || '',
        image_ids: imageIds,
        stock_quantity: Number.isFinite(Number(productItem.stock_quantity))
          ? String(productItem.stock_quantity)
          : '0',
      };
      const created = await createProduct({ form: duplicateForm });
      setDuplicateProgressMessage('Almost done. Finalizing your duplicate now...');
      await wait(450);
      const normalized = {
        ...created,
        categories: created.admin_categories || created.categories || [],
        tags: created.admin_tags || created.tags || [],
        brands: created.admin_brands || created.brands || [],
        images: created.images || [],
        image_url: created.images?.[0]?.url || created.image_url || '',
        stock_status:
          Number(created.stock_quantity) <= 0 ? 'outofstock' : created.stock_status || 'instock',
      };
      setProducts((prev) => [normalized, ...prev]);
      setActionMenuId(null);
    } catch (err) {
      notifyError(err?.message || 'Unable to duplicate product.');
    } finally {
      setDuplicateProgressMessage('');
      setDuplicatingProductId(null);
    }
  }, [duplicatingProductId, notifyError]);
  const handleViewOnStorefront = useCallback((productItem) => {
    const target = buildPublicProductUrl(productItem);
    if (!target) {
      notifyError('Unable to open storefront preview for this product.');
      return;
    }
    window.open(target, '_blank', 'noopener,noreferrer');
  }, [notifyError]);
  const handleOpenProductAnalytics = useCallback(
    (productItem) => {
      if (!productItem?.id) return;
      router.push(`/backend/admin/products/${productItem.id}?section=analytics`);
      setActionMenuId(null);
    },
    [router],
  );

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
  const hasActiveMobileFilters =
    statusTab !== 'all' || filterValue !== 'all' || sortValue !== 'newest';
  const shouldHideBottomNav = showSortMenu || showMobileBulkMenu || Boolean(actionMenuId);

  const closeSortSheet = useCallback(() => {
    setSortSheetOffset(240);
    if (sortSheetCloseTimerRef.current) {
      window.clearTimeout(sortSheetCloseTimerRef.current);
    }
    sortSheetCloseTimerRef.current = window.setTimeout(() => {
      setShowSortMenu(false);
      setSortSheetOffset(0);
    }, 180);
  }, []);

  const closeActionSheet = useCallback(() => {
    setActionSheetOffset(260);
    if (actionSheetCloseTimerRef.current) {
      window.clearTimeout(actionSheetCloseTimerRef.current);
    }
    actionSheetCloseTimerRef.current = window.setTimeout(() => {
      setActionMenuId(null);
      setActionSheetOffset(0);
    }, 180);
  }, []);

  const handleSortSheetTouchStart = useCallback(
    (event) => {
      if (!showSortMenu) return;
      const touchY = event.touches?.[0]?.clientY;
      if (!Number.isFinite(touchY)) return;
      sortSheetDragRef.current = { startY: touchY, dragging: true };
      setIsSortSheetDragging(true);
    },
    [showSortMenu],
  );

  const handleSortSheetTouchMove = useCallback((event) => {
    if (!sortSheetDragRef.current.dragging) return;
    const touchY = event.touches?.[0]?.clientY;
    if (!Number.isFinite(touchY)) return;
    const delta = touchY - sortSheetDragRef.current.startY;
    setSortSheetOffset(Math.max(-28, Math.min(260, delta)));
    if (event.cancelable) event.preventDefault();
  }, []);

  const handleSortSheetTouchEnd = useCallback(() => {
    if (!sortSheetDragRef.current.dragging) return;
    sortSheetDragRef.current.dragging = false;
    setIsSortSheetDragging(false);
    if (sortSheetOffset > 84) {
      closeSortSheet();
      return;
    }
    setSortSheetOffset(0);
  }, [closeSortSheet, sortSheetOffset]);

  const handleActionSheetTouchStart = useCallback(
    (event) => {
      if (!actionMenuId) return;
      const touchY = event.touches?.[0]?.clientY;
      if (!Number.isFinite(touchY)) return;
      actionSheetDragRef.current = { startY: touchY, dragging: true };
      setIsActionSheetDragging(true);
    },
    [actionMenuId],
  );

  const handleActionSheetTouchMove = useCallback((event) => {
    if (!actionSheetDragRef.current.dragging) return;
    const touchY = event.touches?.[0]?.clientY;
    if (!Number.isFinite(touchY)) return;
    const delta = touchY - actionSheetDragRef.current.startY;
    setActionSheetOffset(Math.max(-28, Math.min(280, delta)));
    if (event.cancelable) event.preventDefault();
  }, []);

  const handleActionSheetTouchEnd = useCallback(() => {
    if (!actionSheetDragRef.current.dragging) return;
    actionSheetDragRef.current.dragging = false;
    setIsActionSheetDragging(false);
    if (actionSheetOffset > 84) {
      closeActionSheet();
      return;
    }
    setActionSheetOffset(0);
  }, [actionSheetOffset, closeActionSheet]);

  const handleToggleVisibleSelection = useCallback(() => {
    if (!visibleIds.length) return;
    if (allVisibleSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }
    setSelectedProductIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  }, [allVisibleSelected, visibleIds]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = !allVisibleSelected && selectedVisibleCount > 0;
    }
  }, [allVisibleSelected, selectedVisibleCount]);

  useEffect(() => {
    if (!hasSelection && showMobileBulkMenu) {
      setShowMobileBulkMenu(false);
    }
  }, [hasSelection, showMobileBulkMenu]);

  useEffect(() => {
    if (showSortMenu) {
      setSortSheetOffset(0);
      setIsSortSheetDragging(false);
    }
  }, [showSortMenu]);

  useEffect(() => {
    if (actionMenuId) {
      setActionSheetOffset(0);
      setIsActionSheetDragging(false);
    }
  }, [actionMenuId]);

  const handleMobileBulkAction = useCallback(
    async (action) => {
      await handleBulkAction(action);
      setShowMobileBulkMenu(false);
    },
    [handleBulkAction],
  );

  const glassCardClass =
    'rounded-3xl border border-slate-200 bg-white shadow-sm';
  const glassButtonClass =
    'rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50';
  const softPillClass =
    'rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm';

  return (
    <div className="min-h-screen bg-white overflow-x-clip text-slate-900">
      <div className="flex min-h-screen">
        {!shouldHideBottomNav && <AdminSidebar />}

        <main className="flex-1 pb-6 sm:px-6 lg:px-10">
                  <AdminDesktopHeader />
          <div className="mx-auto w-full max-w-6xl space-y-6">
            <div className="relative w-full md:hidden">
              <div className="flex items-center gap-2 bg-white p-2 shadow-sm ring-1 ring-slate-200/80">
                <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-300/80 bg-white px-3 py-2.5 text-slate-500">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="11" cy="11" r="6" />
                    <path d="m15.5 15.5 4 4" />
                  </svg>
                  <input
                    className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                    placeholder="Search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowSortMenu((prev) => !prev);
                    setShowFilterMenu(false);
                  }}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 transition ${
                    hasActiveMobileFilters
                      ? 'bg-slate-900 text-white ring-slate-900/30'
                      : 'bg-slate-50 text-slate-600 ring-slate-200/70'
                  }`}
                  aria-label="Sort products"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 6h16" />
                    <path d="M7 12h10" />
                    <path d="M10 18h4" />
                  </svg>
                </button>
              </div>
              {showSortMenu && (
                <div className="fixed inset-0 z-50 md:hidden">
                  <button
                    type="button"
                    onClick={closeSortSheet}
                    className="absolute inset-0 bg-slate-900/35"
                    aria-label="Close sort menu"
                  />
                  <div
                    className={`absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-10px_28px_rgba(2,6,23,0.2)] ${isSortSheetDragging ? '' : 'transition-transform duration-200 ease-out'}`}
                    style={{ transform: `translateY(${sortSheetOffset}px)` }}
                  >
                    <div
                      className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-200"
                      role="button"
                      aria-label="Drag or tap to close sort menu"
                      onClick={closeSortSheet}
                      onTouchStart={handleSortSheetTouchStart}
                      onTouchMove={handleSortSheetTouchMove}
                      onTouchEnd={handleSortSheetTouchEnd}
                    />
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Sort Products
                    </p>
                    <div className="space-y-1 pb-1">
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={`mobile-sort-${option.value}`}
                          type="button"
                          onClick={() => {
                            setSortValue(option.value);
                            setShowSortMenu(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold ${
                            sortValue === option.value
                              ? 'bg-slate-100 text-slate-900'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {option.label}
                          {sortValue === option.value ? <span>•</span> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-2 flex items-center gap-2 px-1">
                {[
                  { label: 'All', value: 'all' },
                  { label: 'Active', value: 'publish' },
                  { label: 'Draft', value: 'draft' },
                  { label: 'Archived', value: 'archived' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      setStatusTab((prev) => (prev === item.value ? 'all' : item.value))
                    }
                    className={`rounded-md px-3 py-1 text-[11px] font-semibold transition ${
                      statusTab === item.value
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 ring-1 ring-slate-200'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {item.label}
                      {statusTab === item.value && item.value !== 'all' ? (
                        <span
                          role="button"
                          aria-label={`Clear ${item.label} filter`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setStatusTab('all');
                          }}
                          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/20 text-[10px] leading-none"
                        >
                          x
                        </span>
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="-mt-1 px-3 sm:mt-0 sm:px-0">
              <div className="-mt-1 grid grid-cols-2 gap-3 sm:mt-0 sm:gap-4 lg:grid-cols-4">
              <div className={`${glassCardClass} bg-gradient-to-br from-white/72 via-white/46 to-white/45 p-3 sm:p-4`}>
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-600 sm:text-xs">Total Products</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900 sm:mt-3 sm:text-2xl">
                      {isSummaryLoading ? '...' : formatCount(summary?.total_products)}
                    </p>
                  </div>
                  <svg viewBox="0 0 120 36" className="h-8 w-20 text-zinc-500/70 sm:h-10 sm:w-24">
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
                <div className="mt-2 text-[10px] text-slate-500 sm:mt-3 sm:text-[11px]">Catalog size</div>
              </div>

              <div className={`${glassCardClass} p-3 sm:p-4`}>
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-600 sm:text-xs">Live Products</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900 sm:mt-3 sm:text-2xl">
                      {isSummaryLoading ? '...' : formatCount(summary?.live_products)}
                    </p>
                  </div>
                  <svg viewBox="0 0 120 36" className="h-8 w-20 text-zinc-500 sm:h-10 sm:w-24">
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
                <div className="mt-2 text-[10px] text-slate-500 sm:mt-3 sm:text-[11px]">Published products</div>
              </div>

              <div
                className={`${glassCardClass} p-3 transition-opacity duration-300 sm:p-4 ${
                  overviewExpanded ? 'block' : 'hidden'
                } md:block ${overviewExpanded && !overviewReveal ? 'opacity-0' : 'opacity-100'}`}
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-600 sm:text-xs">Product Revenue</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900 sm:mt-3 sm:text-2xl">
                      {isMetricsLoading ? '...' : formatPrice(metrics.revenue, currencySymbol)}
                    </p>
                  </div>
                  <svg viewBox="0 0 120 36" className="h-8 w-20 text-zinc-600 sm:h-10 sm:w-24">
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
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500 sm:mt-3 sm:gap-2 sm:text-[11px]">
                  <span className={`font-semibold ${revenueDelta.tone}`}>{revenueDelta.label}</span>
                  <span>vs last 7 days</span>
                </div>
              </div>

              <div
                className={`${glassCardClass} p-3 transition-opacity duration-300 sm:p-4 ${
                  overviewExpanded ? 'block' : 'hidden'
                } md:block ${overviewExpanded && !overviewReveal ? 'opacity-0' : 'opacity-100'}`}
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-600 sm:text-xs">Products Sold</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900 sm:mt-3 sm:text-2xl">
                      {isMetricsLoading ? '...' : formatCount(metrics.sold)}
                    </p>
                  </div>
                  <svg viewBox="0 0 120 36" className="h-8 w-20 text-zinc-600 sm:h-10 sm:w-24">
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
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500 sm:mt-3 sm:gap-2 sm:text-[11px]">
                  <span className={`font-semibold ${soldDelta.tone}`}>{soldDelta.label}</span>
                  <span>vs last 7 days</span>
                </div>
              </div>

            </div>
            </div>
            <div className="!mt-[2px] flex justify-center md:hidden">
              <button
                type="button"
                onClick={() => setOverviewExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-sky-600 transition hover:text-sky-500"
              >
                {overviewExpanded ? (
                  <>
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m18 15-6-6-6 6" />
                    </svg>
                    Collapse Overview
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                    More Overview
                  </>
                )}
              </button>
            </div>

            <div className="mt-1">
              <div className="space-y-0">
                <div
                  id="product-list"
                  className="overflow-visible"
                >
                  <div className="hidden items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5 md:flex">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-40 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-slate-500">
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <circle cx="11" cy="11" r="6" />
                          <path d="m15.5 15.5 4 4" />
                        </svg>
                        <input
                          className="w-full bg-transparent text-[11px] text-slate-700 placeholder:text-slate-400 focus:outline-none"
                          placeholder="Search"
                          value={searchTerm}
                          onChange={(event) => setSearchTerm(event.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasSelection ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedProductIds([])}
                            className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                          >
                            Deselect
                          </button>
                          <LoadingButton
                            type="button"
                            onClick={() => handleBulkAction('out_of_stock')}
                            isLoading={bulkAction === 'out_of_stock'}
                            className="inline-flex h-8 items-center rounded-md border border-slate-500/35 bg-slate-900 px-3 text-[11px] font-semibold text-white shadow-sm disabled:opacity-60"
                          >
                            Mark out of stock
                          </LoadingButton>
                          <LoadingButton
                            type="button"
                            onClick={() => handleBulkAction('draft')}
                            isLoading={bulkAction === 'draft'}
                            className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-sm disabled:opacity-60"
                          >
                            Move to draft
                          </LoadingButton>
                          <LoadingButton
                            type="button"
                            onClick={() => handleBulkAction('delete')}
                            isLoading={bulkAction === 'delete'}
                            className="inline-flex h-8 items-center rounded-md border border-black/20 bg-white px-3 text-[11px] font-semibold text-black shadow-sm disabled:opacity-60"
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
                            className={`inline-flex h-8 items-center rounded-md border px-3 text-[11px] font-semibold transition ${
                              statusTab === tab.value
                                ? 'border-slate-500/35 bg-slate-900 text-white shadow-sm'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-sm"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 6h16" />
                          <path d="M7 12h10" />
                          <path d="M10 18h4" />
                        </svg>
                        Filter
                        <svg viewBox="0 0 24 24" className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                      {showFilterMenu && (
                        <div className="absolute right-[11.25rem] top-10 z-20 w-40 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                          {FILTER_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setFilterValue(option.value);
                                setShowFilterMenu(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${
                                filterValue === option.value ? 'bg-white text-slate-800' : 'text-slate-600 hover:bg-white'
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
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-sm"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 7h18" />
                          <path d="M6 12h12" />
                          <path d="M9 17h6" />
                        </svg>
                        Sort
                        <svg viewBox="0 0 24 24" className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                      {showSortMenu && (
                        <div className="absolute right-14 top-10 z-20 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                          {SORT_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setSortValue(option.value);
                                closeSortSheet();
                              }}
                              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${
                                sortValue === option.value ? 'bg-white text-slate-800' : 'text-slate-600 hover:bg-white'
                              }`}
                            >
                              {option.label}
                              {sortValue === option.value && <span>•</span>}
                            </button>
                          ))}
                        </div>
                      )}
                      <label className="inline-flex h-8 cursor-pointer items-center gap-2 px-1.5 text-[11px] font-semibold text-slate-700">
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          checked={allVisibleSelected}
                          onChange={handleToggleVisibleSelection}
                        />
                        Select
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-1 sm:hidden">
                    <div className="relative">
                      {hasSelection ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setShowMobileBulkMenu((prev) => !prev);
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm"
                          aria-label="Open bulk actions"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="19" cy="12" r="1" />
                            <circle cx="5" cy="12" r="1" />
                          </svg>
                        </button>
                      ) : (
                        <div className="h-9 w-9" aria-hidden="true" />
                      )}
                      {showMobileBulkMenu && hasSelection && (
                        <div className="absolute left-0 top-11 z-30 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                          <LoadingButton
                            type="button"
                            onClick={() => handleMobileBulkAction('out_of_stock')}
                            isLoading={bulkAction === 'out_of_stock'}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          >
                            Mark out of stock
                          </LoadingButton>
                          <LoadingButton
                            type="button"
                            onClick={() => handleMobileBulkAction('draft')}
                            isLoading={bulkAction === 'draft'}
                            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          >
                            Move to draft
                          </LoadingButton>
                          <LoadingButton
                            type="button"
                            onClick={() => handleMobileBulkAction('delete')}
                            isLoading={bulkAction === 'delete'}
                            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          >
                            Delete permanent
                          </LoadingButton>
                        </div>
                      )}
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={handleToggleVisibleSelection}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-zinc-700 focus:ring-zinc-500"
                        aria-label="Select all products on mobile"
                      />
                      <span>Select</span>
                    </label>
                  </div>

                  <div className="space-y-2 px-2 py-2 sm:space-y-0 sm:px-0 sm:py-0 sm:divide-y sm:divide-slate-100">
                    {isLoading && !products.length &&
                      Array.from({ length: PRODUCT_PAGE_SIZE }).map((_, index) => (
                        <div
                          key={`product-skeleton-${index}`}
                          className="flex animate-pulse flex-col gap-3 rounded-2xl border border-white/80 bg-white/70 px-4 py-4 shadow-sm sm:rounded-none sm:border-0 sm:bg-transparent sm:px-6 sm:py-4 sm:shadow-none sm:grid sm:grid-cols-[minmax(32px,_0.2fr)_minmax(140px,_1.6fr)_minmax(90px,_0.8fr)_minmax(80px,_0.6fr)_minmax(90px,_0.7fr)_minmax(64px,_0.4fr)] sm:items-center sm:gap-3"
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
                          className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/72 px-4 py-4 text-sm shadow-sm transition hover:bg-white/85 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-6 sm:py-4 sm:shadow-none sm:hover:bg-white sm:grid sm:grid-cols-[minmax(32px,_0.2fr)_minmax(140px,_1.6fr)_minmax(90px,_0.8fr)_minmax(80px,_0.6fr)_minmax(90px,_0.7fr)_minmax(64px,_0.4fr)] sm:items-center sm:gap-3"
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
                              className="h-3.5 w-3.5 rounded border-slate-300 text-zinc-700 focus:ring-zinc-500"
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
                              className="h-3.5 w-3.5 rounded border-slate-300 text-zinc-700 focus:ring-zinc-500 sm:hidden"
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
                              <button
                                type="button"
                                title={product.name || ''}
                                onClick={() => handleOpenEditorPage(product)}
                                className="max-w-[180px] text-left text-sm font-semibold leading-5 text-slate-800 line-clamp-2 transition hover:text-slate-600 focus:outline-none focus-visible:underline sm:max-w-[280px] sm:line-clamp-1"
                              >
                                {product.name}
                              </button>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <span>{getCategoryLabel(product)}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge.tone}`}>
                                  {statusBadge.label}
                                </span>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600 sm:hidden">
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
                          <div className="hidden sm:block text-[11px] font-semibold text-slate-700">
                            {stockMeta.inventoryLabel}
                          </div>
                          <div className="hidden sm:block text-[11px] font-semibold text-slate-700">
                            {formatPrice(product.price, product.currency_symbol)}
                          </div>
                          <div className="flex items-center gap-1.5 sm:justify-end">
                            <button
                              type="button"
                              onClick={() => handleOpenPreview(product)}
                              className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm "
                              aria-label={`Edit ${product.name}`}
                            >
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="m15 5 4 4" />
                                <path d="M4 20l4.5-1 10-10a2.8 2.8 0 1 0-4-4l-10 10Z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleViewOnStorefront(product)}
                              className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm "
                              aria-label={`View ${product.name} on storefront`}
                            >
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateProduct(product)}
                              className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm "
                              aria-label={`Duplicate ${product.name}`}
                            >
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="11" height="11" rx="2" />
                                <path d="M5 15V6a2 2 0 0 1 2-2h9" />
                              </svg>
                            </button>
                            <div className="relative" ref={actionMenuId === product.id ? actionMenuRef : null}>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setActionMenuId((prev) => (prev === product.id ? null : product.id));
                                }}
                                className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm "
                              >
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="19" cy="12" r="1" />
                                <circle cx="5" cy="12" r="1" />
                              </svg>
                              </button>
                              {actionMenuId === product.id && (
                                <>
                                  <div className="fixed inset-0 z-[60] flex items-end sm:hidden">
                                    <button
                                      type="button"
                                      className="absolute inset-0 bg-slate-900/20"
                                      onClick={closeActionSheet}
                                      aria-label="Close action menu"
                                    />
                                    <div
                                      className={`relative z-[61] w-full rounded-t-3xl bg-white px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_28px_rgba(2,6,23,0.22)] ${isActionSheetDragging ? '' : 'transition-transform duration-200 ease-out'}`}
                                      style={{ transform: `translateY(${actionSheetOffset}px)` }}
                                    >
                                      <div
                                        className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-200"
                                        role="button"
                                        aria-label="Drag or tap to close action menu"
                                        onClick={closeActionSheet}
                                        onTouchStart={handleActionSheetTouchStart}
                                        onTouchMove={handleActionSheetTouchMove}
                                        onTouchEnd={handleActionSheetTouchEnd}
                                      />
                                      <div className="max-h-[72vh] space-y-1 overflow-y-auto pb-1">
                                      <button
                                        type="button"
                                        onClick={() => handleProductAction(product, 'out_of_stock')}
                                        className="flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 transition active:bg-slate-100 [WebkitTapHighlightColor:rgba(15,23,42,0.14)]"
                                      >
                                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M4 12h16" />
                                          <path d="M12 4v16" />
                                        </svg>
                                        Mark out of stock
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleViewOnStorefront(product)}
                                        className="flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 transition active:bg-slate-100 [WebkitTapHighlightColor:rgba(15,23,42,0.14)]"
                                      >
                                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                                          <circle cx="12" cy="12" r="3" />
                                        </svg>
                                        View
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDuplicateProduct(product)}
                                        className="flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 transition active:bg-slate-100 [WebkitTapHighlightColor:rgba(15,23,42,0.14)]"
                                      >
                                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                          <rect x="9" y="9" width="11" height="11" rx="2" />
                                          <path d="M5 15V6a2 2 0 0 1 2-2h9" />
                                        </svg>
                                        Duplicate
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenProductAnalytics(product)}
                                        className="flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 transition active:bg-slate-100 [WebkitTapHighlightColor:rgba(15,23,42,0.14)]"
                                      >
                                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M4 19h16" />
                                          <path d="M7 15v-3" />
                                          <path d="M12 15V9" />
                                          <path d="M17 15V6" />
                                        </svg>
                                        Analytics
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleProductAction(product, 'feature')}
                                        className="flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 transition active:bg-slate-100 [WebkitTapHighlightColor:rgba(15,23,42,0.14)]"
                                      >
                                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                                          <path d="M12 3.5 14.8 9l6 .9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6L3.2 9l6-.9L12 3.5Z" />
                                        </svg>
                                        Feature product
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleProductAction(product, 'add_to_menu')}
                                        className="flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 transition active:bg-slate-100 [WebkitTapHighlightColor:rgba(15,23,42,0.14)]"
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
                                        className="flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 transition active:bg-slate-100 [WebkitTapHighlightColor:rgba(15,23,42,0.14)]"
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
                                        className="flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold text-black transition active:bg-slate-100 [WebkitTapHighlightColor:rgba(15,23,42,0.14)]"
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
                                  </div>
                                  </div>

                                  <div className="absolute right-0 top-10 z-20 hidden w-52 rounded-2xl border border-slate-200 bg-white p-2 text-xs shadow-xl sm:block">
                                    <button
                                      type="button"
                                      onClick={() => handleProductAction(product, 'out_of_stock')}
                                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-700 transition hover:bg-white active:bg-slate-100 [WebkitTapHighlightColor:rgba(15,23,42,0.14)]"
                                    >
                                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M4 12h16" />
                                        <path d="M12 4v16" />
                                      </svg>
                                      Mark out of stock
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleViewOnStorefront(product)}
                                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-700 transition hover:bg-white active:bg-slate-100 [WebkitTapHighlightColor:rgba(15,23,42,0.14)]"
                                    >
                                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                                        <circle cx="12" cy="12" r="3" />
                                      </svg>
                                      View
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDuplicateProduct(product)}
                                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-700 transition hover:bg-white active:bg-slate-100 [WebkitTapHighlightColor:rgba(15,23,42,0.14)]"
                                    >
                                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="9" y="9" width="11" height="11" rx="2" />
                                        <path d="M5 15V6a2 2 0 0 1 2-2h9" />
                                      </svg>
                                      Duplicate
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenProductAnalytics(product)}
                                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-700 transition hover:bg-white active:bg-slate-100 [WebkitTapHighlightColor:rgba(15,23,42,0.14)]"
                                    >
                                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M4 19h16" />
                                        <path d="M7 15v-3" />
                                        <path d="M12 15V9" />
                                        <path d="M17 15V6" />
                                      </svg>
                                      Analytics
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleProductAction(product, 'feature')}
                                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-700 transition hover:bg-white active:bg-slate-100 [WebkitTapHighlightColor:rgba(15,23,42,0.14)]"
                                    >
                                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                                        <path d="M12 3.5 14.8 9l6 .9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6L3.2 9l6-.9L12 3.5Z" />
                                      </svg>
                                      Feature product
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleProductAction(product, 'add_to_menu')}
                                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-700 transition hover:bg-white active:bg-slate-100 [WebkitTapHighlightColor:rgba(15,23,42,0.14)]"
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
                                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-700 transition hover:bg-white active:bg-slate-100 [WebkitTapHighlightColor:rgba(15,23,42,0.14)]"
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
                                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-black transition hover:bg-white active:bg-slate-100 [WebkitTapHighlightColor:rgba(15,23,42,0.14)]"
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
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {!products.length && !isLoading && (
                      <div className="px-6 py-10 text-center text-sm text-slate-500">No products found.</div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 text-xs text-slate-500">
                    <span>
                      Showing {(page - 1) * PRODUCT_PAGE_SIZE + products.length} of{' '}
                      {summary?.total_products ? formatCount(summary.total_products) : formatCount(products.length)} products
                    </span>
                    {hasMore && (
                      <LoadingButton
                        type="button"
                        onClick={() => loadProducts(page + 1)}
                        isLoading={isLoading}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm disabled:opacity-50"
                      >
                        Load more
                      </LoadingButton>
                    )}
                  </div>
                  <div ref={loadMoreRef} className="h-1 w-full" />
                </div>
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
      <div className="pointer-events-none fixed bottom-8 right-6 z-[120] hidden lg:flex">
        <div className="pointer-events-auto flex items-center rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-[0_16px_36px_rgba(15,23,42,0.12)] backdrop-blur">
          <button
            type="button"
            onClick={() => handleOpenPreview(null)}
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100"
            aria-label="Add new product"
            title="Quick add product"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9">
              <rect x="4" y="4" width="16" height="16" rx="3" />
              <path d="M12 8v8M8 12h8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      {duplicatingProductId ? (
        <div className="fixed inset-0 z-[999] h-dvh w-screen lg:hidden">
          <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]" />
          <div className="relative flex h-full w-full items-center justify-center px-6 text-center">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-[0_18px_45px_rgba(2,6,23,0.28)]">
              <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
              <p className="text-sm font-semibold text-slate-900">
                {duplicateProgressMessage || 'Preparing duplicate...'}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default WooCommerceProductsPage;
