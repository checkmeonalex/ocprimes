import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchConnector,
  getHostname,
  normalizeWpUrl,
  pickSiteForUrl,
  readStoredSiteId,
  readStoredSiteInfo,
} from '../../../utils/connector';
import LoadingButton from '../../../components/LoadingButton';
import AdminSidebar from '@/components/AdminSidebar';

const COMMENTS_PAGE_SIZE = 5;


function WooCommerceDashboardPage() {
  const [siteInfo, setSiteInfo] = useState(() => readStoredSiteInfo());
  const [siteId, setSiteId] = useState(() => readStoredSiteId() || siteInfo?.siteId || '');
  const [comments, setComments] = useState([]);
  const [commentsPage, setCommentsPage] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [commentsError, setCommentsError] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const isLoadingCommentsRef = useRef(false);

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

  const loadComments = useCallback(
    async (page, replace = false) => {
      if (isLoadingCommentsRef.current) return;
      isLoadingCommentsRef.current = true;
      setIsLoadingComments(true);
      setCommentsError('');
      try {
        const resolvedSiteId = siteId || (await resolveSiteId());
        if (!resolvedSiteId) {
          setCommentsError('Connect a store to load comments.');
          return;
        }
        const token = localStorage.getItem('agentic_auth_token');
        if (!token) {
          setCommentsError('Sign in to load comments.');
          return;
        }
        const params = new URLSearchParams({
          per_page: COMMENTS_PAGE_SIZE.toString(),
          page: page.toString(),
          types: 'all',
          status: 'all',
        });
        const response = await fetchConnector(
          `/sites/${resolvedSiteId}/comments?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          },
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          console.error('Comments fetch failed', {
            status: response.status,
            url: response.url,
            payload,
          });
          const baseMessage = payload?.error || 'Unable to load comments.';
          const detailMessage = payload?.details ? ` (${payload.details})` : '';
          throw new Error(`${baseMessage}${detailMessage}`);
        }
        const nextComments = Array.isArray(payload?.comments) ? payload.comments : [];
        setComments((prev) => (replace ? nextComments : [...prev, ...nextComments]));
        setCommentsPage(page);
        setHasMoreComments(
          typeof payload?.has_more === 'boolean'
            ? payload.has_more
            : nextComments.length === COMMENTS_PAGE_SIZE,
        );
      } catch (error) {
        console.error('Comments load error', error);
        setCommentsError(error?.message || 'Unable to load comments.');
      } finally {
        isLoadingCommentsRef.current = false;
        setIsLoadingComments(false);
      }
    },
    [resolveSiteId, siteId],
  );

  useEffect(() => {
    setComments([]);
    setCommentsPage(0);
    setHasMoreComments(true);
    loadComments(1, true);
  }, [loadComments]);

  const siteName = siteInfo?.name || 'Store';
  const siteLogo = siteInfo?.logoUrl || '';
  const canLoadMore = hasMoreComments && !isLoadingComments;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex w-full max-w-md items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm sm:w-auto">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="6" />
                  <path d="m15.5 15.5 4 4" />
                </svg>
                <input
                  className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none sm:w-64"
                  placeholder="Search Anythings"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right text-xs text-slate-500">
                  <p className="font-semibold text-slate-900">$1365</p>
                  Your Balance
                </div>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                  {siteLogo ? (
                    <img
                      src={siteLogo}
                      alt={siteName}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="h-7 w-7 rounded-full bg-slate-200" />
                  )}
                  {siteName}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
                <p className="text-sm text-slate-500">Here is the summary of overall data</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600">
                  August 2024
                </button>
                <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600">
                  Manage Widget Label
                </button>
                <button className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                  +
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Total Visitor', value: '$45,987', change: '12.87%' },
                { label: 'Total products', value: '$632,235', change: '85.23%' },
                { label: 'Total Product Views', value: '$25,987', change: '90.89%' },
                { label: 'Average Orders', value: '$19,214', change: '21.12%' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{stat.label}</span>
                    <span className="text-emerald-500">▲ {stat.change}</span>
                  </div>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{stat.value}</p>
                  <div className="mt-3 h-12 w-full rounded-xl bg-gradient-to-r from-blue-100 via-slate-100 to-transparent" />
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-[2fr_1fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Product Sales</p>
                    <div className="mt-2 flex items-baseline gap-3">
                      <span className="text-xl font-semibold text-slate-900">2590</span>
                      <span className="text-xs text-emerald-500">▲ 2.87%</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">Total Earning</div>
                </div>
                <div className="mt-4 h-48 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100" />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Top Selling Products</p>
                <div className="mt-4 flex items-center justify-center rounded-2xl bg-blue-50 p-6">
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-blue-100 text-blue-500">
                    Nike
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm font-semibold text-slate-900">Nike Shoes</p>
                  <p className="text-xs text-slate-500">$12.32</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Top Countries By Sales</p>
                <div className="mt-4 h-40 rounded-2xl bg-slate-100" />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Sales by traffic source</p>
                <div className="mt-4 h-40 rounded-2xl bg-gradient-to-br from-fuchsia-100 via-blue-100 to-slate-100" />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500">New Comment</p>
                  {hasMoreComments && (
                    <LoadingButton
                      type="button"
                      onClick={() => loadComments(commentsPage + 1)}
                      disabled={!canLoadMore}
                      isLoading={isLoadingComments}
                      className="text-[11px] font-semibold text-slate-400 transition hover:text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300"
                    >
                      View more
                    </LoadingButton>
                  )}
                </div>
                <div className="mt-4 space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-3">
                      {comment.author_avatar_url ? (
                        <img
                          src={comment.author_avatar_url}
                          alt={comment.author_name}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <span className="h-9 w-9 rounded-full bg-slate-200" />
                      )}
                      <div>
                        <p className="text-xs font-semibold text-slate-700">
                          {comment.author_name || 'Anonymous'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {comment.excerpt || comment.content || 'New comment'}
                        </p>
                        {comment.post_title && (
                          <p className="text-[10px] text-slate-300">On {comment.post_title}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {!comments.length && !isLoadingComments && !commentsError && (
                    <p className="text-[11px] text-slate-400">No comments yet.</p>
                  )}
                </div>
                {commentsError && (
                  <p className="mt-3 text-[11px] text-rose-500">{commentsError}</p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default WooCommerceDashboardPage;
