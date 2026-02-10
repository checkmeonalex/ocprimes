import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchConnector,
  getHostname,
  normalizeWpUrl,
  pickSiteForUrl,
  readStoredSiteId,
  readStoredSiteInfo,
} from '../../../utils/connector';
import AdminSidebar from '@/components/AdminSidebar';
import { CURRENCY_OPTIONS } from '@/lib/i18n/locale-config';
import { DEFAULT_UNIT_PER_USD } from '@/lib/i18n/exchange-rates';

const JOB_TITLE_META_KEY = process.env.REACT_APP_WP_JOB_TITLE_META_KEY || 'job_title';
const WHATSAPP_META_KEY = process.env.REACT_APP_WP_WHATSAPP_META_KEY || 'whatsapp_number';

const toInputValue = (value) => (typeof value === 'string' ? value : value ? String(value) : '');

const formatDisplayValue = (value) => {
  if (value === null || value === undefined) return '--';
  const text = String(value).trim();
  return text ? text : '--';
};

const formatDate = (value) => {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return formatDisplayValue(value);
  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const Field = ({ label, value, hint, type = 'text', onChange, readOnly = false }) => (
  <div>
    <p className="text-xs font-semibold text-slate-500">{label}</p>
    <input
      type={type}
      readOnly={readOnly}
      value={toInputValue(value)}
      onChange={onChange}
      placeholder="--"
      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
    />
    {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
  </div>
);

const TextareaField = ({ label, value, hint, onChange }) => (
  <div>
    <p className="text-xs font-semibold text-slate-500">{label}</p>
    <textarea
      rows={5}
      value={toInputValue(value)}
      onChange={onChange}
      placeholder="--"
      className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
    />
    {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
  </div>
);

const SelectField = ({ label, value, options, hint, onChange }) => (
  <div>
    <p className="text-xs font-semibold text-slate-500">{label}</p>
    <select
      value={toInputValue(value)}
      onChange={onChange}
      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
    >
      {options.map((option) => (
        <option key={`${option.value}-${option.label}`} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
  </div>
);

const buildSelectOptions = (value, fallbackLabel = '--') => {
  const normalized = toInputValue(value);
  const list = [{ value: '', label: fallbackLabel }];
  if (normalized) {
    list.push({ value: normalized, label: normalized });
  }
  return list;
};

const EMPTY_ADDRESS = {
  first_name: '',
  last_name: '',
  company: '',
  address_1: '',
  address_2: '',
  city: '',
  postcode: '',
  country: '',
  state: '',
  phone: '',
  email: '',
};

const EMPTY_SOCIALS = {
  facebook: '',
  twitter: '',
  linkedin: '',
  pinterest: '',
  instagram: '',
};

const EMPTY_SITE = {
  title: '',
  tagline: '',
  url: '',
  language: '',
  timezone: '',
  store_time: '',
  store_time_gmt: '',
  icon_url: '',
};

const DEFAULT_RATE_ROWS = CURRENCY_OPTIONS.map((item) => ({
  code: item.code,
  label: `${item.code} (${item.symbol} ${item.label})`,
  unitPerUsd: DEFAULT_UNIT_PER_USD[item.code] || 1,
}));

function WooCommerceSettingsPage() {
  const [siteInfo, setSiteInfo] = useState(() => readStoredSiteInfo());
  const [siteId, setSiteId] = useState(() => readStoredSiteId() || siteInfo?.siteId || '');
  const [settings, setSettings] = useState(null);
  const [formData, setFormData] = useState(() => ({
    user: {
      username: '',
      first_name: '',
      last_name: '',
      nickname: '',
      display_name: '',
      email: '',
      website: '',
      bio: '',
      job_title: '',
      whatsapp_number: '',
      avatar_url: '',
    },
    socials: { ...EMPTY_SOCIALS },
    billing: { ...EMPTY_ADDRESS },
    shipping: { ...EMPTY_ADDRESS },
    site: { ...EMPTY_SITE },
    newPassword: '',
    appPasswordName: '',
  }));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [exchangeRates, setExchangeRates] = useState(DEFAULT_RATE_ROWS);
  const [ratesMeta, setRatesMeta] = useState({ updatedAt: '', source: 'manual', useLiveSync: false });
  const [ratesError, setRatesError] = useState('');
  const [ratesSuccess, setRatesSuccess] = useState('');
  const [isRatesLoading, setIsRatesLoading] = useState(false);
  const [isRatesSaving, setIsRatesSaving] = useState(false);
  const [isRatesSyncing, setIsRatesSyncing] = useState(false);
  const [connectorWarning, setConnectorWarning] = useState('');

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

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setConnectorWarning('');
    try {
      const resolvedSiteId = siteId || (await resolveSiteId());
      if (!resolvedSiteId) {
        setConnectorWarning('Store connector is not configured. Currency settings are still available.');
        setSettings({
          user: {},
          socials: {},
          billing: {},
          shipping: {},
          site: {},
          application_passwords: { items: [] },
          wp_version: '',
        });
        return;
      }
      const token = localStorage.getItem('agentic_auth_token');
      if (!token) {
        setConnectorWarning('Connector session missing. Currency settings are still available.');
        setSettings({
          user: {},
          socials: {},
          billing: {},
          shipping: {},
          site: {},
          application_passwords: { items: [] },
          wp_version: '',
        });
        return;
      }
      const params = new URLSearchParams({
        job_title_key: JOB_TITLE_META_KEY,
        whatsapp_key: WHATSAPP_META_KEY,
      });
      const response = await fetchConnector(`/sites/${resolvedSiteId}/settings?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setConnectorWarning(payload?.error || 'Unable to load connector-backed settings. Currency settings are still available.');
        setSettings({
          user: {},
          socials: {},
          billing: {},
          shipping: {},
          site: {},
          application_passwords: { items: [] },
          wp_version: '',
        });
        return;
      }
      setSettings(payload || null);
    } catch (err) {
      setConnectorWarning(err?.message || 'Unable to load connector-backed settings. Currency settings are still available.');
      setSettings({
        user: {},
        socials: {},
        billing: {},
        shipping: {},
        site: {},
        application_passwords: { items: [] },
        wp_version: '',
      });
    } finally {
      setIsLoading(false);
    }
  }, [resolveSiteId, siteId]);

  const loadExchangeRates = useCallback(async () => {
    setIsRatesLoading(true);
    setRatesError('');
    try {
      const response = await fetch('/api/admin/exchange-rates', { method: 'GET' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to load exchange rates.');
      }

      const nextRows = DEFAULT_RATE_ROWS.map((item) => ({
        ...item,
        unitPerUsd: Number(payload?.unitPerUsd?.[item.code]) > 0
          ? Number(payload.unitPerUsd[item.code])
          : item.unitPerUsd,
      }));
      setExchangeRates(nextRows);
      setRatesMeta({
        updatedAt: payload?.updatedAt || '',
        source: payload?.source || 'manual',
        useLiveSync: Boolean(payload?.useLiveSync),
      });
    } catch (err) {
      setRatesError(err?.message || 'Unable to load exchange rates.');
    } finally {
      setIsRatesLoading(false);
    }
  }, []);

  const saveExchangeRates = useCallback(async () => {
    setIsRatesSaving(true);
    setRatesError('');
    setRatesSuccess('');
    try {
      const payload = {
        useLiveSync: ratesMeta.useLiveSync,
        rates: exchangeRates.map((item) => ({
          code: item.code,
          unitPerUsd: Number(item.unitPerUsd),
        })),
      };
      const response = await fetch('/api/admin/exchange-rates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to save exchange rates.');
      }
      const nextRows = DEFAULT_RATE_ROWS.map((item) => ({
        ...item,
        unitPerUsd: Number(data?.unitPerUsd?.[item.code]) > 0
          ? Number(data.unitPerUsd[item.code])
          : item.unitPerUsd,
      }));
      setExchangeRates(nextRows);
      setRatesMeta((prev) => ({
        ...prev,
        updatedAt: data?.updatedAt || prev.updatedAt,
        source: data?.source || prev.source,
        useLiveSync: Boolean(data?.useLiveSync),
      }));
      setRatesSuccess('Exchange rates saved.');
    } catch (err) {
      setRatesError(err?.message || 'Unable to save exchange rates.');
    } finally {
      setIsRatesSaving(false);
    }
  }, [exchangeRates, ratesMeta.useLiveSync]);

  const syncExchangeRates = useCallback(async () => {
    setIsRatesSyncing(true);
    setRatesError('');
    setRatesSuccess('');
    try {
      const response = await fetch('/api/admin/exchange-rates/sync', {
        method: 'POST',
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Live sync failed.');
      }
      const nextRows = DEFAULT_RATE_ROWS.map((item) => ({
        ...item,
        unitPerUsd: Number(data?.unitPerUsd?.[item.code]) > 0
          ? Number(data.unitPerUsd[item.code])
          : item.unitPerUsd,
      }));
      setExchangeRates(nextRows);
      setRatesMeta((prev) => ({
        ...prev,
        updatedAt: data?.updatedAt || prev.updatedAt,
        source: data?.source || 'live_sync',
        useLiveSync: true,
      }));
      setRatesSuccess('Live rates synced successfully.');
    } catch (err) {
      setRatesError(err?.message || 'Live sync failed.');
    } finally {
      setIsRatesSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    loadExchangeRates();
  }, [loadExchangeRates]);

  useEffect(() => {
    if (!settings) return;
    const sourceUser = settings?.user || {};
    const nextUser = {
      username: toInputValue(sourceUser.username),
      first_name: toInputValue(sourceUser.first_name),
      last_name: toInputValue(sourceUser.last_name),
      nickname: toInputValue(sourceUser.nickname),
      display_name: toInputValue(sourceUser.display_name),
      email: toInputValue(sourceUser.email),
      website: toInputValue(sourceUser.website),
      bio: toInputValue(sourceUser.bio),
      job_title: toInputValue(sourceUser.job_title),
      whatsapp_number: toInputValue(sourceUser.whatsapp_number),
      avatar_url: toInputValue(sourceUser.avatar_url),
    };
    const sourceSocials = settings?.socials || {};
    const nextSocials = {
      facebook: toInputValue(sourceSocials.facebook),
      twitter: toInputValue(sourceSocials.twitter),
      linkedin: toInputValue(sourceSocials.linkedin),
      pinterest: toInputValue(sourceSocials.pinterest),
      instagram: toInputValue(sourceSocials.instagram),
    };
    const sourceSite = settings?.site || {};
    const nextSite = {
      title: toInputValue(sourceSite.title),
      tagline: toInputValue(sourceSite.tagline),
      url: toInputValue(sourceSite.url),
      language: toInputValue(sourceSite.language),
      timezone: toInputValue(sourceSite.timezone),
      store_time: toInputValue(sourceSite.store_time),
      store_time_gmt: toInputValue(sourceSite.store_time_gmt),
      icon_url: toInputValue(sourceSite.icon_url),
    };
    const buildAddress = (source) => ({
      first_name: toInputValue(source?.first_name),
      last_name: toInputValue(source?.last_name),
      company: toInputValue(source?.company),
      address_1: toInputValue(source?.address_1),
      address_2: toInputValue(source?.address_2),
      city: toInputValue(source?.city),
      postcode: toInputValue(source?.postcode),
      country: toInputValue(source?.country),
      state: toInputValue(source?.state),
      phone: toInputValue(source?.phone),
      email: toInputValue(source?.email),
    });

    setFormData((prev) => ({
      ...prev,
      user: nextUser,
      socials: nextSocials,
      billing: buildAddress(settings?.billing || EMPTY_ADDRESS),
      shipping: buildAddress(settings?.shipping || EMPTY_ADDRESS),
      site: nextSite,
    }));
  }, [settings]);

  const updateSectionField = useCallback(
    (section, field) => (event) => {
      const value = event.target.value;
      setFormData((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }));
    },
    [],
  );

  const updateRootField = useCallback((field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const user = formData.user;
  const socials = formData.socials;
  const billing = formData.billing;
  const shipping = formData.shipping;
  const site = formData.site;
  const applicationPasswords = settings?.application_passwords || {};
  const appItems = Array.isArray(applicationPasswords.items) ? applicationPasswords.items : [];

  const displayNameOptions = useMemo(() => {
    const options = new Map();
    const addOption = (value) => {
      const text = toInputValue(value).trim();
      if (text) {
        options.set(text, text);
      }
    };
    addOption(user.display_name);
    addOption(user.username);
    addOption(user.nickname);
    const fullName = `${user.first_name} ${user.last_name}`.trim();
    addOption(fullName);
    addOption(user.first_name);
    addOption(user.last_name);
    if (!options.size) {
      options.set('', '--');
    }
    return Array.from(options.values()).map((value) => ({
      value,
      label: value || '--',
    }));
  }, [
    user.display_name,
    user.username,
    user.nickname,
    user.first_name,
    user.last_name,
  ]);

  const settingsSections = useMemo(
    () => [
      { id: 'site-settings', label: 'Site' },
      { id: 'currency-settings', label: 'Currency' },
      { id: 'profile-settings', label: 'Profile' },
      { id: 'contact-settings', label: 'Contact' },
      { id: 'about-settings', label: 'About' },
      { id: 'account-settings', label: 'Account' },
      { id: 'app-passwords', label: 'App Passwords' },
      { id: 'job-settings', label: 'Job' },
      { id: 'whatsapp-settings', label: 'WhatsApp' },
      { id: 'address-settings', label: 'Addresses' },
      { id: 'wp-version', label: 'WordPress' },
    ],
    [],
  );

  const siteName = siteInfo?.name || 'Store';
  const siteLogo = siteInfo?.logoUrl || '';
  const siteIcon = site.icon_url || siteLogo;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Settings</p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">Account settings</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Manage your profile, security, and application access for this store.
                </p>
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

            {isLoading && <p className="mt-6 text-sm text-slate-400">Loading settings...</p>}
            {error && <p className="mt-6 text-sm text-rose-500">{error}</p>}
            {connectorWarning && <p className="mt-6 text-sm text-amber-600">{connectorWarning}</p>}

            {!isLoading && !error && (
              <div className="mt-8 space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Settings Sections
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {settingsSections.map((section) => (
                      <a
                        key={section.id}
                        href={`#${section.id}`}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300"
                      >
                        {section.label}
                      </a>
                    ))}
                  </div>
                </div>

                <section
                  id="site-settings"
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-900">Site</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Site identity, icon, and localization settings.
                  </p>

                  <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold text-slate-500">Site Icon</p>
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                        {siteIcon ? (
                          <img
                            src={siteIcon}
                            alt={site.title || siteName}
                            className="h-16 w-16 rounded-2xl object-cover"
                          />
                        ) : (
                          <span className="h-16 w-16 rounded-2xl bg-slate-200" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-900 px-4 py-3 text-white">
                          {siteIcon ? (
                            <img
                              src={siteIcon}
                              alt={site.title || siteName}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <span className="h-8 w-8 rounded-full bg-white/20" />
                          )}
                          <div>
                            <p className="text-xs font-semibold">{site.title || siteName}</p>
                            <p className="text-[11px] text-white/70">App icon preview</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            disabled
                            className="rounded-full border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-500"
                          >
                            Change Site Icon
                          </button>
                          <button
                            type="button"
                            disabled
                            className="rounded-full border border-transparent px-3 py-2 text-[11px] font-semibold text-rose-500"
                          >
                            Remove Site Icon
                          </button>
                        </div>
                        <p className="mt-3 text-[11px] text-slate-400">
                          The Site Icon is used in browser tabs and app icons (recommended 512x512).
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <Field
                      label="Site Title"
                      value={site.title}
                      onChange={updateSectionField('site', 'title')}
                    />
                    <Field
                      label="Tagline"
                      value={site.tagline}
                      onChange={updateSectionField('site', 'tagline')}
                    />
                    <Field
                      label="Site URL"
                      value={site.url}
                      onChange={updateSectionField('site', 'url')}
                    />
                    <SelectField
                      label="Site Language"
                      value={site.language}
                      options={buildSelectOptions(site.language)}
                      onChange={updateSectionField('site', 'language')}
                    />
                    <SelectField
                      label="Time Zone"
                      value={site.timezone}
                      options={buildSelectOptions(site.timezone)}
                      onChange={updateSectionField('site', 'timezone')}
                    />
                    <Field
                      label="Store Time"
                      value={site.store_time}
                      readOnly
                    />
                  </div>
                </section>

                <section
                  id="currency-settings"
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Currency & exchange rates</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Set manual rates (units per 1 USD) or sync live rates from provider.
                      </p>
                      <p className="mt-2 text-[11px] text-slate-400">
                        Last update: {ratesMeta.updatedAt ? formatDate(ratesMeta.updatedAt) : '--'} · Source: {ratesMeta.source || 'manual'}
                      </p>
                    </div>

                    <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={ratesMeta.useLiveSync}
                        onChange={(event) =>
                          setRatesMeta((prev) => ({ ...prev, useLiveSync: event.target.checked }))
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Use live sync
                    </label>
                  </div>

                  {ratesError ? <p className="mt-3 text-xs text-rose-500">{ratesError}</p> : null}
                  {ratesSuccess ? <p className="mt-3 text-xs text-emerald-600">{ratesSuccess}</p> : null}

                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                    <div className="grid grid-cols-[minmax(180px,_2fr)_minmax(140px,_1fr)] gap-3 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      <span>Currency</span>
                      <span className="text-right">Unit / USD</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {exchangeRates.map((item) => (
                        <div
                          key={item.code}
                          className="grid grid-cols-[minmax(180px,_2fr)_minmax(140px,_1fr)] items-center gap-3 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-800">{item.code}</p>
                            <p className="text-[11px] text-slate-500">{item.label}</p>
                          </div>
                          <input
                            type="number"
                            min="0.000001"
                            step="0.0001"
                            value={item.unitPerUsd}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              setExchangeRates((prev) =>
                                prev.map((row) =>
                                  row.code === item.code
                                    ? { ...row, unitPerUsd: Number.isFinite(value) ? value : row.unitPerUsd }
                                    : row,
                                ),
                              );
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm text-slate-700"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={saveExchangeRates}
                      disabled={isRatesSaving || isRatesLoading}
                      className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isRatesSaving ? 'Saving...' : 'Save rates'}
                    </button>
                    <button
                      type="button"
                      onClick={syncExchangeRates}
                      disabled={isRatesSyncing || isRatesLoading}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isRatesSyncing ? 'Syncing...' : 'Sync live rates'}
                    </button>
                    <button
                      type="button"
                      onClick={loadExchangeRates}
                      disabled={isRatesLoading}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isRatesLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>
                </section>

                <section
                  id="profile-settings"
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-900">Name</p>
                  <p className="mt-1 text-xs text-slate-500">Usernames cannot be changed.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <Field label="Username" value={user.username} readOnly />
                    <Field
                      label="First Name"
                      value={user.first_name}
                      onChange={updateSectionField('user', 'first_name')}
                    />
                    <Field
                      label="Last Name"
                      value={user.last_name}
                      onChange={updateSectionField('user', 'last_name')}
                    />
                    <Field
                      label="Nickname (required)"
                      value={user.nickname}
                      onChange={updateSectionField('user', 'nickname')}
                    />
                    <div className="md:col-span-2">
                      <SelectField
                        label="Display name publicly as"
                        value={user.display_name}
                        options={displayNameOptions}
                        onChange={updateSectionField('user', 'display_name')}
                      />
                    </div>
                  </div>
                </section>

                <section
                  id="contact-settings"
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-900">Contact Info</p>
                  <p className="mt-1 text-xs text-slate-500">
                    If you change your email, a confirmation message will be sent to the new address.
                  </p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <Field
                      label="Email (required)"
                      value={user.email}
                      type="email"
                      onChange={updateSectionField('user', 'email')}
                    />
                    <Field
                      label="Website"
                      value={user.website}
                      onChange={updateSectionField('user', 'website')}
                    />
                    <Field
                      label="Facebook"
                      value={socials.facebook}
                      onChange={updateSectionField('socials', 'facebook')}
                    />
                    <Field
                      label="Twitter"
                      value={socials.twitter}
                      onChange={updateSectionField('socials', 'twitter')}
                    />
                    <Field
                      label="Linkedin"
                      value={socials.linkedin}
                      onChange={updateSectionField('socials', 'linkedin')}
                    />
                    <Field
                      label="Pinterest"
                      value={socials.pinterest}
                      onChange={updateSectionField('socials', 'pinterest')}
                    />
                    <Field
                      label="Instagram"
                      value={socials.instagram}
                      onChange={updateSectionField('socials', 'instagram')}
                    />
                  </div>
                </section>

                <section
                  id="about-settings"
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-900">About Yourself</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Share a little biographical information to fill out your profile.
                  </p>
                  <div className="mt-5 grid gap-6 lg:grid-cols-[2fr_1fr]">
                    <TextareaField
                      label="Biographical Info"
                      value={user.bio}
                      onChange={updateSectionField('user', 'bio')}
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Profile Picture</p>
                      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.display_name || 'Profile'}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <span className="h-12 w-12 rounded-full bg-slate-200" />
                        )}
                        <div>
                          <p className="text-xs font-semibold text-slate-700">
                            {formatDisplayValue(user.display_name)}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            You can change your profile picture on Gravatar.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section
                  id="account-settings"
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-900">Account Management</p>
                  <div className="mt-5 grid gap-4 lg:grid-cols-[2fr_1fr]">
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <Field
                        label="New Password"
                        value={formData.newPassword}
                        type="password"
                        onChange={updateRootField('newPassword')}
                        hint="Set a new password for this account."
                      />
                      <button
                        type="button"
                        disabled
                        className="mt-3 rounded-full bg-slate-100 px-4 py-2 text-[11px] font-semibold text-slate-500"
                      >
                        Set New Password
                      </button>
                    </div>
                    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 p-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-700">Sessions</p>
                        <p className="text-[11px] text-slate-400">
                          Log out everywhere else without affecting this session.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled
                        className="mt-4 rounded-full bg-slate-100 px-4 py-2 text-[11px] font-semibold text-slate-500"
                      >
                        Log Out Everywhere Else
                      </button>
                    </div>
                  </div>
                </section>

                <section
                  id="app-passwords"
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-900">Application Passwords</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Application passwords allow authentication via non-interactive systems without
                    sharing your primary password.
                  </p>
                  {applicationPasswords.enabled === false && (
                    <p className="mt-2 text-xs text-amber-600">
                      Application passwords are disabled on this site.
                    </p>
                  )}
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <Field
                      label="New Application Password Name"
                      value={formData.appPasswordName}
                      onChange={updateRootField('appPasswordName')}
                    />
                    <div className="flex items-end">
                      <button
                        type="button"
                        disabled
                        className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500"
                      >
                        Add Application Password
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                    <div className="grid grid-cols-[minmax(160px,_2fr)_minmax(140px,_1.2fr)_minmax(140px,_1.2fr)_minmax(120px,_1fr)_minmax(80px,_0.6fr)] gap-3 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      <span>Name</span>
                      <span>Created</span>
                      <span>Last Used</span>
                      <span>Last IP</span>
                      <span className="text-right">Revoke</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {appItems.map((item) => (
                        <div
                          key={item.uuid || item.name}
                          className="grid grid-cols-[minmax(160px,_2fr)_minmax(140px,_1.2fr)_minmax(140px,_1.2fr)_minmax(120px,_1fr)_minmax(80px,_0.6fr)] items-center gap-3 px-4 py-3 text-xs text-slate-600"
                        >
                          <span className="font-semibold text-slate-700">{formatDisplayValue(item.name)}</span>
                          <span>{formatDate(item.created)}</span>
                          <span>{formatDate(item.last_used)}</span>
                          <span>{formatDisplayValue(item.last_ip)}</span>
                          <div className="text-right">
                            <button
                              type="button"
                              disabled
                              className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500"
                            >
                              Revoke
                            </button>
                          </div>
                        </div>
                      ))}
                      {!appItems.length && (
                        <div className="px-4 py-4 text-xs text-slate-400">No application passwords yet.</div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled
                    className="mt-4 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-500"
                  >
                    Revoke all application passwords
                  </button>
                </section>

                <section
                  id="job-settings"
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-900">Job</p>
                  <div className="mt-4">
                    <Field
                      label="Job"
                      value={user.job_title}
                      onChange={updateSectionField('user', 'job_title')}
                    />
                  </div>
                </section>

                <section
                  id="whatsapp-settings"
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-900">WhatsApp Information</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Customer WhatsApp number for order tracking.
                  </p>
                  <div className="mt-4">
                    <Field
                      label="WhatsApp Number"
                      value={user.whatsapp_number}
                      onChange={updateSectionField('user', 'whatsapp_number')}
                    />
                  </div>
                </section>

                <section
                  id="address-settings"
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-900">Customer billing address</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <Field
                      label="First name"
                      value={billing.first_name}
                      onChange={updateSectionField('billing', 'first_name')}
                    />
                    <Field
                      label="Last name"
                      value={billing.last_name}
                      onChange={updateSectionField('billing', 'last_name')}
                    />
                    <Field
                      label="Company"
                      value={billing.company}
                      onChange={updateSectionField('billing', 'company')}
                    />
                    <Field
                      label="Address line 1"
                      value={billing.address_1}
                      onChange={updateSectionField('billing', 'address_1')}
                    />
                    <Field
                      label="Address line 2"
                      value={billing.address_2}
                      onChange={updateSectionField('billing', 'address_2')}
                    />
                    <Field
                      label="City"
                      value={billing.city}
                      onChange={updateSectionField('billing', 'city')}
                    />
                    <Field
                      label="Postcode / ZIP"
                      value={billing.postcode}
                      onChange={updateSectionField('billing', 'postcode')}
                    />
                    <SelectField
                      label="Country / Region"
                      value={billing.country}
                      options={buildSelectOptions(billing.country)}
                      onChange={updateSectionField('billing', 'country')}
                    />
                    <Field
                      label="State / County"
                      value={billing.state}
                      onChange={updateSectionField('billing', 'state')}
                    />
                    <SelectField
                      label="State / County or state code"
                      value={billing.state}
                      options={buildSelectOptions(billing.state)}
                      onChange={updateSectionField('billing', 'state')}
                    />
                    <Field
                      label="Phone"
                      value={billing.phone}
                      onChange={updateSectionField('billing', 'phone')}
                    />
                    <Field
                      label="Email address"
                      value={billing.email}
                      type="email"
                      onChange={updateSectionField('billing', 'email')}
                    />
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Customer shipping address</p>
                      <p className="mt-1 text-xs text-slate-500">Copy from billing address</p>
                    </div>
                    <button
                      type="button"
                      disabled
                      className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <Field
                      label="First name"
                      value={shipping.first_name}
                      onChange={updateSectionField('shipping', 'first_name')}
                    />
                    <Field
                      label="Last name"
                      value={shipping.last_name}
                      onChange={updateSectionField('shipping', 'last_name')}
                    />
                    <Field
                      label="Company"
                      value={shipping.company}
                      onChange={updateSectionField('shipping', 'company')}
                    />
                    <Field
                      label="Address line 1"
                      value={shipping.address_1}
                      onChange={updateSectionField('shipping', 'address_1')}
                    />
                    <Field
                      label="Address line 2"
                      value={shipping.address_2}
                      onChange={updateSectionField('shipping', 'address_2')}
                    />
                    <Field
                      label="City"
                      value={shipping.city}
                      onChange={updateSectionField('shipping', 'city')}
                    />
                    <Field
                      label="Postcode / ZIP"
                      value={shipping.postcode}
                      onChange={updateSectionField('shipping', 'postcode')}
                    />
                    <SelectField
                      label="Country / Region"
                      value={shipping.country}
                      options={buildSelectOptions(shipping.country)}
                      onChange={updateSectionField('shipping', 'country')}
                    />
                    <Field
                      label="State / County"
                      value={shipping.state}
                      onChange={updateSectionField('shipping', 'state')}
                    />
                    <SelectField
                      label="State / County or state code"
                      value={shipping.state}
                      options={buildSelectOptions(shipping.state)}
                      onChange={updateSectionField('shipping', 'state')}
                    />
                    <Field
                      label="Phone"
                      value={shipping.phone}
                      onChange={updateSectionField('shipping', 'phone')}
                    />
                  </div>
                </section>

                <section
                  id="wp-version"
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-900">WordPress Version</p>
                  <div className="mt-4">
                    <Field label="Version" value={settings?.wp_version} readOnly />
                  </div>
                </section>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default WooCommerceSettingsPage;
