'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader';

const STAR_ITEMS = [1, 2, 3, 4, 5];

const formatDate = (value) => {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const renderStars = (rating) => (
  <div className="flex items-center gap-0.5" aria-label={`Rating ${rating} out of 5`}>
    {STAR_ITEMS.map((star) => (
      <svg
        key={star}
        viewBox="0 0 24 24"
        className={`h-4 w-4 ${star <= rating ? 'text-amber-500' : 'text-slate-300'}`}
        fill="currentColor"
      >
        <path d="m12 2.8 2.8 5.68 6.27.91-4.54 4.42 1.07 6.24L12 17.1 6.4 20.05l1.07-6.24L2.93 9.39l6.27-.91L12 2.8Z" />
      </svg>
    ))}
  </div>
);

const ReviewsListSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex min-w-0 flex-1 gap-3">
            <div className="h-20 w-20 shrink-0 animate-pulse rounded-xl bg-slate-200/85" />
            <div className="min-w-0 flex-1 space-y-2 pt-1">
              <div className="h-3.5 w-2/3 animate-pulse rounded-md bg-slate-200/85" />
              <div className="h-3 w-1/2 animate-pulse rounded-md bg-slate-200/70" />
              <div className="h-3 w-1/3 animate-pulse rounded-md bg-slate-200/70" />
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <div className="h-3.5 w-1/3 animate-pulse rounded-md bg-slate-200/85" />
            <div className="h-3 w-full animate-pulse rounded-md bg-slate-200/70" />
            <div className="h-3 w-5/6 animate-pulse rounded-md bg-slate-200/70" />
            <div className="h-8 w-28 animate-pulse rounded-md bg-slate-200/70" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default function ReviewsPage() {
  const searchParams = useSearchParams();
  const initialSearch = useMemo(() => searchParams?.get('q') || '', [searchParams]);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: 0, average_rating: 0 });
  const [pagination, setPagination] = useState({ page: 1, per_page: 20, total: 0, total_pages: 0 });
  const [search, setSearch] = useState(initialSearch);
  const [ratingFilter, setRatingFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [permissions, setPermissions] = useState({
    can_edit_review_content: false,
    can_change_status: false,
    can_delete_review: false,
  });
  const [editingReview, setEditingReview] = useState(null);
  const [editRating, setEditRating] = useState('5');
  const [editStatus, setEditStatus] = useState('published');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const latestLoadRequestIdRef = useRef(0);

  const loadReviews = useCallback(async (page = 1, signal) => {
    const requestId = latestLoadRequestIdRef.current + 1;
    latestLoadRequestIdRef.current = requestId;
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '20' });
      if (search.trim()) params.set('q', search.trim());
      if (ratingFilter) params.set('rating', ratingFilter);
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(`/api/admin/reviews?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
        signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to load reviews.');
      }

      if (requestId !== latestLoadRequestIdRef.current) return;
      setItems(Array.isArray(payload?.items) ? payload.items : []);
      setSummary(payload?.summary || { total: 0, average_rating: 0 });
      setPagination(payload?.pagination || { page: 1, per_page: 20, total: 0, total_pages: 0 });
      setPermissions({
        can_edit_review_content: Boolean(payload?.permissions?.can_edit_review_content),
        can_change_status: Boolean(payload?.permissions?.can_change_status),
        can_delete_review: Boolean(payload?.permissions?.can_delete_review),
      });
    } catch (err) {
      if (err?.name === 'AbortError') return;
      if (requestId !== latestLoadRequestIdRef.current) return;
      setError(err?.message || 'Unable to load reviews.');
      setItems([]);
      setSummary({ total: 0, average_rating: 0 });
      setPagination({ page: 1, per_page: 20, total: 0, total_pages: 0 });
      setPermissions({
        can_edit_review_content: false,
        can_change_status: false,
        can_delete_review: false,
      });
    } finally {
      if (requestId !== latestLoadRequestIdRef.current) return;
      setIsLoading(false);
    }
  }, [ratingFilter, search, statusFilter]);

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    const controller = new AbortController();
    loadReviews(1, controller.signal);
    return () => controller.abort();
  }, [loadReviews]);

  const activeFiltersLabel = useMemo(() => {
    const labels = [];
    if (search.trim()) labels.push(`"${search.trim()}"`);
    if (ratingFilter) labels.push(`${ratingFilter}★`);
    if (statusFilter) labels.push(statusFilter);
    return labels.join(' • ');
  }, [ratingFilter, search, statusFilter]);

  const openEditor = useCallback((item) => {
    setEditingReview(item);
    setEditRating(String(Number(item?.rating) || 1));
    setEditStatus(String(item?.status || 'published'));
    setEditContent(String(item?.content || ''));
  }, []);

  const closeEditor = useCallback(() => {
    if (isSaving) return;
    setEditingReview(null);
    setEditRating('5');
    setEditStatus('published');
    setEditContent('');
  }, [isSaving]);

  const saveReviewChanges = useCallback(async () => {
    if (!editingReview?.id || isSaving) return;
    const content = String(editContent || '').trim();
    if (permissions.can_edit_review_content && !content) {
      setError('Review content cannot be empty.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingReview.id,
          ...(permissions.can_edit_review_content ? { rating: Number(editRating) || 1 } : {}),
          ...(permissions.can_change_status ? { status: editStatus } : {}),
          ...(permissions.can_edit_review_content ? { content } : {}),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to update review.');
      }
      const updated = payload?.item || {};
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingReview.id
            ? {
                ...item,
                rating: permissions.can_edit_review_content
                  ? Number(updated?.rating) || Number(editRating) || 1
                  : item.rating,
                status: permissions.can_change_status
                  ? String(updated?.status || editStatus)
                  : item.status,
                content: permissions.can_edit_review_content
                  ? String(updated?.content || content)
                  : item.content,
              }
            : item,
        ),
      );
      closeEditor();
    } catch (err) {
      setError(err?.message || 'Unable to update review.');
    } finally {
      setIsSaving(false);
    }
  }, [closeEditor, editContent, editRating, editStatus, editingReview, isSaving, permissions.can_change_status, permissions.can_edit_review_content]);

  const deleteReview = useCallback(async () => {
    if (!editingReview?.id || isDeleting || !permissions.can_delete_review) return;
    const confirmed = window.confirm('Delete this review permanently?');
    if (!confirmed) return;
    setIsDeleting(true);
    setError('');
    try {
      const params = new URLSearchParams({ id: String(editingReview.id) });
      const response = await fetch(`/api/admin/reviews?${params.toString()}`, {
        method: 'DELETE',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to delete review.');
      }
      setItems((prev) => prev.filter((item) => item.id !== editingReview.id));
      setSummary((prev) => ({
        ...prev,
        total: Math.max(0, Number(prev?.total || 0) - 1),
      }));
      closeEditor();
    } catch (err) {
      setError(err?.message || 'Unable to delete review.');
    } finally {
      setIsDeleting(false);
    }
  }, [closeEditor, editingReview, isDeleting, permissions.can_delete_review]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 px-4 pb-8 sm:px-6 lg:px-10">
          <AdminDesktopHeader />
          <div className="mx-auto w-full max-w-7xl space-y-6">
            <section className="border-b border-slate-200 pb-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Reviews</p>
                  <h1 className="mt-1 text-2xl font-semibold text-slate-900">Product Reviews</h1>
                  <p className="mt-1 text-sm text-slate-500">
                    All reviews submitted for products in your catalog.
                  </p>
                </div>
                <div className="grid w-full grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:w-auto sm:min-w-[220px]">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Total reviews</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{summary.total || 0}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Avg. rating</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{Number(summary.average_rating || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-[1fr_150px_160px]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by reviewer, title, or comment"
                  className="col-span-2 h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 md:col-span-1"
                />
                <select
                  value={ratingFilter}
                  onChange={(event) => setRatingFilter(event.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                >
                  <option value="">Any rating</option>
                  <option value="5">5★</option>
                  <option value="4">4★</option>
                  <option value="3">3★</option>
                  <option value="2">2★</option>
                  <option value="1">1★</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                >
                  <option value="">Any status</option>
                  <option value="published">Published</option>
                  <option value="pending">Pending</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>

              {activeFiltersLabel ? (
                <p className="mt-2 text-xs text-slate-500">Active: {activeFiltersLabel}</p>
              ) : null}
            </section>

            {error ? (
              <div className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
            ) : null}

            <section className="space-y-3">
              {isLoading ? (
                <ReviewsListSkeleton />
              ) : items.length ? (
                items.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div className="flex flex-col gap-4 md:flex-row">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                          {item?.product?.image_url ? (
                            <img src={item.product.image_url} alt={item?.product?.name || 'Product'} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-400">No image</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{item?.product?.name || 'Unknown product'}</p>
                          <p className="mt-0.5 text-xs text-slate-500">/{item?.product?.slug || '--'} • {item?.product?.status || 'draft'}</p>
                          <div className="mt-2 flex items-center gap-2">
                            {renderStars(Number(item.rating) || 0)}
                            <span className="text-xs font-medium text-slate-500">{formatDate(item.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{item.reviewer_name || 'Anonymous'}</p>
                          {item.is_verified_purchase ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Verified purchase</span>
                          ) : null}
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{item.status || 'published'}</span>
                        </div>
                        {item.title ? <p className="mt-2 text-sm font-semibold text-slate-800">{item.title}</p> : null}
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.content || 'No written review.'}</p>
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => openEditor(item)}
                            className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {permissions.can_edit_review_content ? 'Edit review' : 'Update status'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                  <p className="text-sm font-semibold text-slate-700">No reviews match your filters.</p>
                  <p className="mt-1 text-sm text-slate-500">Try changing rating, status, or search text.</p>
                </div>
              )}
            </section>

            {!isLoading && pagination.total_pages > 1 ? (
              <section className="flex items-center justify-between border-t border-slate-200 px-1 py-3 text-sm">
                <p className="text-slate-600">
                  Page {pagination.page} of {pagination.total_pages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => loadReviews(pagination.page - 1)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.total_pages}
                    onClick={() => loadReviews(pagination.page + 1)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </section>
            ) : null}
            {editingReview ? (
              <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-3">
                <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-2xl sm:p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-900">
                      {permissions.can_edit_review_content ? 'Edit review' : 'Update review status'}
                    </h2>
                    <button
                      type="button"
                      onClick={closeEditor}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                      aria-label="Close editor"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                  <div className={`mt-3 grid gap-3 ${permissions.can_edit_review_content ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
                    {permissions.can_edit_review_content ? (
                      <label className="text-sm">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Rating</span>
                        <select
                          value={editRating}
                          onChange={(event) => setEditRating(event.target.value)}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                        >
                          <option value="5">5 stars</option>
                          <option value="4">4 stars</option>
                          <option value="3">3 stars</option>
                          <option value="2">2 stars</option>
                          <option value="1">1 star</option>
                        </select>
                      </label>
                    ) : null}
                    {permissions.can_change_status ? (
                      <label className="text-sm">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
                        <select
                          value={editStatus}
                          onChange={(event) => setEditStatus(event.target.value)}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                        >
                          <option value="published">Published</option>
                          <option value="pending">Pending</option>
                          <option value="hidden">Hidden</option>
                        </select>
                      </label>
                    ) : null}
                  </div>
                  {permissions.can_edit_review_content ? (
                    <label className="mt-3 block text-sm">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Review content</span>
                      <textarea
                        value={editContent}
                        onChange={(event) => setEditContent(event.target.value)}
                        maxLength={1200}
                        className="h-36 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                      />
                    </label>
                  ) : null}
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <div>
                      {permissions.can_delete_review ? (
                        <button
                          type="button"
                          onClick={deleteReview}
                          disabled={isSaving || isDeleting}
                          aria-label={isDeleting ? 'Deleting review' : 'Delete review'}
                          title={isDeleting ? 'Deleting review' : 'Delete review'}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 sm:h-auto sm:w-auto sm:px-3 sm:py-2 sm:text-xs"
                        >
                          <span className="sm:hidden">
                            {isDeleting ? (
                              <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 3a9 9 0 1 1-9 9" strokeLinecap="round" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M4 7h16" />
                                <path d="M9 7V5h6v2" />
                                <path d="M7 7l1 12h8l1-12" />
                              </svg>
                            )}
                          </span>
                          <span className="hidden sm:inline">{isDeleting ? 'Deleting...' : 'Delete review'}</span>
                        </button>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={closeEditor}
                      aria-label="Cancel"
                      title="Cancel"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 sm:h-auto sm:w-auto sm:px-3 sm:py-2 sm:text-xs"
                    >
                      <span className="sm:hidden">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                        </svg>
                      </span>
                      <span className="hidden sm:inline">Cancel</span>
                    </button>
                    <button
                      type="button"
                      onClick={saveReviewChanges}
                      disabled={isSaving || isDeleting}
                      aria-label={isSaving ? 'Saving changes' : 'Save changes'}
                      title={isSaving ? 'Saving changes' : 'Save changes'}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:h-auto sm:w-auto sm:px-3 sm:py-2 sm:text-xs"
                    >
                      <span className="sm:hidden">
                        {isSaving ? (
                          <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 3a9 9 0 1 1-9 9" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m5 13 4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save changes'}</span>
                    </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
