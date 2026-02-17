'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader';
import BouncingDotsLoader from './components/BouncingDotsLoader';
import DateRangePopover from './components/DateRangePopover';
import {
  fetchConnector,
  getHostname,
  normalizeWpUrl,
  pickSiteForUrl,
  readStoredSiteId,
  readStoredSiteInfo,
} from '@/utils/connector.mjs';

const PER_PAGE = 10;
const METRIC_DAYS = 7;
const RANGE_OPTIONS = [
  { id: 'lifetime', label: 'All Time' },
  { id: 'last_7_days', label: 'Last 7 Days' },
  { id: 'last_30_days', label: 'Last 30 Days' },
  { id: 'today', label: 'Today' },
  { id: 'custom', label: 'Custom Range' },
];

const STATUS_STYLES = {
  Completed: 'bg-emerald-100 text-emerald-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Waiting: 'bg-amber-100 text-amber-700',
  Cancelled: 'bg-rose-100 text-rose-700',
  Refunded: 'bg-slate-100 text-slate-600',
  'On Hold': 'bg-purple-100 text-purple-700',
};

const iconMap = {
  bag: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 7h12l-1 13H7L6 7z" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  ),
  box: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7 12 2l9 5-9 5-9-5z" />
      <path d="M3 7v10l9 5 9-5V7" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v4" />
      <path d="M21 12h-4" />
    </svg>
  ),
  cart: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M3 4h2l2.5 11h10.5l2-7H7" />
    </svg>
  ),
};

const formatCurrency = (value, currency, symbol) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value || '';
  if (currency) {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (_error) {}
  }
  const fallbackSymbol = symbol || '$';
  return `${fallbackSymbol}${amount.toFixed(2)}`;
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const normalizeStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (['completed', 'paid'].includes(normalized)) return 'Completed';
  if (['processing', 'in-progress'].includes(normalized)) return 'In Progress';
  if (['on-hold'].includes(normalized)) return 'On Hold';
  if (['pending'].includes(normalized)) return 'Waiting';
  if (['refunded'].includes(normalized)) return 'Refunded';
  if (['cancelled', 'canceled', 'failed'].includes(normalized)) return 'Cancelled';
  return 'Waiting';
};

const buildCustomerName = (order) => {
  const billing = order?.billing || {};
  const shipping = order?.shipping || {};
  const name = `${billing.first_name || ''} ${billing.last_name || ''}`.trim();
  if (name) return name;
  const shippingName = `${shipping.first_name || ''} ${shipping.last_name || ''}`.trim();
  if (shippingName) return shippingName;
  return order?.customer_name || order?.customer?.name || 'Guest';
};

const summarizeLineItems = (order) => {
  const items = Array.isArray(order?.line_items) ? order.line_items : [];
  if (!items.length) {
    return { product: 'Order', subtext: '' };
  }
  const [first, ...rest] = items;
  const subtext = rest.length ? `+${rest.length} other ${rest.length === 1 ? 'product' : 'products'}` : '';
  return { product: first?.name || 'Order', subtext };
};

const summarizeOrderItems = (order) => {
  const items = Array.isArray(order?.line_items) ? order.line_items : [];
  const totalQty = items.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
  const count = totalQty || items.length;
  if (!count) return 'No items';
  return `${count} ${count === 1 ? 'item' : 'items'}`;
};

const calcChange = (current, previous) => {
  if (!previous) {
    return {
      change: current ? '+100%' : '0%',
      trend: current ? 'up' : 'down',
    };
  }
  const diff = ((current - previous) / previous) * 100;
  const trend = diff >= 0 ? 'up' : 'down';
  return {
    change: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`,
    trend,
  };
};

const getRangeBounds = (range, customStart, customEnd) => {
  if (range === 'custom') {
    const start = customStart ? new Date(`${customStart}T00:00:00`) : null;
    const end = customEnd ? new Date(`${customEnd}T23:59:59`) : null;
    return { start, end };
  }
  if (range === 'today') {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (range === 'last_7_days') {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (range === 'last_30_days') {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  return { start: null, end: null };
};

function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCustomerSearch = useMemo(() => searchParams?.get('customer') || '', [searchParams]);
  const [siteInfo, setSiteInfo] = useState(() => readStoredSiteInfo());
  const [siteId, setSiteId] = useState(() => readStoredSiteId() || siteInfo?.siteId || '');
  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [metricsOrders, setMetricsOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialCustomerSearch);
  const [range, setRange] = useState('lifetime');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isRangeOpen, setIsRangeOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [ordersFallback, setOrdersFallback] = useState(false);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const loadMoreRef = useRef(null);
  const actionMenuRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedRange = localStorage.getItem('agentic_orders_range');
      const storedStart = localStorage.getItem('agentic_orders_date_from');
      const storedEnd = localStorage.getItem('agentic_orders_date_to');
      if (storedRange) setRange(storedRange);
      if (storedStart) setCustomStart(storedStart);
      if (storedEnd) setCustomEnd(storedEnd);
    } catch (_error) {}
  }, []);

  useEffect(() => {
    setSearchTerm(initialCustomerSearch);
  }, [initialCustomerSearch]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === 'agentic_wp_site') {
        setSiteInfo(readStoredSiteInfo());
      }
      if (event.key === 'agentic_wp_site_id') {
        setSiteId(readStoredSiteId());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    const handleClick = (event) => {
      if (!actionMenuRef.current) return;
      if (actionMenuRef.current.contains(event.target)) return;
      setActionMenuId(null);
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (siteInfo?.siteId) {
      setSiteId(siteInfo.siteId);
    }
  }, [siteInfo]);

  const applySiteInfo = useCallback((site) => {
    if (!site) return '';
    const resolvedSiteId =
      typeof site.site_id === 'string'
        ? site.site_id
        : typeof site.id === 'string'
          ? site.id
          : '';
    const siteUrl =
      typeof site.site_url === 'string'
        ? site.site_url
        : typeof site.url === 'string'
          ? site.url
          : '';
    const siteName =
      typeof site.site_name === 'string'
        ? site.site_name
        : typeof site.name === 'string'
          ? site.name
          : '';
    const logoUrl =
      typeof site.site_logo_url === 'string'
        ? site.site_logo_url
        : typeof site.logoUrl === 'string'
          ? site.logoUrl
          : '';
    const normalizedUrl = siteUrl ? normalizeWpUrl(siteUrl) : '';
    const resolvedName = siteName.trim() || getHostname(normalizedUrl) || normalizedUrl;
    const storedSiteInfo = readStoredSiteInfo();
    const storedTagline = storedSiteInfo?.tagline || storedSiteInfo?.description || '';
    const siteTagline =
      typeof site.tagline === 'string'
        ? site.tagline
        : typeof site.description === 'string'
          ? site.description
          : storedTagline;
    const nextSiteInfo = {
      name: resolvedName,
      logoUrl: logoUrl || '',
      url: normalizedUrl || siteUrl,
      siteId: resolvedSiteId || '',
      tagline: siteTagline || '',
      description: siteTagline || '',
    };
    setSiteInfo(nextSiteInfo);
    if (resolvedSiteId) {
      setSiteId(resolvedSiteId);
    }
    try {
      localStorage.setItem('agentic_wp_site', JSON.stringify(nextSiteInfo));
      if (resolvedSiteId) {
        localStorage.setItem('agentic_wp_site_id', resolvedSiteId);
      }
    } catch (_error) {}
    return resolvedSiteId;
  }, []);

  const resolveSiteId = useCallback(async () => {
    const existingId = readStoredSiteId() || siteInfo?.siteId || siteId;
    if (existingId) {
      return existingId;
    }
    const token = localStorage.getItem('agentic_auth_token');
    if (!token) {
      return '';
    }
    const response = await fetchConnector('/sites', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.sites?.length) {
      return '';
    }
    const storedSite = readStoredSiteInfo();
    const selectedSite = storedSite?.url
      ? pickSiteForUrl(payload.sites, storedSite.url)
      : payload.sites[0];
    return applySiteInfo(selectedSite);
  }, [applySiteInfo, siteId, siteInfo]);

  const loadOrders = useCallback(async (nextPage = 1, { append = false } = {}) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError('');
    try {
      const resolvedSiteId = await resolveSiteId();
      if (!resolvedSiteId) return;
      const token = localStorage.getItem('agentic_auth_token');
      if (!token) return;
      const params = new URLSearchParams({
        page: String(nextPage),
        per_page: String(PER_PAGE),
        order: 'desc',
        range,
      });
      if (range === 'custom' && (customStart || customEnd)) {
        if (customStart) params.set('date_from', customStart);
        if (customEnd) params.set('date_to', customEnd);
      }
      const response = await fetchConnector(`/sites/${resolvedSiteId}/orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = payload?.details ? ` (${payload.details})` : '';
        const target = payload?.target_url ? ` ${payload.target_url}` : '';
        setError(`${payload?.error || 'Failed to load orders.'}${detail}${target}`);
        return;
      }
      const items = Array.isArray(payload?.items) ? payload.items : [];
      const count =
        Number(payload?.total_items || payload?.total || payload?.count) ||
        (items.length ? (nextPage - 1) * PER_PAGE + items.length : 0);
      const totalPages =
        Number(payload?.pages) ||
        (count ? Math.ceil(count / PER_PAGE) : items.length < PER_PAGE ? 1 : nextPage + 1);
      const isFallback = payload?.fallback === 'site-summary';
      setOrdersFallback(isFallback);
      setHasMore(!isFallback && nextPage < totalPages);
      setPage(nextPage);
      setOrders((prev) => (append ? [...prev, ...items] : items));
      setTotalCount(count);
    } catch (error) {
      setError(error?.message || 'Failed to load orders.');
    } finally {
      if (append) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [customEnd, customStart, range, resolveSiteId]);

  const updateOrderStatus = useCallback(async (orderId, nextStatus) => {
    if (!orderId || !nextStatus) return;
    setStatusUpdatingId(orderId);
    setError('');
    try {
      const resolvedSiteId = await resolveSiteId();
      if (!resolvedSiteId) return;
      const token = localStorage.getItem('agentic_auth_token');
      if (!token) return;
      const response = await fetchConnector(`/sites/${resolvedSiteId}/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = payload?.details ? ` (${payload.details})` : '';
        const target = payload?.target_url ? ` ${payload.target_url}` : '';
        setError(`${payload?.error || 'Failed to update order.'}${detail}${target}`);
        return;
      }
      const updatedOrder = payload?.order || payload;
      setOrders((prev) =>
        prev.map((order) => (order?.id === orderId ? { ...order, ...updatedOrder } : order)),
      );
      setMetricsOrders((prev) =>
        prev.map((order) => (order?.id === orderId ? { ...order, ...updatedOrder } : order)),
      );
    } catch (err) {
      setError(err?.message || 'Failed to update order.');
    } finally {
      setStatusUpdatingId(null);
      setActionMenuId(null);
    }
  }, [resolveSiteId]);

  const statusOptions = useMemo(() => ([
    { label: 'Completed', value: 'completed' },
    { label: 'Processing', value: 'processing' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'On Hold', value: 'on-hold' },
    { label: 'Failed', value: 'failed' },
    { label: 'Refunded', value: 'refunded' },
    { label: 'Draft', value: 'draft' },
    { label: 'Pending Payment', value: 'pending' },
  ]), []);

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const resolvedSiteId = await resolveSiteId();
      if (!resolvedSiteId) return;
      const token = localStorage.getItem('agentic_auth_token');
      if (!token) return;
      const params = new URLSearchParams({
        page: '1',
        per_page: '100',
        order: 'desc',
        range,
      });
      if (range === 'custom' && (customStart || customEnd)) {
        if (customStart) params.set('date_from', customStart);
        if (customEnd) params.set('date_to', customEnd);
      }
      const response = await fetchConnector(`/sites/${resolvedSiteId}/orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) return;
      const items = Array.isArray(payload?.items) ? payload.items : [];
      setMetricsOrders(items);
    } catch (_error) {
      setMetricsOrders([]);
    } finally {
      setMetricsLoading(false);
    }
  }, [customEnd, customStart, range, resolveSiteId]);

  useEffect(() => {
    setOrders([]);
    setPage(1);
    setHasMore(true);
    loadOrders(1, { append: false });
  }, [customEnd, customStart, loadOrders, range]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    localStorage.setItem('agentic_orders_range', range);
  }, [range]);

  useEffect(() => {
    if (customStart) {
      localStorage.setItem('agentic_orders_date_from', customStart);
    } else {
      localStorage.removeItem('agentic_orders_date_from');
    }
    if (customEnd) {
      localStorage.setItem('agentic_orders_date_to', customEnd);
    } else {
      localStorage.removeItem('agentic_orders_date_to');
    }
  }, [customEnd, customStart]);

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const { start, end } = getRangeBounds(range, customStart, customEnd);
    const sourceOrders =
      ordersFallback && totalCount ? orders.slice(0, Math.min(totalCount, orders.length)) : orders;
    return sourceOrders.filter((order) => {
      const createdAt = order?.created_at || order?.date_created || order?.created;
      const createdDate = createdAt ? new Date(createdAt) : null;
      if (start && createdDate && createdDate < start) return false;
      if (end && createdDate && createdDate > end) return false;
      if (!term) return true;
      const id = String(order?.id || '').toLowerCase();
      const customer = buildCustomerName(order).toLowerCase();
      const product = summarizeLineItems(order).product.toLowerCase();
      return id.includes(term) || customer.includes(term) || product.includes(term);
    });
  }, [customEnd, customStart, orders, ordersFallback, range, searchTerm, totalCount]);

  const canLoadMore = hasMore && !isLoading && !isLoadingMore;

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!canLoadMore) return;
        loadOrders(page + 1, { append: true });
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [canLoadMore, loadOrders, page]);

  const metrics = useMemo(() => {
    const { start, end } = getRangeBounds(range, customStart, customEnd);
    const isLifetime = !start && !end;
    const rangeDays =
      range === 'last_30_days'
        ? 30
        : range === 'last_7_days' || range === 'today'
          ? 7
          : METRIC_DAYS;

    const startCurrent = isLifetime ? null : start || new Date(Date.now() - (rangeDays - 1) * 24 * 60 * 60 * 1000);
    if (startCurrent) startCurrent.setHours(0, 0, 0, 0);
    const endCurrent = isLifetime ? null : end || new Date();
    if (endCurrent) endCurrent.setHours(23, 59, 59, 999);

    const startPrev = startCurrent ? new Date(startCurrent) : null;
    if (startPrev) startPrev.setDate(startPrev.getDate() - rangeDays);
    const endPrev = startCurrent ? new Date(startCurrent) : null;
    if (endPrev) endPrev.setMilliseconds(-1);

    let currentOrders = 0;
    let prevOrders = 0;
    let currentPending = 0;
    let prevPending = 0;
    let currentUnits = 0;
    let prevUnits = 0;
    let currentRevenue = 0;
    let prevRevenue = 0;

    metricsOrders.forEach((order) => {
      const createdAt = order?.created_at || order?.date_created || order?.created;
      if (!createdAt) return;
      const created = new Date(createdAt);
      if (Number.isNaN(created.getTime())) return;
      const total = Number(order?.total) || 0;
      const lineItems = Array.isArray(order?.line_items) ? order.line_items : [];
      const units = lineItems.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
      const statusLabel = normalizeStatus(order?.status);

      if (isLifetime || (startCurrent && endCurrent && created >= startCurrent && created <= endCurrent)) {
        currentOrders += 1;
        currentUnits += units;
        currentRevenue += total;
        if (['Waiting'].includes(statusLabel)) {
          currentPending += 1;
        }
      } else if (startPrev && endPrev && created >= startPrev && created <= endPrev) {
        prevOrders += 1;
        prevUnits += units;
        prevRevenue += total;
        if (['Waiting'].includes(statusLabel)) {
          prevPending += 1;
        }
      }
    });

    const orderChange = calcChange(currentOrders, prevOrders);
    const pendingChange = calcChange(currentPending, prevPending);
    const unitChange = calcChange(currentUnits, prevUnits);
    const revenueChange = calcChange(currentRevenue, prevRevenue);

    const currency = metricsOrders.find((order) => order?.currency)?.currency || '';
    const symbol = metricsOrders.find((order) => order?.currency_symbol)?.currency_symbol || '';

    return [
      {
        label: 'Total New Orders',
        value: String(currentOrders || 0),
        change: isLifetime ? '—' : orderChange.change,
        trend: isLifetime ? 'up' : orderChange.trend,
        icon: 'bag',
      },
      {
        label: 'Total Orders Pending',
        value: String(currentPending || 0),
        change: isLifetime ? '—' : pendingChange.change,
        trend: isLifetime ? 'up' : pendingChange.trend,
        icon: 'box',
      },
      {
        label: 'Total Product Sales',
        value: String(currentUnits || 0),
        change: isLifetime ? '—' : unitChange.change,
        trend: isLifetime ? 'up' : unitChange.trend,
        icon: 'target',
      },
      {
        label: 'Total Volume Of Products',
        value: formatCurrency(currentRevenue || 0, currency, symbol),
        change: isLifetime ? '—' : revenueChange.change,
        trend: isLifetime ? 'up' : revenueChange.trend,
        icon: 'cart',
      },
    ];
  }, [customEnd, customStart, metricsOrders, range]);

  const displayTotal = searchTerm ? filteredOrders.length : totalCount || filteredOrders.length;
  const startEntry = filteredOrders.length ? 1 : 0;
  const endEntry = filteredOrders.length ? Math.min(displayTotal, filteredOrders.length) : 0;
  const skeletonRows = useMemo(() => Array.from({ length: 6 }, (_, idx) => idx), []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <div className="sticky top-0 self-start h-screen">
          <AdminSidebar />
        </div>

        <main className="flex-1 px-4 pb-6 sm:px-6 lg:px-10">
                  <AdminDesktopHeader />
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Orders</p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">Orders</h1>
                <p className="mt-2 text-sm text-slate-500">
                  An overview of recent data of customers info, products details and analysis.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm"
                >
                  Download Report
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm"
                >
                  Filter
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsRangeOpen((prev) => !prev)}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm"
                  >
                    {RANGE_OPTIONS.find((option) => option.id === range)?.label || 'Lifetime'}
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {isRangeOpen && (
                    <div className="absolute right-0 z-10 mt-2 w-40 rounded-2xl border border-slate-200 bg-white p-2 text-xs shadow-lg">
                      {RANGE_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setRange(option.id);
                            if (option.id !== 'custom') {
                              setIsCalendarOpen(false);
                            }
                            setIsRangeOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-semibold ${
                            option.id === range ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {option.label}
                          {option.id === range && <span className="text-[10px] text-slate-400">Active</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {range === 'custom' && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen((prev) => !prev)}
                      className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm"
                    >
                      {customStart && customEnd
                        ? `${customStart} → ${customEnd}`
                        : 'Pick dates'}
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <path d="M8 2v4M16 2v4M3 10h18" />
                      </svg>
                    </button>
                    {isCalendarOpen && (
                      <div className="absolute right-0 z-10 mt-2">
                        <DateRangePopover
                          startDate={customStart}
                          endDate={customEnd}
                          onApply={({ start, end }) => {
                            setCustomStart(start);
                            setCustomEnd(end);
                          }}
                          onClose={() => setIsCalendarOpen(false)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {metrics.map((item) => (
                <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500">{item.label}</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">
                        {metricsLoading ? '...' : item.value}
                      </p>
                      <span
                        className={`mt-2 inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ${
                          item.trend === 'up'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {item.change}
                      </span>
                    </div>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      {iconMap[item.icon]}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">All Orders</p>
                  <p className="mt-1 text-xs text-slate-400">Keep track of recent order data and other information.</p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="6" />
                    <path d="m15.5 15.5 4 4" />
                  </svg>
                  <input
                    className="w-40 bg-transparent text-xs text-slate-600 placeholder:text-slate-400 focus:outline-none"
                    placeholder="Search here..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                    3K
                  </span>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <div className="bg-slate-50 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  <div className="hidden min-w-0 md:grid md:grid-cols-[minmax(0,_0.7fr)_minmax(0,_1.7fr)_minmax(0,_1.2fr)_minmax(0,_1fr)_minmax(0,_0.9fr)_minmax(0,_0.9fr)_minmax(0,_0.8fr)_minmax(0,_0.3fr)] md:gap-3">
                    <span>Order ID</span>
                    <span>Product Name</span>
                    <span>Customer Name</span>
                    <span>Date</span>
                    <span>Payment</span>
                    <span>Amount</span>
                    <span>Status</span>
                    <span className="text-right">Action</span>
                  </div>
                  <div className="grid min-w-0 grid-cols-[minmax(0,_1fr)_minmax(0,_1.2fr)_minmax(0,_0.8fr)_minmax(0,_0.6fr)] gap-3 md:hidden">
                    <span>Order</span>
                    <span>Customer</span>
                    <span>Amount</span>
                    <span>Status</span>
                  </div>
                </div>

                <div className="relative">
                  {actionMenuId && (
                    <div className="fixed inset-0 z-10 bg-white/60 backdrop-blur-sm" />
                  )}
                  <div className="divide-y divide-slate-100">
                  {isLoading && !orders.length && skeletonRows.map((row) => (
                    <div
                      key={`orders-skeleton-${row}`}
                      className="flex min-w-0 animate-pulse flex-col gap-3 px-6 py-4 text-sm md:grid md:grid-cols-[minmax(0,_0.7fr)_minmax(0,_1.7fr)_minmax(0,_1.2fr)_minmax(0,_1fr)_minmax(0,_0.9fr)_minmax(0,_0.9fr)_minmax(0,_0.8fr)_minmax(0,_0.3fr)] md:items-center md:gap-3"
                    >
                      <div className="h-3 w-16 rounded-full bg-slate-200/80" />
                      <div>
                        <div className="h-3 w-40 rounded-full bg-slate-200/80" />
                        <div className="mt-2 h-2 w-24 rounded-full bg-slate-100" />
                      </div>
                      <div className="hidden md:block h-3 w-24 rounded-full bg-slate-100" />
                      <div className="hidden md:block h-3 w-20 rounded-full bg-slate-100" />
                      <div className="hidden md:block h-3 w-14 rounded-full bg-slate-100" />
                      <div className="hidden md:block h-3 w-16 rounded-full bg-slate-100" />
                      <div className="hidden md:block h-4 w-16 rounded-full bg-slate-200/80" />
                      <div className="hidden md:flex justify-end">
                        <div className="h-3 w-6 rounded-full bg-slate-100" />
                      </div>
                    </div>
                  ))}

                  {isLoading && orders.length > 0 && (
                    <div className="px-6 py-6 text-center text-xs text-slate-400">
                      Loading orders...
                    </div>
                  )}
                  {!isLoading && error && (
                    <div className="px-6 py-6 text-center text-xs text-rose-500">
                      {error}
                    </div>
                  )}
                  {!isLoading && !error && filteredOrders.length === 0 && (
                    <div className="px-6 py-6 text-center text-xs text-slate-400">
                      No orders found.
                    </div>
                  )}
                  {!isLoading &&
                    !error &&
                    filteredOrders.map((order, index) => {
                      const { product, subtext } = summarizeLineItems(order);
                      const statusLabel = normalizeStatus(order?.status);
                      return (
                        <div
                          key={`${order?.id || 'order'}-${index}`}
                          onClick={() => {
                            if (order?.id) {
                              router.push(`/backend/admin/orders/${order.id}`);
                            }
                          }}
                          className={`flex min-w-0 cursor-pointer flex-col gap-3 px-6 py-4 text-sm text-slate-600 transition hover:bg-slate-50 md:grid md:grid-cols-[minmax(0,_0.7fr)_minmax(0,_1.7fr)_minmax(0,_1.2fr)_minmax(0,_1fr)_minmax(0,_0.9fr)_minmax(0,_0.9fr)_minmax(0,_0.8fr)_minmax(0,_0.3fr)] md:items-center md:gap-3 ${
                            actionMenuId === order?.id ? 'relative z-20' : 'relative'
                          }`}
                        >
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="font-semibold text-slate-700">#{order?.id || '—'}</div>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold md:hidden ${
                                STATUS_STYLES[statusLabel] || 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          <div className="min-w-0 md:block">
                            <div className="hidden md:block">
                              <p className="truncate font-semibold text-slate-700">{product}</p>
                              {subtext && <p className="truncate text-[11px] text-slate-400">{subtext}</p>}
                            </div>
                            <div className="md:hidden text-[11px] text-slate-500">
                              {summarizeOrderItems(order)}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 md:hidden">
                              <span>{buildCustomerName(order)}</span>
                              <span>{formatDate(order?.created_at || order?.date_created)}</span>
                              <span>{order?.payment_method_title || order?.payment_method || '—'}</span>
                              <span>{formatCurrency(order?.total, order?.currency, order?.currency_symbol)}</span>
                            </div>
                          </div>
                          <div className="hidden md:block">{buildCustomerName(order)}</div>
                          <div className="hidden md:block">{formatDate(order?.created_at || order?.date_created)}</div>
                          <div className="hidden md:block">{order?.payment_method_title || order?.payment_method || '—'}</div>
                          <div className="hidden md:block">
                            {formatCurrency(order?.total, order?.currency, order?.currency_symbol)}
                          </div>
                          <div className="hidden md:block">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ${
                                STATUS_STYLES[statusLabel] || 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          <div className="hidden md:flex justify-end">
                            <div className="relative" ref={actionMenuId === order?.id ? actionMenuRef : null}>
                              <button
                                type="button"
                                onClick={() => setActionMenuId((prev) => (prev === order?.id ? null : order?.id))}
                                className="text-slate-400 hover:text-slate-600"
                                aria-label="Order actions"
                                onMouseDown={(event) => event.stopPropagation()}
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="1" />
                                  <circle cx="19" cy="12" r="1" />
                                  <circle cx="5" cy="12" r="1" />
                                </svg>
                              </button>
                              {actionMenuId === order?.id && (
                                <div
                                  className="absolute right-0 top-7 z-30 w-48 rounded-2xl border border-slate-200 bg-white p-2 text-xs shadow-lg"
                                  onMouseDown={(event) => event.stopPropagation()}
                                >
                                  {statusOptions.map((option) => (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => updateOrderStatus(order?.id, option.value)}
                                      disabled={statusUpdatingId === order?.id}
                                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-semibold ${
                                        option.value === String(order?.status || '').toLowerCase()
                                          ? 'bg-slate-100 text-slate-700'
                                          : 'text-slate-600 hover:bg-slate-50'
                                      } ${statusUpdatingId === order?.id ? 'cursor-not-allowed opacity-60' : ''}`}
                                    >
                                      <span>{option.label}</span>
                                      {option.value === String(order?.status || '').toLowerCase() && (
                                        <span className="text-[10px] text-slate-400">Current</span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {statusUpdatingId === order?.id && (
                            <div className="md:col-span-8">
                              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                                <BouncingDotsLoader />
                                <span>Changing order status</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col items-center gap-3 text-xs text-slate-500">
                <p>
                  {displayTotal
                    ? `${ordersFallback ? 'Showing recent entries' : 'Showing entries'} ${startEntry} to ${endEntry} of ${displayTotal}`
                    : 'Showing entries 0 to 0 of 0'}
                </p>
                {ordersFallback && (
                  <p className="text-[11px] text-amber-600">
                    Orders endpoint is blocked by the site security page. Showing recent orders only.
                  </p>
                )}
                <div ref={loadMoreRef} className="flex min-h-[28px] items-center justify-center">
                  {isLoadingMore && <BouncingDotsLoader />}
                  {!hasMore && orders.length > 0 && (
                    <span className="text-[11px] text-slate-400">You reached the end.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default OrdersPage;
