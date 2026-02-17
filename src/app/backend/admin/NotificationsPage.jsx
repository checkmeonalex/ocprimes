'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader';
import emptyNotificationImage from '../../UserBackend/notifications/no-notificvstion.png';

const formatDateOnly = (value) => {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  });
};

const formatRelativeTime = (value) => {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return '--';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
};

const iconToneClasses = {
  info: 'bg-sky-100 text-sky-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-rose-100 text-rose-700',
};

const NotificationSeverityIcon = ({ severity }) => {
  if (severity === 'success') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m5 13 4 4L19 7" />
      </svg>
    );
  }
  if (severity === 'warning') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="m10.3 4.6-7 12.2a1.5 1.5 0 0 0 1.3 2.2h14.8a1.5 1.5 0 0 0 1.3-2.2l-7-12.2a1.5 1.5 0 0 0-2.6 0Z" />
      </svg>
    );
  }
  if (severity === 'error') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 10h8" />
      <path d="M8 14h5" />
      <rect x="3" y="5" width="18" height="14" rx="3" />
    </svg>
  );
};

const tabStyles = (active) =>
  `inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
    active ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
  }`;

const NotificationsSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 sm:px-4">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 animate-pulse rounded-full bg-slate-200/85" />
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <div className="h-3.5 w-3/4 animate-pulse rounded-md bg-slate-200/85" />
            <div className="h-3 w-full animate-pulse rounded-md bg-slate-200/70" />
            <div className="h-3 w-1/3 animate-pulse rounded-md bg-slate-200/70" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, per_page: 20, total: 0, total_pages: 0 });
  const [summary, setSummary] = useState({ unread: 0, total: 0 });
  const [permissions, setPermissions] = useState({
    can_review_category_requests: false,
    is_admin: false,
    is_vendor: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [readStatus, setReadStatus] = useState('');
  const [error, setError] = useState('');
  const [reviewingRequestId, setReviewingRequestId] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadNotifications = useCallback(
    async (page = 1, signal) => {
      setIsLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({
          page: String(page),
          per_page: '20',
        });
        if (readStatus) params.set('read_status', readStatus);
        const response = await fetch(`/api/admin/notifications?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store',
          signal,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Unable to load notifications.');

        setItems(Array.isArray(payload?.items) ? payload.items : []);
        setPagination(payload?.pagination || { page: 1, per_page: 20, total: 0, total_pages: 0 });
        setSummary(payload?.summary || { unread: 0, total: 0 });
        setPermissions(
          payload?.permissions || {
            can_review_category_requests: false,
            is_admin: false,
            is_vendor: false,
          },
        );
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setError(err?.message || 'Unable to load notifications.');
        setItems([]);
        setPagination({ page: 1, per_page: 20, total: 0, total_pages: 0 });
        setSummary({ unread: 0, total: 0 });
      } finally {
        setIsLoading(false);
      }
    },
    [readStatus],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadNotifications(1, controller.signal);
    return () => controller.abort();
  }, [loadNotifications]);

  const markRead = useCallback(
    async (ids = [], markAll = false) => {
      if (!markAll && !ids.length) return;
      if (markAll) setIsMarkingAll(true);
      try {
        const response = await fetch('/api/admin/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(markAll ? { mark_all: true } : { ids }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Unable to update notifications.');

        if (markAll) {
          setItems((prev) => prev.map((item) => ({ ...item, is_read: true, read_at: new Date().toISOString() })));
          setSummary((prev) => ({ ...prev, unread: 0 }));
          return;
        }

        const targetSet = new Set(ids.map((id) => String(id)));
        const changed = items.filter((item) => targetSet.has(String(item.id)) && !item.is_read).length;
        setItems((prev) =>
          prev.map((item) =>
            targetSet.has(String(item.id))
              ? { ...item, is_read: true, read_at: new Date().toISOString() }
              : item,
          ),
        );
        setSummary((prev) => ({ ...prev, unread: Math.max(0, Number(prev.unread || 0) - changed) }));
      } catch (err) {
        setError(err?.message || 'Unable to update notifications.');
      } finally {
        if (markAll) setIsMarkingAll(false);
      }
    },
    [items],
  );

  const reviewCategoryRequest = useCallback(
    async ({ notification, requestId, status, reviewNote = '' }) => {
      if (!requestId) return;
      setReviewingRequestId(String(requestId));
      setError('');
      try {
        const response = await fetch('/api/admin/categories/requests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: String(requestId),
            status,
            reviewNote: String(reviewNote || '').trim() || undefined,
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Unable to review category request.');

        if (notification?.id) {
          await markRead([String(notification.id)]);
        }
        await loadNotifications(1);
      } catch (err) {
        setError(err?.message || 'Unable to review category request.');
      } finally {
        setReviewingRequestId('');
      }
    },
    [loadNotifications, markRead],
  );

  const canPrevious = pagination.page > 1;
  const canNext = pagination.total_pages > pagination.page;
  const unreadCount = Number(summary?.unread || 0);
  const totalCount = Number(summary?.total || 0);
  const readCount = Math.max(0, totalCount - unreadCount);

  const emptyText = useMemo(() => {
    if (readStatus === 'unread') return 'No unread notifications.';
    if (readStatus === 'read') return 'No read notifications yet.';
    return 'You are all caught up. New alerts will show here.';
  }, [readStatus]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 px-4 pb-8 sm:px-6 lg:px-10">
          <AdminDesktopHeader />
          <div className="mx-auto w-full max-w-none p-0 lg:max-w-5xl">
            <section className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Notifications ({totalCount})</h1>
              </div>
              <button
                type="button"
                disabled={!unreadCount || isMarkingAll}
                onClick={() => markRead([], true)}
                className="inline-flex items-center gap-2 text-base font-semibold text-indigo-700 transition hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m4 13 4 4L20 5" />
                </svg>
                {isMarkingAll ? 'Marking...' : 'Mark all as read'}
              </button>
            </section>

            <section className="mt-4 flex overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-1.5">
              <button type="button" onClick={() => setReadStatus('all')} className={tabStyles(readStatus === 'all')}>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-500">{totalCount}</span>
              </button>
              <button type="button" onClick={() => setReadStatus('unread')} className={tabStyles(readStatus === 'unread')}>
                Unread
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-500">{unreadCount}</span>
              </button>
              <button type="button" onClick={() => setReadStatus('read')} className={tabStyles(readStatus === 'read')}>
                Read
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-500">{readCount}</span>
              </button>
            </section>

            {error ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
            ) : null}

            <section className="mt-4 space-y-2">
              {isLoading ? (
                <NotificationsSkeleton />
              ) : items.length ? (
                items.map((item) => {
                  const severity = String(item?.severity || 'info');
                  const iconTone = iconToneClasses[severity] || iconToneClasses.info;
                  const metadata = item?.metadata && typeof item.metadata === 'object' ? item.metadata : {};
                  const actionUrl = String(metadata?.action_url || '').trim();
                  const requestId = String(metadata?.request_id || '').trim();
                  const canOpenAction = actionUrl.startsWith('/backend/admin');
                  const canReviewCategoryRequest =
                    Boolean(permissions?.can_review_category_requests) &&
                    String(item?.type || '') === 'category_request_created' &&
                    Boolean(requestId);
                  const isReviewingThis = reviewingRequestId && reviewingRequestId === requestId;

                  return (
                    <article key={item.id} className="rounded-2xl px-1 py-3 sm:px-2">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconTone}`}>
                          <NotificationSeverityIcon severity={severity} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-semibold text-slate-900">{item?.title || 'Notification'}</h3>
                          <p className="mt-1 text-sm text-slate-700">{item?.message || ''}</p>
                          <p className="mt-1 text-sm text-slate-500">{formatDateOnly(item?.created_at)}</p>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {canReviewCategoryRequest ? (
                              <>
                                <button
                                  type="button"
                                  disabled={Boolean(isReviewingThis)}
                                  onClick={() =>
                                    reviewCategoryRequest({ notification: item, requestId, status: 'approved' })
                                  }
                                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isReviewingThis ? 'Saving...' : 'Approve'}
                                </button>
                                <button
                                  type="button"
                                  disabled={Boolean(isReviewingThis)}
                                  onClick={() => {
                                    setRejectTarget(item);
                                    setRejectReason('');
                                  }}
                                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Reject
                                </button>
                              </>
                            ) : null}
                            {canOpenAction ? (
                              <button
                                type="button"
                                onClick={() => {
                                  markRead([String(item.id)]);
                                  router.push(actionUrl);
                                }}
                                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                View
                              </button>
                            ) : null}
                            {!item?.is_read ? (
                              <button
                                type="button"
                                onClick={() => markRead([String(item.id)])}
                                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                Mark read
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div className="ml-2 flex flex-col items-end gap-2">
                          <span className="text-sm text-slate-500">{formatRelativeTime(item?.created_at)}</span>
                          <span className={`inline-flex h-3.5 w-3.5 rounded-full ${item?.is_read ? 'bg-slate-300' : 'bg-indigo-600'}`} />
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="py-12 text-center">
                  <div className="mb-1 flex h-[160px] items-start justify-center overflow-hidden">
                    <Image
                      src={emptyNotificationImage}
                      alt="Notifications"
                      width={320}
                      height={320}
                      className="-mt-12 h-[320px] w-[320px] object-cover"
                    />
                  </div>
                  <p className="text-base font-semibold text-slate-900">You&apos;re all caught up</p>
                  <p className="mt-2 text-sm text-slate-500">{emptyText}</p>
                </div>
              )}
            </section>

            {pagination.total_pages > 1 ? (
              <section className="mt-3 flex items-center justify-between px-1 py-2 text-xs text-slate-600">
                <span>
                  Page {pagination.page} of {pagination.total_pages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!canPrevious || isLoading}
                    onClick={() => loadNotifications(pagination.page - 1)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={!canNext || isLoading}
                    onClick={() => loadNotifications(pagination.page + 1)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Next
                  </button>
                </div>
              </section>
            ) : null}
          </div>
        </main>
      </div>

      {rejectTarget ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-900">Reject category request</h3>
            <p className="mt-1 text-xs text-slate-600">Add a reason that will be sent to the seller.</p>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Write rejection reason..."
              className="mt-3 h-24 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (reviewingRequestId) return;
                  setRejectTarget(null);
                  setRejectReason('');
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejectReason.trim().length < 3 || Boolean(reviewingRequestId)}
                onClick={async () => {
                  const metadata =
                    rejectTarget?.metadata && typeof rejectTarget.metadata === 'object'
                      ? rejectTarget.metadata
                      : {};
                  const requestId = String(metadata?.request_id || '').trim();
                  await reviewCategoryRequest({
                    notification: rejectTarget,
                    requestId,
                    status: 'rejected',
                    reviewNote: rejectReason.trim(),
                  });
                  setRejectTarget(null);
                  setRejectReason('');
                }}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reviewingRequestId ? 'Submitting...' : 'Reject request'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
