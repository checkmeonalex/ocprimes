import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  fetchConnector,
  getHostname,
  normalizeWpUrl,
  pickSiteForUrl,
  readStoredSiteId,
  readStoredSiteInfo,
} from '../../../../utils/connector';
import AdminSidebar from '@/components/AdminSidebar';
import CustomerSkeletonCard from './components/CustomerSkeletonCard';
const JOB_TITLE_META_KEY = process.env.REACT_APP_WP_JOB_TITLE_META_KEY || 'job_title';
const CUSTOMER_META_KEYS = [
  'first_name',
  'last_name',
  'billing_first_name',
  'billing_last_name',
  'billing_phone',
  'billing_company',
  'billing_address_1',
  'billing_address_2',
  'billing_city',
  'billing_state',
  'billing_postcode',
  'billing_country',
];


const buildInitials = (name) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

const splitName = (name) => {
  if (!name) return { firstName: '', lastName: '' };
  const parts = name.trim().split(' ').filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
};

function WooCommerceCustomerDetailPage() {
  const params = useParams();
  const customerId = Array.isArray(params?.customerId) ? params.customerId[0] : params?.customerId;
  const router = useRouter();
  const [siteInfo, setSiteInfo] = useState(() => readStoredSiteInfo());
  const [siteId, setSiteId] = useState(() => readStoredSiteId() || siteInfo?.siteId || '');
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

  const loadCustomer = useCallback(async () => {
    if (!customerId) return;
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
        per_page: '1',
        page: '1',
        include: customerId,
        job_title_key: JOB_TITLE_META_KEY,
        user_meta_keys: CUSTOMER_META_KEYS.join(','),
      });
      const response = await fetchConnector(
        `/sites/${resolvedSiteId}/customers?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to load customer.');
      }
      const item = Array.isArray(payload?.items) ? payload.items[0] : null;
      if (!item) {
        throw new Error('Customer not found.');
      }
      setCustomer(item);
    } catch (err) {
      setError(err?.message || 'Unable to load customer.');
    } finally {
      setIsLoading(false);
    }
  }, [customerId, resolveSiteId, siteId]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  const meta = customer?.meta || {};
  const nameParts = splitName(customer?.name || '');
  const firstName =
    meta.billing_first_name || meta.first_name || nameParts.firstName || '';
  const lastName =
    meta.billing_last_name || meta.last_name || nameParts.lastName || '';
  const email = customer?.email || '';
  const phone = customer?.phone || meta.billing_phone || '';
  const company = meta.billing_company || '';
  const address1 = meta.billing_address_1 || '';
  const address2 = meta.billing_address_2 || '';
  const city = meta.billing_city || '';
  const state = meta.billing_state || '';
  const postcode = meta.billing_postcode || '';
  const country = meta.billing_country || '';

  const siteName = siteInfo?.name || 'Store';
  const siteLogo = siteInfo?.logoUrl || '';
  const activeTab = 'Profile';
  const detailTabs = useMemo(
    () => [
      { label: 'Profile', path: `/backend/admin/customers/${customerId || ''}` },
      { label: 'Contact info', path: `/backend/admin/customers/${customerId || ''}/contact` },
      { label: 'Addresses', path: `/backend/admin/customers/${customerId || ''}/addresses` },
      { label: 'About the user', path: `/backend/admin/customers/${customerId || ''}/about` },
      { label: 'Security', path: `/backend/admin/customers/${customerId || ''}/security` },
    ],
    [customerId],
  );
  const mobileNavItems = useMemo(
    () => [
      {
        label: 'Contact info',
        description: 'Email & phone number',
        path: `/backend/admin/customers/${customerId || ''}/contact`,
      },
      {
        label: 'Addresses',
        description: 'Billing & shipping',
        path: `/backend/admin/customers/${customerId || ''}/addresses`,
      },
      {
        label: 'About the user',
        description: 'Bio & personal info',
        path: `/backend/admin/customers/${customerId || ''}/about`,
      },
      {
        label: 'Security',
        description: 'Password & authentication',
        path: `/backend/admin/customers/${customerId || ''}/security`,
      },
    ],
    [customerId],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Customers</p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">Customer onboarding</h1>
                <p className="mt-2 text-sm text-slate-500">
                  {customer?.name || 'Customer details'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/backend/admin/customers"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300"
                >
                  Back to customers
                </Link>
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

            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:hidden">
              <p className="text-sm font-semibold text-slate-900">Profile</p>
              <p className="mt-1 text-xs text-slate-500">User details & preferences</p>
              <div className="mt-5 space-y-3">
                {mobileNavItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => router.push(item.path)}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left transition hover:border-slate-300"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                      <p className="text-[11px] text-slate-400">{item.description}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                      Open
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <div className="mt-6 hidden flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white p-1 text-xs font-semibold text-slate-500 lg:flex">
              {detailTabs.map((tab) => (
                <Link
                  key={tab.label}
                  href={tab.path}
                  className={`rounded-full px-4 py-2 transition ${
                    tab.label === activeTab
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>

            <div className="mt-8 hidden space-y-6 lg:block">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                  {customer?.avatar_url ? (
                    <img
                      src={customer.avatar_url}
                      alt={customer.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                      {buildInitials(customer?.name || '')}
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{customer?.name || 'Customer'}</p>
                    <p className="text-xs text-slate-500">User ID: {customer?.id || '--'}</p>
                  </div>
                  <div className="ml-auto rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-500">
                    {customer?.job_title || 'Customer'}
                  </div>
                </div>

                {isLoading && (
                  <CustomerSkeletonCard
                    withContainer={false}
                    showHeader={false}
                    rows={6}
                    className="mt-6"
                  />
                )}
                {error && <p className="mt-6 text-sm text-rose-500">{error}</p>}

                {!isLoading && !error && (
                  <div className="mt-6 space-y-5">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Welcome to the customer page</p>
                      <p className="text-xs text-slate-500">
                        Review the customer profile, contact details, and billing info.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-xs font-semibold text-slate-500">
                        <span className="uppercase tracking-[0.2em]">First name</span>
                        <input
                          readOnly
                          value={firstName}
                          placeholder="--"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                        />
                      </label>
                      <label className="space-y-2 text-xs font-semibold text-slate-500">
                        <span className="uppercase tracking-[0.2em]">Last name</span>
                        <input
                          readOnly
                          value={lastName}
                          placeholder="--"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                        />
                      </label>
                    </div>

                    <label className="space-y-2 text-xs font-semibold text-slate-500">
                      <span className="uppercase tracking-[0.2em]">Customer name or company</span>
                      <input
                        readOnly
                        value={company || customer?.name || ''}
                        placeholder="--"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                      />
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-xs font-semibold text-slate-500">
                        <span className="uppercase tracking-[0.2em]">Email address</span>
                        <input
                          readOnly
                          value={email}
                          placeholder="--"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                        />
                      </label>
                      <label className="space-y-2 text-xs font-semibold text-slate-500">
                        <span className="uppercase tracking-[0.2em]">Mobile number</span>
                        <input
                          readOnly
                          value={phone}
                          placeholder="--"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                        />
                      </label>
                    </div>

                    <label className="space-y-2 text-xs font-semibold text-slate-500">
                      <span className="uppercase tracking-[0.2em]">Address</span>
                      <input
                        readOnly
                        value={[address1, address2].filter(Boolean).join(' ')}
                        placeholder="--"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                      />
                    </label>

                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="space-y-2 text-xs font-semibold text-slate-500">
                        <span className="uppercase tracking-[0.2em]">Country</span>
                        <input
                          readOnly
                          value={country}
                          placeholder="--"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                        />
                      </label>
                      <label className="space-y-2 text-xs font-semibold text-slate-500">
                        <span className="uppercase tracking-[0.2em]">State / Province</span>
                        <input
                          readOnly
                          value={state}
                          placeholder="--"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                        />
                      </label>
                      <label className="space-y-2 text-xs font-semibold text-slate-500">
                        <span className="uppercase tracking-[0.2em]">Postal code</span>
                        <input
                          readOnly
                          value={postcode}
                          placeholder="--"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => router.back()}
                        className="rounded-full border border-slate-200 bg-white px-6 py-2 text-sm font-semibold text-slate-600"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        className="rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </section>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default WooCommerceCustomerDetailPage;
