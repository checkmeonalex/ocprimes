import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchConnector,
  getHostname,
  normalizeWpUrl,
  pickSiteForUrl,
  readStoredSiteId,
  readStoredSiteInfo,
} from '../../../../utils/connector';
import BouncingDotsLoader from '../components/BouncingDotsLoader';
import LazyImage from '../components/LazyImage';
import CustomerRowSkeleton from './components/CustomerRowSkeleton';
import AdminSidebar from '@/components/AdminSidebar';

const CUSTOMERS_PAGE_SIZE = 10;
const JOB_TITLE_META_KEY = process.env.REACT_APP_WP_JOB_TITLE_META_KEY || 'job_title';

const buildInitials = (name) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

function WooCommerceCustomersPage() {
  const router = useRouter();
  const [siteInfo, setSiteInfo] = useState(() => readStoredSiteInfo());
  const [siteId, setSiteId] = useState(() => readStoredSiteId() || siteInfo?.siteId || '');
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const isLoadingRef = useRef(false);
  const loadMoreRef = useRef(null);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);

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
    if (!site) return;
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
    const nextSiteInfo = {
      name: resolvedName,
      logoUrl: logoUrl || '',
      url: normalizedUrl || siteUrl,
      siteId: resolvedSiteId || '',
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
    const targetUrl = siteInfo?.url || storedSite?.url || '';
    const selectedSite = pickSiteForUrl(payload.sites, targetUrl);
    if (!selectedSite) {
      return '';
    }
    applySiteInfo(selectedSite);
    if (typeof selectedSite.id === 'string') {
      return selectedSite.id;
    }
    return typeof selectedSite.site_id === 'string' ? selectedSite.site_id : '';
  }, [applySiteInfo, siteId, siteInfo]);

  const loadCustomers = useCallback(
    async (requestedPage, replace = false) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      setIsLoading(true);
      setError('');
      try {
        const resolvedSiteId = siteId || (await resolveSiteId());
        if (!resolvedSiteId) {
          throw new Error('Connect a store to load customers.');
        }
        const token = localStorage.getItem('agentic_auth_token');
        if (!token) {
          throw new Error('Sign in to load customers.');
        }
        const params = new URLSearchParams({
          per_page: CUSTOMERS_PAGE_SIZE.toString(),
          page: requestedPage.toString(),
          job_title_key: JOB_TITLE_META_KEY,
        });
        params.set('roles', 'all');
        if (searchTerm.trim()) {
          params.set('search', searchTerm.trim());
        }
        const response = await fetchConnector(
          `/sites/${resolvedSiteId}/customers?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          const message = payload?.error || 'Unable to load customers.';
          throw new Error(message);
        }
        const nextItems = Array.isArray(payload?.items) ? payload.items : [];
        setCustomers((prev) => (replace ? nextItems : [...prev, ...nextItems]));
        setPage(requestedPage);
        const nextHasMore = nextItems.length > 0;
        setHasMore(nextHasMore);
      } catch (err) {
        setError(err?.message || 'Unable to load customers.');
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [resolveSiteId, searchTerm, siteId],
  );

  useEffect(() => {
    const handle = setTimeout(() => {
      setCustomers([]);
      setPage(1);
      setHasMore(true);
      setHasUserScrolled(false);
      loadCustomers(1, true);
    }, 300);
    return () => clearTimeout(handle);
  }, [loadCustomers, searchTerm]);

  useEffect(() => {
    if (hasUserScrolled) {
      return;
    }
    const markScrolled = () => {
      setHasUserScrolled(true);
    };
    window.addEventListener('scroll', markScrolled, { passive: true });
    window.addEventListener('wheel', markScrolled, { passive: true });
    window.addEventListener('touchmove', markScrolled, { passive: true });
    return () => {
      window.removeEventListener('scroll', markScrolled);
      window.removeEventListener('wheel', markScrolled);
      window.removeEventListener('touchmove', markScrolled);
    };
  }, []);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!hasUserScrolled) return;
        if (!customers.length || !hasMore || isLoadingRef.current) return;
        loadCustomers(page + 1);
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [customers.length, hasMore, hasUserScrolled, loadCustomers, page]);


  const siteName = siteInfo?.name || 'Store';
  const siteLogo = siteInfo?.logoUrl || '';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Customers</p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">Contacts</h1>
                <p className="mt-2 text-sm text-slate-500">Review the latest WooCommerce customers and shoppers.</p>
              </div>
              <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
                <div className="flex w-full max-w-md items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm sm:w-auto">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="6" />
                    <path d="m15.5 15.5 4 4" />
                  </svg>
                  <input
                    className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none sm:w-56"
                    placeholder="Search customers"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>
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

            <div className="mt-8">
              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Customers</p>
                    <p className="text-sm font-semibold text-slate-700">{customers.length} loaded</p>
                  </div>
                </div>
                <div className="px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  <div className="hidden grid-cols-[minmax(180px,_2fr)_minmax(120px,_1.2fr)_minmax(120px,_1fr)_minmax(180px,_2fr)_minmax(80px,_0.8fr)] gap-4 sm:grid">
                    <span>Name</span>
                    <span>Job title</span>
                    <span>Phone</span>
                    <span>Email</span>
                    <span className="text-right">User ID</span>
                  </div>
                  <div className="flex items-center justify-between sm:hidden">
                    <span>Name</span>
                    <span>User ID</span>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {!customers.length && isLoading &&
                    Array.from({ length: 6 }).map((_, index) => (
                      <CustomerRowSkeleton key={`customer-skeleton-${index}`} />
                    ))}
                  {customers.map((customer) => (
                    <div
                      key={customer.id}
                      className="relative flex w-full flex-col gap-3 overflow-visible px-6 py-3 text-left text-sm transition hover:bg-slate-50 sm:grid sm:grid-cols-[minmax(180px,_2fr)_minmax(120px,_1.2fr)_minmax(120px,_1fr)_minmax(180px,_2fr)_minmax(80px,_0.8fr)] sm:items-center sm:gap-4"
                    >
                      <div className="flex w-full items-center justify-between sm:w-auto">
                        <div className="flex items-center gap-3">
                          {customer.avatar_url ? (
                            <div className="relative h-10 w-10 overflow-hidden rounded-full bg-slate-200">
                              <LazyImage
                                src={customer.avatar_url}
                                alt={customer.name || 'Customer'}
                                className="rounded-full"
                              />
                            </div>
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-500">
                              {buildInitials(customer.name)}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => router.push(`/backend/admin/customers/${customer.id}`)}
                            className="text-left focus:outline-none"
                          >
                            <p className="text-sm font-semibold text-slate-700">
                              {customer.name || 'Unknown'}
                            </p>
                            <p className="text-xs text-slate-500 sm:hidden">
                              {customer.email || '--'}
                            </p>
                            <p className="hidden text-xs text-slate-400 sm:block">#{customer.id}</p>
                          </button>
                        </div>
                        <span className="ml-3 shrink-0 text-xs font-semibold text-slate-500 sm:hidden">
                          #{customer.id}
                        </span>
                      </div>
                      <p className="hidden text-xs font-semibold text-slate-600 sm:block">
                        {customer.job_title || '--'}
                      </p>
                      <p className="hidden text-xs text-slate-500 sm:block">{customer.phone || '--'}</p>
                      <p className="hidden text-xs text-slate-500 sm:block">{customer.email || '--'}</p>
                      <p className="hidden text-xs font-semibold text-slate-500 text-right sm:block">
                        {customer.id}
                      </p>
                    </div>
                  ))}
                  {!customers.length && !isLoading && (
                    <div className="px-6 py-8 text-center text-sm text-slate-400">No customers yet.</div>
                  )}
                </div>
                <div ref={loadMoreRef} className="h-6" />
                <div className="flex items-center justify-center px-6 pb-4">
                  {isLoading && (
                    <BouncingDotsLoader className="text-slate-400" dotClassName="bg-slate-400" />
                  )}
                  {!isLoading && hasMore && (
                    <button
                      type="button"
                      onClick={() => loadCustomers(page + 1)}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500"
                    >
                      Load next
                    </button>
                  )}
                  {!isLoading && !hasMore && customers.length > 0 && (
                    <p className="text-xs text-slate-400">No more customers.</p>
                  )}
                </div>
                {error && <p className="px-6 py-3 text-xs text-rose-500">{error}</p>}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default WooCommerceCustomersPage;
