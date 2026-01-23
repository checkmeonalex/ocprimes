import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  fetchConnector,
  getHostname,
  normalizeWpUrl,
  pickSiteForUrl,
  readStoredSiteInfo,
} from '../../../utils/connector';

const CHAT_API_URL = process.env.REACT_APP_CHAT_API_URL || 'http://localhost:4000';

const storeSiteInfo = (site) => {
  if (!site) return;
  const siteId =
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
  if (!resolvedName && !normalizedUrl) return;
  try {
    localStorage.setItem(
      'agentic_wp_site',
      JSON.stringify({
        name: resolvedName,
        logoUrl: logoUrl || '',
        url: normalizedUrl || siteUrl,
        siteId: siteId || '',
      }),
    );
    if (siteId) {
      localStorage.setItem('agentic_wp_site_id', siteId);
    }
  } catch (_error) {}
};

const PLUGIN_DOWNLOAD_URL =
  process.env.REACT_APP_WOOCOMMERCE_PLUGIN_URL ||
  `${CHAT_API_URL.replace(/\/$/, '')}/download/woocommerce-plugin`;

const resolveConnectorError = (err, fallback) => {
  if (err?.message === 'Failed to fetch') {
    return 'Unable to reach the connector. Check REACT_APP_CONNECTOR_URL and connector CORS settings.';
  }
  return err?.message || fallback;
};

function WooCommerceLandingPage() {
  const router = useRouter();
  const [storeUrl, setStoreUrl] = useState('');
  const [pluginApiKey, setPluginApiKey] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [connectionTone, setConnectionTone] = useState('info');
  const [lastMethod, setLastMethod] = useState('plugin');

  const handleConnect = async () => {
    if (!storeUrl.trim() || !pluginApiKey.trim()) {
      setError('Add your store URL and API key to continue.');
      return;
    }
    setError('');
    setIsChecking(true);
    setConnectionStatus('');
    setLastMethod('plugin');
    try {
      const token = localStorage.getItem('agentic_auth_token');
      const response = await fetchConnector('/sites/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          site_url: storeUrl.trim(),
          api_key: pluginApiKey.trim(),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to register site.');
      }
      storeSiteInfo({
        site_id: payload?.site_id || payload?.id || '',
        site_url: payload?.site_url || storeUrl.trim(),
        site_name: payload?.site_name,
        site_logo_url: payload?.site_logo_url,
      });
      setConnectionTone('success');
      setConnectionStatus(`Connected to ${storeUrl.trim()}`);
      router.push('/backend/admin/dashboard');
    } catch (err) {
      setError(resolveConnectorError(err, 'Unable to register site.'));
    } finally {
      setIsChecking(false);
    }
  };

  const handleRefreshConnection = async () => {
    if (isChecking) return;
    setIsChecking(true);
    setError('');
    setConnectionStatus('');
    setLastMethod('plugin');
    try {
      const token = localStorage.getItem('agentic_auth_token');
      const response = await fetchConnector('/sites', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to check connection.');
      }
      if (payload?.sites?.length) {
        const storedSite = readStoredSiteInfo();
        const targetUrl = storeUrl.trim() || storedSite?.url || '';
        const selectedSite = pickSiteForUrl(payload.sites, targetUrl);
        const siteUrl =
          typeof selectedSite?.site_url === 'string'
            ? selectedSite.site_url
            : typeof selectedSite?.url === 'string'
              ? selectedSite.url
              : '';
        storeSiteInfo(selectedSite);
        setConnectionStatus(`Connected to ${siteUrl || 'your store'}`);
        setConnectionTone('success');
        router.push('/backend/admin/dashboard');
        return;
      }
      setConnectionTone('info');
      setConnectionStatus('No WooCommerce connection found yet.');
    } catch (err) {
      setError(resolveConnectorError(err, 'Unable to check connection.'));
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">WooCommerce</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Add a store</h1>
            <p className="mt-2 text-sm text-slate-600">
              Connect your WooCommerce shop to sync products, orders, and inventory.
            </p>
          </div>
          <Link
            href="/app"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300"
          >
            Back to integrations
          </Link>
        </header>

        <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-lg font-semibold text-amber-600">
              W
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">WooCommerce plugin connection</h2>
              <p className="text-sm text-slate-500">Add your store URL and API key to get started.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Store URL
              <input
                value={storeUrl}
                onChange={(event) => setStoreUrl(event.target.value)}
                placeholder="e.g. https://yourstore.com"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none"
              />
            </label>

            <label className="space-y-2 text-sm font-semibold text-slate-700">
              API key
              <input
                value={pluginApiKey}
                onChange={(event) => setPluginApiKey(event.target.value)}
                placeholder="Paste the API key from the plugin"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleConnect}
              className="rounded-full bg-slate-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-slate-800"
            >
              {isChecking ? 'Connecting…' : 'Connect'}
            </button>
            <button
              type="button"
              onClick={handleRefreshConnection}
              disabled={isChecking}
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm transition hover:border-slate-300 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {isChecking ? 'Refreshing…' : 'Refresh connection'}
            </button>
            <p className="text-xs text-slate-500">
              We&apos;ll validate the API key with your store before syncing any data.
            </p>
          </div>
          {lastMethod === 'plugin' && connectionStatus && (
            <div
              className={`mt-4 rounded-2xl border px-3 py-2 text-xs ${
                connectionTone === 'success'
                  ? 'border-emerald-200/70 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200/70 bg-slate-50 text-slate-600'
              }`}
            >
              {connectionStatus}
            </div>
          )}
          {lastMethod === 'plugin' && error && (
            <div className="mt-4 rounded-2xl border border-rose-200/70 bg-rose-50 px-3 py-2 text-xs text-rose-600">
              {error}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-slate-700">Need help?</h3>
          <p className="mt-2 text-sm text-slate-500">
            Install the Agentic connector plugin in WooCommerce and copy the API key from the
            plugin screen into this form.
          </p>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => window.open(PLUGIN_DOWNLOAD_URL, '_blank', 'noopener,noreferrer')}
              className="rounded-full bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Download WooCommerce Plugin
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default WooCommerceLandingPage;
