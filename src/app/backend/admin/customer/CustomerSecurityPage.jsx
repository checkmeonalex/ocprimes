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
import LoadingButton from '../../../../components/LoadingButton';
const JOB_TITLE_META_KEY = process.env.REACT_APP_WP_JOB_TITLE_META_KEY || 'job_title';

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_+';
const PASSWORD_LENGTH = 16;

const generatePassword = () => {
  const chars = PASSWORD_CHARS;
  const length = PASSWORD_LENGTH;
  let result = '';
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const values = new Uint32Array(length);
    window.crypto.getRandomValues(values);
    for (let index = 0; index < length; index += 1) {
      result += chars[values[index] % chars.length];
    }
  } else {
    for (let index = 0; index < length; index += 1) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return result;
};



const buildInitials = (name) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

function WooCommerceCustomerSecurityPage() {
  const params = useParams();
  const customerId = Array.isArray(params?.customerId) ? params.customerId[0] : params?.customerId;
  const [siteInfo, setSiteInfo] = useState(() => readStoredSiteInfo());
  const [siteId, setSiteId] = useState(() => readStoredSiteId() || siteInfo?.siteId || '');
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [newPassword, setNewPassword] = useState(() => generatePassword());
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

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
    setNewPassword(generatePassword());
  }, [customerId]);

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

  const handleSavePassword = useCallback(async () => {
    if (!customerId) return;
    setSaveMessage('');
    setSaveError('');
    if (!newPassword) {
      setSaveError('Password is required.');
      return;
    }
    setIsSaving(true);
    try {
      const resolvedSiteId = siteId || (await resolveSiteId());
      if (!resolvedSiteId) {
        throw new Error('Connect a store to update the password.');
      }
      const token = localStorage.getItem('agentic_auth_token');
      if (!token) {
        throw new Error('Sign in to update the password.');
      }
      const response = await fetchConnector(
        `/sites/${resolvedSiteId}/customers/${customerId}/password`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password: newPassword }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to update password.');
      }
      setSaveMessage('Password updated successfully.');
    } catch (err) {
      setSaveError(err?.message || 'Unable to update password.');
    } finally {
      setIsSaving(false);
    }
  }, [customerId, newPassword, resolveSiteId, siteId]);

  const handleSendReset = useCallback(async () => {
    if (!customerId) return;
    setResetMessage('');
    setResetError('');
    setIsSending(true);
    try {
      const resolvedSiteId = siteId || (await resolveSiteId());
      if (!resolvedSiteId) {
        throw new Error('Connect a store to send reset links.');
      }
      const token = localStorage.getItem('agentic_auth_token');
      if (!token) {
        throw new Error('Sign in to send reset links.');
      }
      const response = await fetchConnector(
        `/sites/${resolvedSiteId}/customers/${customerId}/password-reset`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to send reset link.');
      }
      const recipient = payload?.email || customer?.email || 'the customer';
      setResetMessage(`Reset link sent to ${recipient}.`);
    } catch (err) {
      setResetError(err?.message || 'Unable to send reset link.');
    } finally {
      setIsSending(false);
    }
  }, [customerId, customer?.email, resolveSiteId, siteId]);

  const activeTab = 'Security';
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
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">Security</h1>
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
              {isLoading && <CustomerSkeletonCard rows={6} />}
              {error && <p className="text-sm text-rose-500">{error}</p>}

              {!isLoading && !error && (
                <>
                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">New Password</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Generate a new password and save it directly to the customer account.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewPassword(generatePassword())}
                        className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300"
                      >
                        Regenerate
                      </button>
                    </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="min-w-[240px] flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                    />
                    <LoadingButton
                      type="button"
                      onClick={handleSavePassword}
                      isLoading={isSaving}
                      className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Save new password"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </LoadingButton>
                  </div>
                  {saveMessage && <p className="mt-3 text-xs text-emerald-600">{saveMessage}</p>}
                  {saveError && <p className="mt-3 text-xs text-rose-500">{saveError}</p>}
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">Password Reset</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Send {displayName} a link to reset their password. This will not change their
                    password, nor will it force a change.
                  </p>
                  <LoadingButton
                    type="button"
                    onClick={handleSendReset}
                    isLoading={isSending}
                    className="mt-4 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Send reset link
                  </LoadingButton>
                  {resetMessage && <p className="mt-3 text-xs text-emerald-600">{resetMessage}</p>}
                  {resetError && <p className="mt-3 text-xs text-rose-500">{resetError}</p>}
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

export default WooCommerceCustomerSecurityPage;
