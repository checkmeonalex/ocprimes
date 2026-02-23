import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAlerts } from '@/context/AlertContext'

const MAX_REVIEW_LENGTH = 1200
const MAX_REVIEW_MEDIA_FILES = 6

const StarRow = ({ rating }) => {
  return (
    <div className='flex items-center gap-0.5'>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-5 w-5 ${
            star <= rating ? 'text-amber-400' : 'text-gray-200'
          }`}
          fill='currentColor'
          viewBox='0 0 24 24'
        >
          <path d='M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z' />
        </svg>
      ))}
    </div>
  )
}

const getInitials = (value) =>
  String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'U'

const formatReviewDate = (value) => {
  const date = new Date(value || '')
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const maskReviewerName = (value) => {
  const clean = String(value || '').trim()
  if (!clean) return 'u***'
  const first = clean.slice(0, 1)
  const second = clean.slice(1, 2)
  return `${first}${second}***`
}

const buildProductHref = (review) => {
  const explicitSlug = String(review?.product?.slug || '').trim()
  if (explicitSlug) return `/product/${encodeURIComponent(explicitSlug)}`
  const fallbackFromName = String(review?.product?.name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  if (!fallbackFromName) return ''
  return `/product/${encodeURIComponent(fallbackFromName)}`
}

const getSellerPerformance = (ratingValue) => {
  const rating = Number(ratingValue) || 0
  if (rating >= 4.5) {
    return {
      label: 'Excellent',
      dotClassName: 'bg-emerald-500',
      textClassName: 'text-emerald-700',
    }
  }
  if (rating >= 4.0) {
    return {
      label: 'Very good',
      dotClassName: 'bg-sky-500',
      textClassName: 'text-sky-700',
    }
  }
  if (rating >= 3.0) {
    return {
      label: 'Good',
      dotClassName: 'bg-amber-500',
      textClassName: 'text-amber-700',
    }
  }
  if (rating >= 2.0) {
    return {
      label: 'Fair',
      dotClassName: 'bg-orange-500',
      textClassName: 'text-orange-700',
    }
  }
  return {
    label: 'Needs improvement',
    dotClassName: 'bg-rose-500',
    textClassName: 'text-rose-700',
  }
}

const CustomerReviews = ({ data, productSlug, onReviewSubmitted }) => {
  const router = useRouter()
  const pathname = usePathname()
  const { pushAlert } = useAlerts()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState('recommended')
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)
  const [activeMedia, setActiveMedia] = useState(null)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [composerRating, setComposerRating] = useState(1)
  const [composerContent, setComposerContent] = useState('')
  const [composerFiles, setComposerFiles] = useState([])
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const canWriteReview = Boolean(data?.canWriteReview)
  const totalItems = Number(data?.summary?.totalReviews || 0)
  const sellerPerformance = getSellerPerformance(data?.summary?.rating)
  const total = data.breakdown.reduce((sum, row) => sum + row.count, 0)
  const searchLabel = useMemo(() => {
    if (totalItems > 0) return `Search ${totalItems} reviews`
    return 'Search reviews'
  }, [totalItems])
  const filteredReviews = useMemo(() => {
    const query = String(searchQuery || '').trim().toLowerCase()
    const reviews = Array.isArray(data?.reviews) ? data.reviews : []
    const searched = !query
      ? reviews
      : reviews.filter((review) => {
      const reviewer = String(review?.name || '').toLowerCase()
      const title = String(review?.title || '').toLowerCase()
      const body = String(review?.body || '').toLowerCase()
      return reviewer.includes(query) || title.includes(query) || body.includes(query)
    })
    const toTime = (value) => {
      const ts = new Date(value || '').getTime()
      return Number.isNaN(ts) ? 0 : ts
    }
    const sorted = [...searched]
    sorted.sort((a, b) => {
      const aRating = Number(a?.rating) || 0
      const bRating = Number(b?.rating) || 0
      const aTime = toTime(a?.createdAt)
      const bTime = toTime(b?.createdAt)
      if (sortMode === 'most_recent') return bTime - aTime
      if (sortMode === 'highest_rating') {
        if (bRating !== aRating) return bRating - aRating
        return bTime - aTime
      }
      if (sortMode === 'lowest_rating') {
        if (aRating !== bRating) return aRating - bRating
        return bTime - aTime
      }
      if (bRating !== aRating) return bRating - aRating
      return bTime - aTime
    })
    return sorted
  }, [data?.reviews, searchQuery, sortMode])
  useEffect(() => {
    if (!isSortMenuOpen) return undefined
    const handleWindowClick = () => setIsSortMenuOpen(false)
    window.addEventListener('click', handleWindowClick)
    return () => window.removeEventListener('click', handleWindowClick)
  }, [isSortMenuOpen])

  const resetComposer = () => {
    setComposerRating(1)
    setComposerContent('')
    setComposerFiles([])
    setIsSubmittingReview(false)
  }

  const openComposer = () => {
    resetComposer()
    setIsComposerOpen(true)
  }

  const closeComposer = () => {
    if (isSubmittingReview) return
    setIsComposerOpen(false)
  }

  const handleComposerFiles = (event) => {
    const selected = Array.from(event?.target?.files || [])
    if (!selected.length) {
      setComposerFiles([])
      return
    }
    if (selected.length > MAX_REVIEW_MEDIA_FILES) {
      pushAlert({
        type: 'error',
        title: 'Reviews',
        message: `You can upload up to ${MAX_REVIEW_MEDIA_FILES} files.`,
      })
      setComposerFiles(selected.slice(0, MAX_REVIEW_MEDIA_FILES))
      return
    }
    setComposerFiles(selected)
  }

  const removeComposerFile = (index) => {
    setComposerFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
  }

  const handleSubmitReview = async () => {
    const trimmed = String(composerContent || '').trim()
    if (!trimmed) {
      pushAlert({
        type: 'error',
        title: 'Reviews',
        message: 'Write your review before submitting.',
      })
      return
    }
    if (trimmed.length > MAX_REVIEW_LENGTH) {
      pushAlert({
        type: 'error',
        title: 'Reviews',
        message: `Review must be ${MAX_REVIEW_LENGTH} characters or less.`,
      })
      return
    }
    if (!productSlug) {
      pushAlert({
        type: 'error',
        title: 'Reviews',
        message: 'Product is unavailable for review right now.',
      })
      return
    }

    const formData = new FormData()
    formData.append('rating', String(composerRating))
    formData.append('content', trimmed)
    composerFiles.forEach((file) => {
      formData.append('files', file)
    })

    setIsSubmittingReview(true)
    try {
      const response = await fetch(
        `/api/products/${encodeURIComponent(productSlug)}/reviews`,
        {
          method: 'POST',
          body: formData,
        },
      )
      const payload = await response.json().catch(() => null)
      if (response.status === 401) {
        pushAlert({
          type: 'info',
          title: 'Reviews',
          message: 'Please sign in to write a review.',
        })
        const nextPath = pathname || `/product/${productSlug}`
        router.push(`/login?next=${encodeURIComponent(nextPath)}`)
        return
      }
      if (!response.ok) {
        pushAlert({
          type: 'error',
          title: 'Reviews',
          message: payload?.error || payload?.message || 'Unable to submit review.',
        })
        return
      }
      pushAlert({
        type: payload?.requires_moderation ? 'info' : 'success',
        title: 'Reviews',
        message: payload?.message || 'Review submitted successfully.',
      })
      setIsComposerOpen(false)
      resetComposer()
      if (typeof onReviewSubmitted === 'function') {
        onReviewSubmitted()
      }
    } catch (_error) {
      pushAlert({
        type: 'error',
        title: 'Reviews',
        message: 'Unable to submit review.',
      })
    } finally {
      setIsSubmittingReview(false)
    }
  }

  return (
    <div className='bg-white p-3 space-y-3'>
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-semibold text-gray-900'>
          Customer Reviews
        </h3>
        <div className={`text-[10px] flex items-center gap-2 ${sellerPerformance.textClassName}`}>
          <span className={`inline-flex w-2 h-2 rounded-full ${sellerPerformance.dotClassName}`}></span>
          {sellerPerformance.label}
        </div>
      </div>

      <div className='grid gap-4 sm:grid-cols-[140px_1fr]'>
        <div className='space-y-2'>
          <div className='text-3xl font-semibold text-gray-900'>
            {data.summary.rating}
          </div>
          <StarRow rating={Math.round(data.summary.rating)} />
          <div className='text-xs text-gray-500'>
            ({data.summary.totalReviews} reviews)
          </div>
        </div>

        <div className='space-y-2'>
          {data.breakdown.map((row) => {
            const percent = total ? Math.round((row.count / total) * 100) : 0
            return (
              <div key={row.stars} className='flex items-center gap-2 text-xs'>
                <span className='w-4 text-gray-600'>{row.stars}</span>
                <div className='flex-1 h-2 rounded-full bg-gray-100 overflow-hidden'>
                  <div
                    className='h-full bg-amber-400'
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
                <span className='w-10 text-right text-gray-500'>
                  {row.count}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className='flex flex-wrap items-start gap-2 bg-gray-50 rounded-lg px-3 py-2 text-xs sm:flex-nowrap sm:items-center sm:justify-between'>
        <div className='flex items-center gap-2 text-gray-700'>
          <span className='font-semibold text-gray-900'>
            {data.summary.wouldRecommendPercent}%
          </span>
          Would You Recommend ({data.summary.wouldRecommendCount} recommendations)
        </div>
        {canWriteReview ? (
          <button
            type='button'
            onClick={openComposer}
            className='rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500'
          >
            Write a Review
          </button>
        ) : null}
      </div>
      {isComposerOpen ? (
        <div className='fixed inset-0 z-[2147483600] flex items-center justify-center bg-black/60 p-3'>
          <div className='w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl'>
            <div className='flex items-center justify-between'>
              <p className='text-base font-semibold text-slate-900'>Write a Review</p>
              <button
                type='button'
                onClick={closeComposer}
                className='inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100'
                aria-label='Close review modal'
              >
                <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='1.8'>
                  <path d='M6 6l12 12M18 6L6 18' strokeLinecap='round' />
                </svg>
              </button>
            </div>
            <div className='mt-3 space-y-3'>
              <div className='flex items-center gap-1'>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={`composer-star-${star}`}
                    type='button'
                    onClick={() => setComposerRating(star)}
                    className='rounded p-1'
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    <svg
                      className={`h-7 w-7 ${
                        star <= composerRating ? 'text-amber-400' : 'text-gray-300'
                      }`}
                      fill='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path d='M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z' />
                    </svg>
                  </button>
                ))}
              </div>
              <div className='space-y-2'>
                <label className='inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50'>
                  <input
                    type='file'
                    multiple
                    accept='image/*,video/*'
                    className='hidden'
                    onChange={handleComposerFiles}
                  />
                  Add images or videos
                </label>
                {composerFiles.length ? (
                  <div className='flex flex-wrap gap-2'>
                    {composerFiles.map((file, index) => (
                      <div
                        key={`composer-file-${file.name}-${index}`}
                        className='inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700'
                      >
                        <span className='max-w-[140px] truncate'>{file.name}</span>
                        <button
                          type='button'
                          onClick={() => removeComposerFile(index)}
                          className='inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200'
                          aria-label='Remove media'
                        >
                          <svg viewBox='0 0 24 24' className='h-3 w-3' fill='none' stroke='currentColor' strokeWidth='2'>
                            <path d='M6 6l12 12M18 6L6 18' strokeLinecap='round' />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <textarea
                value={composerContent}
                onChange={(event) => setComposerContent(event.target.value)}
                placeholder='Write your review'
                maxLength={MAX_REVIEW_LENGTH}
                className='h-28 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400'
              />
              <div className='flex items-center justify-end gap-2'>
                <button
                  type='button'
                  onClick={closeComposer}
                  className='rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={handleSubmitReview}
                  disabled={isSubmittingReview}
                  className='rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60'
                >
                  {isSubmittingReview ? 'Submitting...' : 'Submit review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {activeMedia ? (
        <div className='fixed inset-0 z-[2147483600] flex items-center justify-center overflow-y-auto p-2 pt-[calc(env(safe-area-inset-top)+8px)] sm:p-4'>
          <button
            type='button'
            className='absolute inset-0 bg-black/65'
            onClick={() => setActiveMedia(null)}
            aria-label='Close media preview'
          />
          <div className='relative z-10 my-2 max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-none bg-white p-4 shadow-2xl sm:my-6 sm:rounded-sm sm:p-5'>
            <button
              type='button'
              className='absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center text-slate-500 hover:text-slate-700'
              onClick={() => setActiveMedia(null)}
              aria-label='Close media preview'
            >
              <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='1.8'>
                <path d='M6 6l12 12M18 6L6 18' strokeLinecap='round' />
              </svg>
            </button>
            <div className='grid gap-4 pt-5 md:grid-cols-[1.1fr_0.9fr]'>
              <div className='space-y-3'>
                <div className='flex min-h-[360px] items-center justify-center bg-slate-100 p-3 md:min-h-[540px]'>
                  {activeMedia.items?.[activeMedia.index]?.type === 'video' ? (
                    <video
                      src={activeMedia.items[activeMedia.index].url}
                      controls
                      playsInline
                      className='max-h-[72vh] w-auto max-w-full object-contain'
                    />
                  ) : (
                    <img
                      src={activeMedia.items?.[activeMedia.index]?.url}
                      alt='Review media preview'
                      className='max-h-[72vh] w-auto max-w-full object-contain'
                    />
                  )}
                </div>
                {Array.isArray(activeMedia.items) && activeMedia.items.length > 1 ? (
                  <div className='flex items-center gap-2 overflow-x-auto'>
                    {activeMedia.items.map((item, index) => (
                      <button
                        key={`preview-thumb-${index}`}
                        type='button'
                        onClick={() =>
                          setActiveMedia((prev) => (prev ? { ...prev, index } : prev))
                        }
                        className={`h-12 w-12 shrink-0 overflow-hidden border ${
                          index === activeMedia.index
                            ? 'border-slate-900'
                            : 'border-slate-200'
                        }`}
                      >
                        {item.type === 'video' ? (
                          <video
                            src={item.url}
                            muted
                            playsInline
                            preload='metadata'
                            className='h-full w-full object-cover'
                          />
                        ) : (
                          <img
                            src={item.url}
                            alt='Review media thumbnail'
                            className='h-full w-full object-cover'
                          />
                        )}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className='flex min-h-0 flex-col justify-between p-1'>
                <div className='space-y-3'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='space-y-1'>
                      <p className='text-sm font-semibold text-slate-900'>
                        {maskReviewerName(activeMedia.review?.name)}
                      </p>
                      <StarRow rating={Number(activeMedia.review?.rating) || 0} />
                    </div>
                    <p className='text-sm text-slate-500'>
                      {formatReviewDate(activeMedia.review?.createdAt)}
                    </p>
                  </div>
                  <p className='text-[22px] leading-snug text-slate-900'>
                    {activeMedia.review?.body}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className='flex items-center gap-2'>
        <label className='flex-1 bg-gray-50 rounded-full px-3 py-2 text-xs text-gray-500 flex items-center gap-2'>
          <svg
            className='h-4 w-4 text-gray-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
            />
          </svg>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={searchLabel}
            className='w-full bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-500'
            aria-label='Search reviews'
          />
        </label>
        <div className='relative'>
          <button
            type='button'
            onClick={(event) => {
              event.stopPropagation()
              setIsSortMenuOpen((prev) => !prev)
            }}
            className='w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100'
            aria-label='Sort reviews'
          >
            <svg
              className='h-4 w-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M8 9h8m-8 6h8M5 12l-2 2m0-4l2 2'
              />
            </svg>
          </button>
          {isSortMenuOpen ? (
            <div
              className='absolute right-0 top-11 z-20 w-44 rounded-xl border border-gray-200 bg-white p-1 shadow-lg'
              onClick={(event) => event.stopPropagation()}
            >
              {[
                { id: 'recommended', label: 'Recommended' },
                { id: 'most_recent', label: 'Most recent' },
                { id: 'highest_rating', label: 'Highest rating' },
                { id: 'lowest_rating', label: 'Lowest rating' },
              ].map((option) => (
                <button
                  key={option.id}
                  type='button'
                  onClick={() => {
                    setSortMode(option.id)
                    setIsSortMenuOpen(false)
                  }}
                  className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-xs ${
                    sortMode === option.id
                      ? 'bg-slate-900 font-semibold text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className='space-y-4'>
        {filteredReviews.map((review) => (
          <div key={review.id}>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <div className='flex min-w-0 items-center gap-3'>
                <div className='h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100'>
                  {review?.avatarUrl ? (
                    <img
                      src={review.avatarUrl}
                      alt={review.name}
                      className='h-full w-full object-cover'
                    />
                  ) : (
                    <div className='flex h-full w-full items-center justify-center text-xs font-semibold text-slate-600'>
                      {getInitials(review.name)}
                    </div>
                  )}
                </div>
                <div className='min-w-0'>
                <div className='text-sm font-semibold text-gray-900'>
                  {review.name}
                </div>
                <div className='text-[11px] text-gray-500'>
                  <div className='flex items-center gap-2'>
                    {formatReviewDate(review.createdAt)}
                    {review.isVerifiedBuyer && (
                      <span className='inline-flex items-center gap-1 text-green-600'>
                        <span className='w-1.5 h-1.5 rounded-full bg-green-600'></span>
                        Verified Buyer
                      </span>
                    )}
                  </div>
                  {review?.product?.name ? (
                    <div className='mt-1'>
                      {buildProductHref(review) ? (
                        <Link
                          href={buildProductHref(review)}
                          className='inline-flex min-w-0 items-center gap-2 hover:underline'
                        >
                          <span className='h-6 w-6 shrink-0 overflow-hidden rounded bg-slate-100'>
                            {review?.product?.image_url ? (
                              <img
                                src={review.product.image_url}
                                alt={review.product.name}
                                className='h-full w-full object-cover'
                              />
                            ) : (
                              <span className='flex h-full w-full items-center justify-center text-[9px] font-semibold text-slate-500'>
                                P
                              </span>
                            )}
                          </span>
                          <span className='truncate max-w-[160px] text-xs font-medium text-gray-600 sm:max-w-[240px]'>
                            {review.product.name}
                          </span>
                        </Link>
                      ) : (
                        <span className='inline-flex min-w-0 items-center gap-2'>
                          <span className='h-6 w-6 shrink-0 overflow-hidden rounded bg-slate-100'>
                            {review?.product?.image_url ? (
                              <img
                                src={review.product.image_url}
                                alt={review.product.name}
                                className='h-full w-full object-cover'
                              />
                            ) : (
                              <span className='flex h-full w-full items-center justify-center text-[9px] font-semibold text-slate-500'>
                                P
                              </span>
                            )}
                          </span>
                          <span className='truncate max-w-[160px] text-xs font-medium text-gray-600 sm:max-w-[240px]'>
                            {review.product.name}
                          </span>
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
                </div>
              </div>
              <div className='ml-[52px] sm:ml-0'>
                <StarRow rating={review.rating} />
              </div>
            </div>
            <div className='mt-1 text-xs text-gray-600'>{review.body}</div>
            {Array.isArray(review?.media) && review.media.length ? (
              <div className='mt-2 flex flex-wrap gap-2'>
                {review.media.map((item, index) => {
                  const isVideo = item?.type === 'video'
                  if (isVideo) {
                    return (
                      <button
                        key={`media-${review.id}-${index}`}
                        type='button'
                        className='h-24 w-24 overflow-hidden rounded-md border border-gray-200'
                        onClick={() =>
                          setActiveMedia({
                            review,
                            items: review.media,
                            index,
                          })
                        }
                        aria-label='Open review video'
                      >
                        <video
                          src={item.url}
                          muted
                          loop
                          playsInline
                          preload='metadata'
                          className='h-full w-full object-cover'
                        />
                      </button>
                    )
                  }
                  return (
                    <button
                      key={`media-${review.id}-${index}`}
                      type='button'
                      className='h-24 w-24 overflow-hidden rounded-md border border-gray-200'
                      onClick={() =>
                        setActiveMedia({
                          review,
                          items: review.media,
                          index,
                        })
                      }
                      aria-label='Open review image'
                    >
                      <img
                        src={item.url}
                        alt='Review media'
                        className='h-full w-full object-cover'
                      />
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
        ))}
        {!filteredReviews.length ? (
          <div className='rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-xs text-gray-500'>
            No reviews found.
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default CustomerReviews
