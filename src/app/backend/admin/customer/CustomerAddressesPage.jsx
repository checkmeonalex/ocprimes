import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
const ADDRESS_META_KEYS = [
  'first_name',
  'last_name',
  'billing_first_name',
  'billing_last_name',
  'billing_company',
  'billing_address_1',
  'billing_address_2',
  'billing_city',
  'billing_postcode',
  'billing_country',
  'billing_state',
  'billing_state_code',
  'billing_phone',
  'billing_email',
  'shipping_first_name',
  'shipping_last_name',
  'shipping_company',
  'shipping_address_1',
  'shipping_address_2',
  'shipping_city',
  'shipping_postcode',
  'shipping_country',
  'shipping_state',
  'shipping_state_code',
  'shipping_phone',
  'shipping_email',
  'whatsapp_number',
  'whatsapp',
];


const buildInitials = (name) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

const InfoField = ({ label, value }) => (
  <label className="space-y-2 text-xs font-semibold text-slate-500">
    <span className="uppercase tracking-[0.2em]">{label}</span>
    <input
      readOnly
      value={value || ''}
      placeholder="--"
      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
    />
  </label>
);

function WooCommerceCustomerAddressesPage() {
  const params = useParams();
  const customerId = Array.isArray(params?.customerId) ? params.customerId[0] : params?.customerId;
  const [siteInfo, setSiteInfo] = useState(() => readStoredSiteInfo());
  const [siteId, setSiteId] = useState(() => readStoredSiteId() || siteInfo?.siteId || '');
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [useBillingForShipping, setUseBillingForShipping] = useState(false);

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

  useEffect(() => {
    setUseBillingForShipping(false);
  }, [customerId]);

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
        user_meta_keys: ADDRESS_META_KEYS.join(','),
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
  const billingFirstName = meta.billing_first_name || meta.first_name || '';
  const billingLastName = meta.billing_last_name || meta.last_name || '';
  const billingCompany = meta.billing_company || '';
  const billingAddress1 = meta.billing_address_1 || '';
  const billingAddress2 = meta.billing_address_2 || '';
  const billingCity = meta.billing_city || '';
  const billingPostcode = meta.billing_postcode || '';
  const billingCountry = meta.billing_country || '';
  const billingState = meta.billing_state || '';
  const billingStateCode = meta.billing_state_code || billingState || '';
  const billingPhone = meta.billing_phone || customer?.phone || '';
  const billingEmail = meta.billing_email || customer?.email || '';

  const shippingFirstName = meta.shipping_first_name || '';
  const shippingLastName = meta.shipping_last_name || '';
  const shippingCompany = meta.shipping_company || '';
  const shippingAddress1 = meta.shipping_address_1 || '';
  const shippingAddress2 = meta.shipping_address_2 || '';
  const shippingCity = meta.shipping_city || '';
  const shippingPostcode = meta.shipping_postcode || '';
  const shippingCountry = meta.shipping_country || '';
  const shippingState = meta.shipping_state || '';
  const shippingStateCode = meta.shipping_state_code || shippingState || '';
  const shippingPhone = meta.shipping_phone || '';
  const shippingEmail = meta.shipping_email || '';

  const whatsappNumber = meta.whatsapp_number || meta.whatsapp || '';

  const billingFields = {
    firstName: billingFirstName,
    lastName: billingLastName,
    company: billingCompany,
    address1: billingAddress1,
    address2: billingAddress2,
    city: billingCity,
    postcode: billingPostcode,
    country: billingCountry,
    state: billingState,
    stateCode: billingStateCode,
    phone: billingPhone,
    email: billingEmail,
  };

  const shippingFields = useBillingForShipping
    ? {
        firstName: billingFirstName,
        lastName: billingLastName,
        company: billingCompany,
        address1: billingAddress1,
        address2: billingAddress2,
        city: billingCity,
        postcode: billingPostcode,
        country: billingCountry,
        state: billingState,
        stateCode: billingStateCode,
        phone: billingPhone,
        email: billingEmail,
      }
    : {
        firstName: shippingFirstName,
        lastName: shippingLastName,
        company: shippingCompany,
        address1: shippingAddress1,
        address2: shippingAddress2,
        city: shippingCity,
        postcode: shippingPostcode,
        country: shippingCountry,
        state: shippingState,
        stateCode: shippingStateCode,
        phone: shippingPhone,
        email: shippingEmail,
      };

  const activeTab = 'Addresses';
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

  const siteName = siteInfo?.name || 'Store';
  const siteLogo = siteInfo?.logoUrl || '';
  const displayName = customer?.name || 'Customer';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Customers</p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">Addresses</h1>
                <p className="mt-2 text-sm text-slate-500">{displayName}</p>
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

            <div className="mt-6 flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white p-1 text-xs font-semibold text-slate-500">
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

            <div className="mt-8 space-y-6">
              {isLoading && (
                <>
                  <CustomerSkeletonCard rows={8} />
                  <CustomerSkeletonCard rows={8} />
                </>
              )}
              {error && <p className="text-sm text-rose-500">{error}</p>}

              {!isLoading && !error && (
                <>
                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                    {customer?.avatar_url ? (
                      <img
                        src={customer.avatar_url}
                        alt={displayName}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                        {buildInitials(displayName)}
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                      <p className="text-xs text-slate-500">Customer billing address</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <InfoField label="First name" value={billingFields.firstName} />
                    <InfoField label="Last name" value={billingFields.lastName} />
                    <InfoField label="Company" value={billingFields.company} />
                    <InfoField label="Address line 1" value={billingFields.address1} />
                    <InfoField label="Address line 2" value={billingFields.address2} />
                    <InfoField label="City" value={billingFields.city} />
                    <InfoField label="Postcode / ZIP" value={billingFields.postcode} />
                    <InfoField label="Country / Region" value={billingFields.country} />
                    <InfoField label="State / County" value={billingFields.state} />
                    <InfoField
                      label="State / County or state code"
                      value={billingFields.stateCode}
                    />
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <InfoField label="Phone" value={billingFields.phone} />
                    <InfoField label="Email address" value={billingFields.email} />
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Customer shipping address</p>
                      <p className="text-xs text-slate-500">Copy from billing address</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseBillingForShipping(true)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300"
                    >
                      Copy
                    </button>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <InfoField label="First name" value={shippingFields.firstName} />
                    <InfoField label="Last name" value={shippingFields.lastName} />
                    <InfoField label="Company" value={shippingFields.company} />
                    <InfoField label="Address line 1" value={shippingFields.address1} />
                    <InfoField label="Address line 2" value={shippingFields.address2} />
                    <InfoField label="City" value={shippingFields.city} />
                    <InfoField label="Postcode / ZIP" value={shippingFields.postcode} />
                    <InfoField label="Country / Region" value={shippingFields.country} />
                    <InfoField label="State / County" value={shippingFields.state} />
                    <InfoField
                      label="State / County or state code"
                      value={shippingFields.stateCode}
                    />
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <InfoField label="Phone" value={shippingFields.phone} />
                    <InfoField label="Email address" value={shippingFields.email} />
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">WhatsApp Information</p>
                  <p className="mt-1 text-xs text-slate-500">Customer messaging profile</p>
                  <div className="mt-5">
                    <InfoField label="WhatsApp Number" value={whatsappNumber} />
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
        </main>
      </div>
    </div>
  );
}

export default WooCommerceCustomerAddressesPage;
