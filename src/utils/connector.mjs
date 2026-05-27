const CONNECTOR_BASE_URL =
  process.env.NEXT_PUBLIC_CONNECTOR_URL ||
  process.env.REACT_APP_CONNECTOR_URL ||
  '';

const normalizeWpUrl = (value) => {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/+$/, '');
  return `https://${trimmed}`.replace(/\/+$/, '');
};

const getHostname = (value) => {
  if (!value) return '';
  try {
    return new URL(normalizeWpUrl(value)).hostname || '';
  } catch (_error) {
    return '';
  }
};

const pickSiteForUrl = (sites = [], targetUrl = '') => {
  const normalizedTarget = normalizeWpUrl(targetUrl);
  if (!normalizedTarget || !Array.isArray(sites)) return sites?.[0] || null;
  return (
    sites.find((site) => normalizeWpUrl(site?.url || site?.site_url) === normalizedTarget) ||
    sites[0] ||
    null
  );
};

const safeGetLocalStorage = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch (_error) {
    return null;
  }
};

const readStoredSiteInfo = () => {
  const raw = safeGetLocalStorage('agentic_wp_site');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
};

const readStoredSiteId = () => safeGetLocalStorage('agentic_wp_site_id') || '';

const getAuthToken = () => safeGetLocalStorage('agentic_auth_token') || '';

const shouldEnforceDashboardAuth = () => {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith('/backend/admin');
};

const redirectToLogin = () => {
  if (typeof window === 'undefined') return;
  const nextPath = `${window.location.pathname}${window.location.search || ''}`;
  const loginUrl = `/login?next=${encodeURIComponent(nextPath)}`;
  window.location.replace(loginUrl);
};

const fetchConnector = async (path, options = {}) => {
  const base = CONNECTOR_BASE_URL.replace(/\/+$/, '');
  const endpoint = path?.startsWith('http') ? path : `${base}${path || ''}`;
  if (!endpoint) {
    throw new Error('Connector base URL is not configured.');
  }

  if (shouldEnforceDashboardAuth() && !getAuthToken()) {
    redirectToLogin();
    throw new Error('Unauthorized. Redirecting to sign in.');
  }

  const response = await fetch(endpoint, options);
  if (shouldEnforceDashboardAuth() && (response.status === 401 || response.status === 403)) {
    redirectToLogin();
  }
  return response;
};

export {
  fetchConnector,
  getHostname,
  normalizeWpUrl,
  pickSiteForUrl,
  readStoredSiteId,
  readStoredSiteInfo,
};
