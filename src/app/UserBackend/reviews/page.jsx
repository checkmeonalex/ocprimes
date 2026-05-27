'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useAlerts } from '@/context/AlertContext'

const formatDate = (value) => {
  const timestamp = new Date(value || '').getTime()
  if (Number.isNaN(timestamp)) return ''
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const buildProductHref = (product) => {
  const routeKey = String(product?.slug || product?.id || '').trim()
  if (routeKey) return `/product/${encodeURIComponent(routeKey)}`
  return ''
}

const buildProductReviewHref = (product, reviewId) => {
  const routeKey = String(product?.slug || product?.id || '').trim()
  const reviewKey = String(reviewId || '').trim()
  if (!routeKey) return ''
  const params = new URLSearchParams()
  if (reviewKey) params.set('focus_review', reviewKey)
  const query = params.toString()
  return `/product/${encodeURIComponent(routeKey)}${query ? `?${query}` : ''}#reviews-section`
}

const renderStars = (rating) => (
  <div className='flex items-center gap-0.5' aria-label={`Rating ${rating} out of 5`}>
    {[1, 2, 3, 4, 5].map((star) => (
      <svg
        key={`star-${star}`}
        className={`h-4 w-4 ${star <= rating ? 'text-amber-400' : 'text-slate-300'}`}
        fill='currentColor'
        viewBox='0 0 24 24'
      >
        <path d='M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z' />
      </svg>
    ))}
  </div>
)

const getStatusChipClass = (status) => {
  if (status === 'published') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (status === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (status === 'hidden') return 'bg-rose-50 text-rose-700 border-rose-200'
  return 'bg-slate-50 text-slate-700 border-slate-200'
}

const ReviewsListSkeleton = () => (
  <div className='space-y-3'>
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className='rounded-xl border border-slate-200 bg-white p-3 sm:p-4'>
        <div className='space-y-2'>
          <div className='h-3.5 w-1/3 animate-pulse rounded-md bg-slate-200/85' />
          <div className='h-3 w-2/3 animate-pulse rounded-md bg-slate-200/70' />
          <div className='h-3 w-full animate-pulse rounded-md bg-slate-200/70' />
          <div className='h-3 w-5/6 animate-pulse rounded-md bg-slate-200/70' />
          <div className='h-14 w-full animate-pulse rounded-md bg-slate-200/65' />
        </div>
      </div>
    ))}
  </div>
)

export default function ReviewsPage() {
  const { pushAlert } = useAlerts()
  const [isLoading, setIsLoading] = useState(true)
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [deleteArmedId, setDeleteArmedId] = useState('')
  const [deletingReviewId, setDeletingReviewId] = useState('')

  useEffect(() => {
    let isActive = true
    const loadReviews = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/user/reviews?page=1&per_page=100', {
          method: 'GET',
          cache: 'no-store',
        })
        const payload = await response.json().catch(() => null)
        if (!isActive) return
        if (response.status === 401) {
          window.location.href = '/login?next=/UserBackend/reviews'
          return
        }
        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to load reviews.')
        }
        setItems(Array.isArray(payload?.items) ? payload.items : [])
      } catch (error) {
        if (!isActive) return
        setItems([])
        pushAlert({
          type: 'error',
          title: 'Reviews',
          message: error?.message || 'Unable to load reviews.',
        })
      } finally {
        if (isActive) setIsLoading(false)
      }
    }
    loadReviews()
    return () => {
      isActive = false
    }
  }, [pushAlert])

  const filtered = useMemo(() => {
    const safeQuery = String(query || '').trim().toLowerCase()
    if (!safeQuery) return items
    return items.filter((item) => {
      const content = String(item?.content || '').toLowerCase()
      const productName = String(item?.product?.name || '').toLowerCase()
      const status = String(item?.status || '').toLowerCase()
      return (
        content.includes(safeQuery) ||
        productName.includes(safeQuery) ||
        status.includes(safeQuery)
      )
    })
  }, [items, query])

  const handleDeleteReview = async (reviewId) => {
    const safeReviewId = String(reviewId || '').trim()
    if (!safeReviewId || deletingReviewId) return
    setDeletingReviewId(safeReviewId)
    try {
      const response = await fetch(
        `/api/user/reviews?review_id=${encodeURIComponent(safeReviewId)}`,
        {
          method: 'DELETE',
          cache: 'no-store',
        },
      )
      const payload = await response.json().catch(() => null)
      if (response.status === 401) {
        window.location.href = '/login?next=/UserBackend/reviews'
        return
      }
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to delete review.')
      }
      setItems((prev) => prev.filter((entry) => String(entry?.id || '') !== safeReviewId))
      setDeleteArmedId('')
      pushAlert({
        type: 'success',
        title: 'Reviews',
        message: 'Review deleted.',
      })
    } catch (error) {
      pushAlert({
        type: 'error',
        title: 'Reviews',
        message: error?.message || 'Unable to delete review.',
      })
    } finally {
      setDeletingReviewId('')
    }
  }

  return (
    <section className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <h1 className='text-xl font-semibold text-slate-900'>Your reviews</h1>
          <p className='mt-1 text-sm text-slate-600'>
            All reviews you have posted across products.
          </p>
        </div>
        <div className='text-sm font-semibold text-slate-700'>
          {filtered.length} review{filtered.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className='mt-4'>
        <label className='flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500'>
          <svg className='h-4 w-4 text-slate-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
            />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Search your reviews'
            className='w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400'
            aria-label='Search your reviews'
          />
        </label>
      </div>

      <div className='mt-4 space-y-3'>
        {isLoading ? (
          <ReviewsListSkeleton />
        ) : null}

        {!isLoading && !filtered.length ? (
          <div className='rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500'>
            You have not posted any reviews yet.
          </div>
        ) : null}

        {!isLoading &&
          filtered.map((item) => {
            const reviewImages = Array.isArray(item?.review_image_urls) ? item.review_image_urls : []
            const reviewVideos = Array.isArray(item?.review_video_urls) ? item.review_video_urls : []
            const productForRoute = {
              ...(item?.product || {}),
              id: String(item?.product?.id || item?.product_id || '').trim(),
            }
            const productHref =
              buildProductReviewHref(productForRoute, item?.id) || buildProductHref(productForRoute)
            const isDeleteArmed = deleteArmedId === item.id
            const isDeleting = deletingReviewId === item.id

            return (
              <article key={item.id} className='rounded-xl border border-slate-200 bg-white p-3 sm:p-4'>
                <div className='flex flex-wrap items-start justify-between gap-2'>
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      {renderStars(Number(item?.rating) || 0)}
                      <span className='text-xs text-slate-500'>{formatDate(item?.created_at)}</span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getStatusChipClass(
                          String(item?.status || ''),
                        )}`}
                      >
                        {String(item?.status || 'published')}
                      </span>
                    </div>
                  </div>
                  <div className='shrink-0'>
                    {!isDeleteArmed ? (
                      <button
                        type='button'
                        onClick={() => setDeleteArmedId(String(item.id || ''))}
                        className='inline-flex h-8 items-center rounded-full border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50'
                        disabled={Boolean(deletingReviewId)}
                      >
                        Delete
                      </button>
                    ) : (
                      <div className='flex items-center gap-2'>
                        <button
                          type='button'
                          onClick={() => setDeleteArmedId('')}
                          className='inline-flex h-8 items-center rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50'
                          disabled={isDeleting}
                        >
                          Cancel
                        </button>
                        <button
                          type='button'
                          onClick={() => handleDeleteReview(item.id)}
                          className='inline-flex h-8 items-center rounded-full bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
                          disabled={isDeleting}
                        >
                          {isDeleting ? 'Deleting...' : 'Confirm delete'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className='mt-2 whitespace-pre-line text-sm text-slate-700'>{item?.content || ''}</p>

                {reviewImages.length || reviewVideos.length ? (
                  <div className='mt-3 flex flex-wrap gap-2'>
                    {reviewImages.map((url, index) => (
                      <span
                        key={`${item.id}-image-${index}`}
                        className='h-16 w-16 overflow-hidden rounded-md border border-slate-200'
                      >
                        <img src={url} alt='Review image' className='h-full w-full object-cover' />
                      </span>
                    ))}
                    {reviewVideos.map((url, index) => (
                      <span
                        key={`${item.id}-video-${index}`}
                        className='relative h-16 w-16 overflow-hidden rounded-md border border-slate-200 bg-slate-900'
                      >
                        <video src={url} muted preload='metadata' className='h-full w-full object-cover' />
                        <span className='pointer-events-none absolute inset-0 flex items-center justify-center'>
                          <span className='rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white'>
                            Video
                          </span>
                        </span>
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className='mt-3'>
                  {productHref ? (
                    <Link
                      href={productHref}
                      className='inline-flex h-9 items-center justify-center rounded-md bg-slate-900 px-4 text-xs font-semibold uppercase tracking-[0.06em] text-white transition hover:bg-slate-800'
                    >
                      VIEW PRODUCT
                    </Link>
                  ) : (
                    <button
                      type='button'
                      disabled
                      className='inline-flex h-9 cursor-not-allowed items-center justify-center rounded-md bg-slate-300 px-4 text-xs font-semibold uppercase tracking-[0.06em] text-white'
                    >
                      VIEW PRODUCT
                    </button>
                  )}
                </div>
              </article>
            )
          })}
      </div>
    </section>
  )
}
