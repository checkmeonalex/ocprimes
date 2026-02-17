'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader';
import BouncingDotsLoader from './components/BouncingDotsLoader';
import {
  fetchConnector,
  getHostname,
  normalizeWpUrl,
  pickSiteForUrl,
  readStoredSiteId,
  readStoredSiteInfo,
} from '@/utils/connector.mjs';

const STATUS_STYLES = {
  Completed: 'bg-emerald-100 text-emerald-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Waiting: 'bg-amber-100 text-amber-700',
  Cancelled: 'bg-rose-100 text-rose-700',
  Refunded: 'bg-slate-100 text-slate-600',
  'On Hold': 'bg-purple-100 text-purple-700',
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

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

const buildCustomerName = (order) => {
  const billing = order?.billing || {};
  const shipping = order?.shipping || {};
  const name = `${billing.first_name || ''} ${billing.last_name || ''}`.trim();
  if (name) return name;
  const shippingName = `${shipping.first_name || ''} ${shipping.last_name || ''}`.trim();
  if (shippingName) return shippingName;
  return 'Guest';
};

const buildAddressLines = (address) => {
  if (!address) return [];
  const lines = [
    address.address_1,
    address.address_2,
    address.city,
    address.state,
    address.postcode,
    address.country,
  ];
  return lines.filter((line) => line && String(line).trim());
};

function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = Array.isArray(params?.orderId) ? params.orderId[0] : params?.orderId;
  const [siteInfo, setSiteInfo] = useState(() => readStoredSiteInfo());
  const [siteId, setSiteId] = useState(() => readStoredSiteId() || siteInfo?.siteId || '');
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const orderNotes = Array.isArray(order?.notes) ? order.notes : [];
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [sendNoteToCustomer, setSendNoteToCustomer] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [itemProductId, setItemProductId] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const actionMenuRef = useRef(null);

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

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    setIsLoading(true);
    setError('');
    try {
      const resolvedSiteId = await resolveSiteId();
      if (!resolvedSiteId) return false;
      const token = localStorage.getItem('agentic_auth_token');
      if (!token) return false;
      const response = await fetchConnector(`/sites/${resolvedSiteId}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = payload?.details ? ` (${payload.details})` : '';
        const target = payload?.target_url ? ` ${payload.target_url}` : '';
        setError(`${payload?.error || 'Failed to load order.'}${detail}${target}`);
        return;
      }
      setOrder(payload?.order || payload);
    } catch (err) {
      setError(err?.message || 'Failed to load order.');
    } finally {
      setIsLoading(false);
    }
  }, [orderId, resolveSiteId]);

  const sendOrderUpdate = useCallback(async (updatePayload) => {
    if (!orderId) return false;
    setIsUpdating(true);
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
        body: JSON.stringify(updatePayload || {}),
      });
      const responsePayload = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = responsePayload?.details ? ` (${responsePayload.details})` : '';
        const target = responsePayload?.target_url ? ` ${responsePayload.target_url}` : '';
        setError(`${responsePayload?.error || 'Failed to update order.'}${detail}${target}`);
        return { ok: false };
      }
      setOrder((prev) => ({ ...prev, ...(responsePayload?.order || responsePayload) }));
      return { ok: true, data: responsePayload };
    } catch (err) {
      setError(err?.message || 'Failed to update order.');
      return { ok: false };
    } finally {
      setIsUpdating(false);
    }
  }, [orderId, resolveSiteId]);

  const updateOrderStatus = useCallback(async (nextStatus) => {
    if (!nextStatus) return;
    const result = await sendOrderUpdate({ status: nextStatus });
    if (result.ok) {
      setActionMenuOpen(false);
    }
  }, [sendOrderUpdate]);

  const handleAddNote = useCallback(async () => {
    if (!noteDraft.trim()) return;
    const result = await sendOrderUpdate({
      action: 'add_note',
      note: noteDraft.trim(),
      customer_note: sendNoteToCustomer,
    });
    if (result.ok) {
      setNoteDraft('');
      setSendNoteToCustomer(false);
      setIsNoteOpen(false);
    }
  }, [noteDraft, sendNoteToCustomer, sendOrderUpdate]);

  const handleAddItem = useCallback(async () => {
    const productIdValue = Number(itemProductId);
    const quantityValue = Math.max(1, Number(itemQuantity || 1));
    if (!productIdValue) {
      setError('Product ID is required to add an item.');
      return;
    }
    const result = await sendOrderUpdate({
      action: 'add_item',
      product_id: productIdValue,
      quantity: quantityValue,
    });
    if (result.ok) {
      setItemProductId('');
      setItemQuantity('1');
      setIsAddItemOpen(false);
    }
  }, [itemProductId, itemQuantity, sendOrderUpdate]);

  const handleSendInvoice = useCallback(async () => {
    await sendOrderUpdate({ action: 'send_invoice' });
  }, [sendOrderUpdate]);

  const handleAddPayment = useCallback(async () => {
    await sendOrderUpdate({ action: 'add_payment' });
  }, [sendOrderUpdate]);

  const handleMarkShipped = useCallback(async () => {
    const result = await sendOrderUpdate({ action: 'mark_shipped', status: 'completed' });
    if (result.ok) {
      setActionMenuOpen(false);
    }
  }, [sendOrderUpdate]);

  const handleSendWhatsApp = useCallback(async () => {
    const result = await sendOrderUpdate({ action: 'send_whatsapp' });
    if (result.ok) {
      const url = result.data?.whatsapp_url;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        setError('Customer has no WhatsApp number.');
      }
    }
  }, [sendOrderUpdate]);

  const handleSendOrderDetails = useCallback(async () => {
    await sendOrderUpdate({ action: 'send_order_details' });
  }, [sendOrderUpdate]);

  const handleResendNewOrderNotification = useCallback(async () => {
    await sendOrderUpdate({ action: 'resend_new_order_notification' });
  }, [sendOrderUpdate]);

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

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!actionMenuRef.current) return;
      if (actionMenuRef.current.contains(event.target)) return;
      setActionMenuOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setActionMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const lineItems = Array.isArray(order?.line_items) ? order.line_items : [];
  const subtotal = lineItems.reduce((sum, item) => sum + (Number(item?.total) || 0), 0);
  const total = Number(order?.total) || 0;
  const statusLabel = normalizeStatus(order?.status);
  const normalizedStatus = String(order?.status || '').toLowerCase();
  const isPaid = ['completed', 'processing'].includes(normalizedStatus);
  const fulfillmentLabel = statusLabel === 'Completed' ? 'Fulfilled' : 'Unfulfilled';
  const currency = order?.currency || '';
  const symbol = order?.currency_symbol || '';
  const paymentLabel = order?.payment_method_title || order?.payment_method || '—';
  const billingLines = buildAddressLines(order?.billing);
  const shippingLines = buildAddressLines(order?.shipping);

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
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/backend/admin/orders')}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm"
                  aria-label="Back to orders"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Orders List / Details</p>
                  <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                    Order ID: {order?.id || orderId}
                  </h1>
                  <p className="mt-1 text-xs text-slate-400">
                    Created {formatDateTime(order?.created_at || order?.date_created)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${fulfillmentLabel === 'Fulfilled' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {fulfillmentLabel}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${STATUS_STYLES[statusLabel] || 'bg-slate-100 text-slate-600'}`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="6" />
                    <path d="m15.5 15.5 4 4" />
                  </svg>
                  <input
                    className="w-40 bg-transparent text-xs text-slate-600 placeholder:text-slate-400 focus:outline-none"
                    placeholder="Search"
                  />
                </div>
                <div className="relative" ref={actionMenuRef}>
                  <button
                    type="button"
                    onClick={() => setActionMenuOpen((prev) => !prev)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm"
                  >
                    Actions
                  </button>
                  {actionMenuOpen && (
                    <div className="absolute right-0 z-20 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-2 text-xs shadow-lg">
                      <button
                        type="button"
                        onClick={handleSendOrderDetails}
                        disabled={isUpdating}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-semibold ${
                          isUpdating ? 'cursor-not-allowed opacity-60' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Send order details
                      </button>
                      <button
                        type="button"
                        onClick={handleResendNewOrderNotification}
                        disabled={isUpdating}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-semibold ${
                          isUpdating ? 'cursor-not-allowed opacity-60' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Resend new order notification
                      </button>
                      <div className="my-1 h-px bg-slate-100" />
                      {statusOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateOrderStatus(option.value)}
                          disabled={isUpdating}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-semibold ${
                            option.value === String(order?.status || '').toLowerCase()
                              ? 'bg-slate-100 text-slate-700'
                              : 'text-slate-600 hover:bg-slate-50'
                          } ${isUpdating ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleMarkShipped}
                  disabled={isUpdating}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Mark as shipped
                </button>
              </div>
            </div>

            {isUpdating && (
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <BouncingDotsLoader />
                <span>Changing order status</span>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600">
                {error}
              </div>
            )}

            {isLoading && (
              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,_2fr)_minmax(0,_1fr)]">
                <div className="space-y-6 animate-pulse">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="h-4 w-40 rounded-full bg-slate-200" />
                        <div className="h-3 w-24 rounded-full bg-slate-100" />
                      </div>
                      <div className="h-7 w-28 rounded-full bg-slate-100" />
                    </div>
                    <div className="mt-4 space-y-3">
                      {[...Array(3)].map((_, idx) => (
                        <div
                          key={`item-skel-${idx}`}
                          className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-slate-200" />
                            <div className="space-y-2">
                              <div className="h-3 w-36 rounded-full bg-slate-200" />
                              <div className="h-3 w-24 rounded-full bg-slate-100" />
                            </div>
                          </div>
                          <div className="h-3 w-16 rounded-full bg-slate-200" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-32 rounded-full bg-slate-200" />
                      <div className="h-7 w-24 rounded-full bg-slate-100" />
                    </div>
                    <div className="mt-4 space-y-3">
                      {[...Array(4)].map((_, idx) => (
                        <div key={`sum-skel-${idx}`} className="flex items-center justify-between">
                          <div className="h-3 w-24 rounded-full bg-slate-100" />
                          <div className="h-3 w-16 rounded-full bg-slate-200" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-6 animate-pulse">
                  {[...Array(4)].map((_, idx) => (
                    <div key={`side-skel-${idx}`} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="h-4 w-32 rounded-full bg-slate-200" />
                      <div className="mt-4 space-y-2">
                        <div className="h-3 w-full rounded-full bg-slate-100" />
                        <div className="h-3 w-3/4 rounded-full bg-slate-100" />
                        <div className="h-3 w-2/3 rounded-full bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isLoading && order && (
              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,_2fr)_minmax(0,_1fr)]">
                <div className="space-y-6">
                  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Products ({lineItems.length})</p>
                        <p className="mt-1 text-xs text-slate-400">Items in this order.</p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                        {formatDate(order?.created_at || order?.date_created)}
                      </span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {lineItems.map((item, index) => (
                        <div key={item?.id || item?.name} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <div className="flex items-center gap-3">
                            {item?.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item?.name || 'Order item'}
                                className="h-10 w-10 rounded-2xl object-cover"
                              />
                            ) : (
                              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-400">
                                <span className="text-sm font-semibold">
                                  {String(item?.name || `Item ${index + 1}`).slice(0, 1)}
                                </span>
                              </span>
                            )}
                            <div>
                              <p className="text-sm font-semibold text-slate-700">{item?.name || 'Order item'}</p>
                              <p className="text-[11px] text-slate-400">Qty: {item?.quantity || 0}</p>
                              <p className="text-[11px] text-slate-400">
                                Price: {formatCurrency(item?.total, currency, symbol)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-[11px] text-slate-500">
                            <p className="font-semibold text-slate-700">{formatCurrency(item?.total, currency, symbol)}</p>
                            <button type="button" className="mt-1 text-slate-400 hover:text-slate-600">
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="19" cy="12" r="1" />
                                <circle cx="5" cy="12" r="1" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                      {!lineItems.length && (
                        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-xs text-slate-400">
                          No line items available.
                        </div>
                      )}
                      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
                        <span>Extra information about order management</span>
                        <button
                          type="button"
                          onClick={() => setIsAddItemOpen(true)}
                          className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-500"
                        >
                          Add item
                        </button>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">Order Summary</p>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                        {paymentLabel}
                      </span>
                    </div>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>Subtotal</span>
                        <span className="font-semibold text-slate-700">
                          {formatCurrency(subtotal, currency, symbol)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Discount</span>
                        <span className="font-semibold text-slate-700">
                          {formatCurrency(0, currency, symbol)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Shipping</span>
                        <span className="font-semibold text-slate-700">
                          {formatCurrency(0, currency, symbol)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Total</span>
                        <span className="text-base font-semibold text-slate-900">
                          {formatCurrency(total, currency, symbol)}
                        </span>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                        Paid by customer
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
                        Payment due
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleSendInvoice}
                          disabled={isUpdating}
                          className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Send invoice
                        </button>
                        <button
                          type="button"
                          onClick={handleAddPayment}
                          disabled={isUpdating}
                          className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Add payment
                        </button>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">Notes</p>
                      <button
                        type="button"
                        onClick={() => setIsNoteOpen(true)}
                        className="text-[11px] font-semibold text-slate-400"
                      >
                        Edit
                      </button>
                    </div>
                    {orderNotes.length ? (
                      <div className="mt-3 space-y-2">
                        {orderNotes.map((note) => (
                          <div key={note.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            <p className="font-semibold text-slate-700">{note.customer_note ? 'Customer note' : 'Private note'}</p>
                            <p className="mt-1">{note.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-slate-400">No notes added yet.</p>
                    )}
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">Customer info</p>
                      <button type="button" className="text-[11px] font-semibold text-slate-400">Edit</button>
                    </div>
                    <div className="mt-3 space-y-2 text-xs text-slate-600">
                      <p>{buildCustomerName(order)}</p>
                      <p>{order?.billing?.email || '—'}</p>
                      <p>{order?.billing?.phone || '—'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendWhatsApp}
                      disabled={isUpdating}
                      className="mt-4 w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Send WhatsApp Message
                    </button>
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">Shipping address</p>
                      <button type="button" className="text-[11px] font-semibold text-slate-400">Edit</button>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-slate-600">
                      {shippingLines.length ? shippingLines.map((line) => (
                        <p key={line}>{line}</p>
                      )) : <p>—</p>}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">Billing address</p>
                      <button type="button" className="text-[11px] font-semibold text-slate-400">Edit</button>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-slate-600">
                      {billingLines.length ? billingLines.map((line) => (
                        <p key={line}>{line}</p>
                      )) : <p>—</p>}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">Timeline</p>
                    <div className="mt-3 space-y-2 text-xs text-slate-500">
                      <p>Created: {formatDateTime(order?.created_at || order?.date_created)}</p>
                      <p>Updated: {formatDateTime(order?.updated_at || order?.date_modified)}</p>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {isNoteOpen && (
              <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 px-4">
                <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Add note</p>
                    <button
                      type="button"
                      onClick={() => setIsNoteOpen(false)}
                      className="text-xs font-semibold text-slate-400"
                    >
                      Close
                    </button>
                  </div>
                  <textarea
                    className="mt-4 h-28 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700"
                    placeholder="Write a note for this order..."
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                  />
                  <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={sendNoteToCustomer}
                      onChange={(event) => setSendNoteToCustomer(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900"
                    />
                    Send note to customer
                  </label>
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsNoteOpen(false)}
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddNote}
                      disabled={isUpdating}
                      className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Save note
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isAddItemOpen && (
              <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 px-4">
                <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Add item</p>
                    <button
                      type="button"
                      onClick={() => setIsAddItemOpen(false)}
                      className="text-xs font-semibold text-slate-400"
                    >
                      Close
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500">Product ID</p>
                      <input
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700"
                        placeholder="e.g. 24562"
                        value={itemProductId}
                        onChange={(event) => setItemProductId(event.target.value)}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500">Quantity</p>
                      <input
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700"
                        value={itemQuantity}
                        onChange={(event) => setItemQuantity(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddItemOpen(false)}
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={isUpdating}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Add item
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default OrderDetailPage;
