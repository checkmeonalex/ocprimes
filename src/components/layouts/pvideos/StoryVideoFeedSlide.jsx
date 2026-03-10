'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { ChevronDown, ChevronUp, Heart, MessageCircle, Share2 } from 'lucide-react'
import { useOptionalCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
import { useUserI18n } from '@/lib/i18n/useUserI18n'
import { useAuthUser } from '@/lib/auth/useAuthUser.ts'
import ShareProductModal from '@/components/product/ShareProductModal'
import ProductVariantQuickAddModal from '@/components/product/ProductVariantQuickAddModal'
import StoreCartIcon from '@/components/icons/StoreCartIcon'

const STORY_PLAYER_SHARE_Z_INDEX = 'z-[2147483300]'
const STORY_PLAYER_QUICK_ADD_Z_INDEX = 'z-[2147483400]'
const STORY_PLAYER_QUICK_ADD_LIGHTBOX_Z_INDEX = 'z-[2147483500]'
const STORY_PLAYER_WISHLIST_Z_INDEX = 'z-[2147483600]'
const STORY_PLAYER_WISHLIST_CREATE_Z_INDEX = 'z-[2147483700]'

const buildProductHref = (slug = '') => {
  const normalized = String(slug || '').trim()
  return normalized ? `/product/${normalized}` : ''
}

const resolveShareUrl = (slug = '') => {
  const href = buildProductHref(slug)
  if (!href) return ''
  if (typeof window === 'undefined') return href
  return new URL(href, window.location.origin).toString()
}

const normalizeStoryProductForQuickAdd = (item, story) => {
  if (!item) return null

  const basePrice = Number(item?.price) || 0
  const discountPrice = Number(item?.discount_price) || 0
  const hasDiscount = discountPrice > 0 && basePrice > 0 && discountPrice < basePrice
  const images = Array.isArray(item?.images) ? item.images : []
  const gallery = images
    .map((entry) => String(entry?.url || entry?.image_url || '').trim())
    .filter(Boolean)

  const primaryBrand = Array.isArray(item?.brands) ? item.brands[0] : null

  return {
    id: String(item?.id || story?.product_id || '').trim(),
    slug: String(item?.slug || story?.product_slug || '').trim(),
    name: String(item?.name || story?.product_name || story?.title || '').trim(),
    image: String(item?.image_url || story?.product_image_url || gallery[0] || '').trim(),
    images,
    gallery,
    video: String(item?.product_video_url || '').trim(),
    price: hasDiscount ? discountPrice : basePrice,
    originalPrice: hasDiscount ? basePrice : null,
    shortDescription: String(item?.short_description || '').trim(),
    sku: String(item?.sku || '').trim(),
    stock: Math.max(0, Number(item?.stock_quantity) || 0),
    tags: Array.isArray(item?.tags) ? item.tags : [],
    variations: Array.isArray(item?.variations) ? item.variations : [],
    vendor: String(primaryBrand?.name || story?.seller_name || '').trim(),
    vendorSlug: String(primaryBrand?.slug || '').trim(),
    reviews: Math.max(0, Number(item?.reviews) || 0),
    rating: Math.max(0, Number(item?.rating) || 0),
  }
}

const StoryVideoFeedSlide = ({
  story,
  isActive,
  shouldAttachVideo,
  canGoPrevious = false,
  canGoNext = false,
  onPrevious,
  onNext,
}) => {
  const cart = useOptionalCart()
  const { openSaveModal, isWishlisted, isRecentlySaved } = useWishlist()
  const { formatMoney } = useUserI18n()
  const { user, isLoading: isAuthLoading } = useAuthUser()
  const videoRef = useRef(null)
  const playbackButtonTimerRef = useRef(null)
  const commentNoticeTimerRef = useRef(null)
  const resumeAfterVisibilityRef = useRef(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [productPickerOpen, setProductPickerOpen] = useState(false)
  const [storyProduct, setStoryProduct] = useState(null)
  const [isProductLoading, setIsProductLoading] = useState(false)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [isVideoBuffering, setIsVideoBuffering] = useState(false)
  const [showPlaybackButton, setShowPlaybackButton] = useState(true)
  const [commentNotice, setCommentNotice] = useState('')
  const [mediaAspectRatio, setMediaAspectRatio] = useState(9 / 16)

  const productSlug = String(story?.product_slug || '').trim()
  const productName = String(story?.product_name || story?.title || '').trim()
  const storeName = String(story?.seller_name || '').trim()
  const productHref = useMemo(() => buildProductHref(productSlug), [productSlug])
  const shareUrl = useMemo(() => resolveShareUrl(productSlug), [productSlug])
  const posterUrl = String(story?.product_image_url || '').trim()

  const basePrice = Number(story?.product_price) || 0
  const discountPrice = Number(story?.product_discount_price) || 0
  const hasDiscount = discountPrice > 0 && basePrice > 0 && discountPrice < basePrice
  const displayPrice = hasDiscount ? discountPrice : basePrice
  const originalPrice = hasDiscount ? basePrice : 0
  const isSaved = isWishlisted(story?.product_id) || isRecentlySaved(story?.product_id)
  const reviewCount = Math.max(0, Number(story?.reviews) || 0)
  const reviewHref = productHref ? `${productHref}#reviews-section` : ''
  const mediaFrameStyle = useMemo(
    () => ({ aspectRatio: String(mediaAspectRatio || 9 / 16) }),
    [mediaAspectRatio],
  )

  useEffect(
    () => () => {
      if (playbackButtonTimerRef.current) {
        window.clearTimeout(playbackButtonTimerRef.current)
      }
      if (commentNoticeTimerRef.current) {
        window.clearTimeout(commentNoticeTimerRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    if (isActive) return
    const videoEl = videoRef.current
    resumeAfterVisibilityRef.current = false
    setIsVideoPlaying(false)
    setIsVideoBuffering(false)
    setShowPlaybackButton(true)
    setCommentNotice('')
    if (videoEl) {
      videoEl.pause()
    }
  }, [isActive])

  const revealPlaybackButton = useCallback((hideAfterMs = 0) => {
    if (playbackButtonTimerRef.current) {
      window.clearTimeout(playbackButtonTimerRef.current)
    }
    setShowPlaybackButton(true)
    if (hideAfterMs > 0) {
      playbackButtonTimerRef.current = window.setTimeout(() => {
        setShowPlaybackButton(false)
      }, hideAfterMs)
    }
  }, [])

  useEffect(() => {
    if (!isActive || !shouldAttachVideo) return undefined

    const videoEl = videoRef.current
    if (!videoEl) return undefined
    setIsVideoBuffering(true)

    const playTimer = window.setTimeout(() => {
      void videoEl.play().catch(() => {})
    }, 80)

    const handleVisibilityChange = () => {
      if (!videoRef.current || !isActive) return

      if (document.hidden) {
        if (!videoRef.current.paused) {
          resumeAfterVisibilityRef.current = true
          videoRef.current.pause()
        }
        return
      }

      if (!resumeAfterVisibilityRef.current) return
      resumeAfterVisibilityRef.current = false
      void videoRef.current.play().catch(() => {})
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.clearTimeout(playTimer)
      setIsVideoBuffering(false)
      if (videoRef.current) videoRef.current.pause()
    }
  }, [isActive, shouldAttachVideo])

  const handleWishlist = () => {
    if (!story?.product_id || !productName || !productSlug) return
    openSaveModal({
      id: story.product_id,
      name: productName,
      slug: productSlug,
      price: displayPrice,
      image: posterUrl || '',
    }, {
      overlayZIndexClass: STORY_PLAYER_WISHLIST_Z_INDEX,
      createOverlayZIndexClass: STORY_PLAYER_WISHLIST_CREATE_Z_INDEX,
    })
  }

  const handleAddToCart = () => {
    if (!story?.product_id || !productName || !productSlug) return

    cart?.addItem?.({
      id: story.product_id,
      slug: productSlug,
      name: productName,
      price: displayPrice,
      originalPrice: originalPrice || null,
      image: posterUrl || '',
      vendor: storeName,
    })
  }

  const loadStoryProduct = useCallback(async () => {
    if (storyProduct?.slug === productSlug && storyProduct?.id) return storyProduct
    if (!productSlug) return null

    setIsProductLoading(true)
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(productSlug)}`, {
        method: 'GET',
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.item) {
        throw new Error(payload?.error || 'Unable to load product options.')
      }
      const normalized = normalizeStoryProductForQuickAdd(payload.item, story)
      setStoryProduct(normalized)
      return normalized
    } catch (error) {
      console.error('story product quick-add load failed:', error)
      return null
    } finally {
      setIsProductLoading(false)
    }
  }, [productSlug, story, storyProduct])

  const openStoryProductPicker = useCallback(async () => {
    const product = await loadStoryProduct()
    if (!product) return false
    if (!Array.isArray(product.variations) || product.variations.length <= 0) {
      return false
    }
    setProductPickerOpen(true)
    return true
  }, [loadStoryProduct])

  const handlePrimaryAddAction = async () => {
    if (isProductLoading) return
    if (story?.has_variants) {
      const openedPicker = await openStoryProductPicker()
      if (openedPicker) return
    }
    handleAddToCart()
  }

  const handleProductClick = () => {
    if (!productHref || typeof window === 'undefined') return
    window.open(productHref, '_blank', 'noopener,noreferrer')
  }

  const showCommentNotice = useCallback((message) => {
    setCommentNotice(message)
    if (commentNoticeTimerRef.current) {
      window.clearTimeout(commentNoticeTimerRef.current)
    }
    commentNoticeTimerRef.current = window.setTimeout(() => {
      setCommentNotice('')
    }, 2600)
  }, [])

  const handleCommentAction = useCallback(() => {
    if (typeof window === 'undefined') return
    if (!productSlug) return

    if (reviewCount > 0 && reviewHref) {
      window.location.href = reviewHref
      return
    }

    if (isAuthLoading) return

    if (!user) {
      const nextTarget = `${window.location.pathname}${window.location.search}${window.location.hash}`
      window.location.href = `/login?next=${encodeURIComponent(nextTarget || '/')}`
      return
    }

    showCommentNotice('Only verified owners can leave a comment.')
  }, [isAuthLoading, productSlug, reviewCount, reviewHref, showCommentNotice, user])

  const toggleVideoPlayback = useCallback(() => {
    const videoEl = videoRef.current
    if (!videoEl) return

    revealPlaybackButton(videoEl.paused ? 900 : 0)

    if (videoEl.paused) {
      void videoEl.play().catch(() => {})
      return
    }

    videoEl.pause()
  }, [revealPlaybackButton])

  return (
    <>
      <section
        data-story-slide='true'
        className='relative flex h-[100dvh] w-full snap-start items-center justify-center overflow-hidden bg-black'
      >
        <div
          className='relative h-full w-full overflow-hidden bg-black md:w-auto md:max-w-full md:overflow-visible'
          style={mediaFrameStyle}
        >
          {shouldAttachVideo ? (
            <video
              ref={videoRef}
              src={story.media_url}
              className='h-full w-full cursor-pointer object-cover'
              playsInline
              loop
              controls={false}
              preload={isActive ? 'metadata' : 'none'}
              poster={posterUrl || undefined}
              onLoadedMetadata={(event) => {
                const videoEl = event.currentTarget
                const nextAspectRatio =
                  videoEl.videoWidth > 0 && videoEl.videoHeight > 0
                    ? videoEl.videoWidth / videoEl.videoHeight
                    : 9 / 16
                setMediaAspectRatio(nextAspectRatio)
              }}
              onLoadStart={() => setIsVideoBuffering(true)}
              onWaiting={() => setIsVideoBuffering(true)}
              onStalled={() => setIsVideoBuffering(true)}
              onSeeking={() => setIsVideoBuffering(true)}
              onCanPlay={() => setIsVideoBuffering(false)}
              onCanPlayThrough={() => setIsVideoBuffering(false)}
              onClick={toggleVideoPlayback}
              onPlay={() => {
                setIsVideoPlaying(true)
                setIsVideoBuffering(false)
                revealPlaybackButton(900)
              }}
              onPlaying={() => setIsVideoBuffering(false)}
              onPause={() => {
                setIsVideoPlaying(false)
                setIsVideoBuffering(false)
                setShowPlaybackButton(true)
              }}
              onSeeked={() => setIsVideoBuffering(false)}
              onEnded={() => setIsVideoBuffering(false)}
            />
          ) : posterUrl ? (
            <Image
              src={posterUrl}
              alt={productName || story.title}
              fill
              sizes='100vw'
              className='object-cover'
              priority={false}
            />
          ) : (
            <div className='h-full w-full bg-black' />
          )}

          <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/25' />

          <div
            className='absolute inset-0'
            onMouseMove={() => {
              if (!isVideoPlaying) return
              revealPlaybackButton(900)
            }}
            onTouchStart={() => {
              if (!isVideoPlaying) return
              revealPlaybackButton(900)
            }}
          />

          <button
            type='button'
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              toggleVideoPlayback()
            }}
            className={`absolute left-1/2 top-1/2 z-20 inline-flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center transition duration-300 ${
              (showPlaybackButton || !isVideoPlaying) && !isVideoBuffering
                ? 'opacity-100'
                : 'pointer-events-none opacity-0'
            }`}
            aria-label={isVideoPlaying ? 'Pause story video' : 'Play story video'}
            title={isVideoPlaying ? 'Pause' : 'Play'}
          >
            {isVideoPlaying ? (
              <svg viewBox='0 0 24 24' fill='none' aria-hidden='true' className='h-16 w-16'>
                <path
                  d='M8 9.5C8 9.03406 8 8.80109 8.07612 8.61732C8.17761 8.37229 8.37229 8.17761 8.61732 8.07612C8.80109 8 9.03406 8 9.5 8C9.96594 8 10.1989 8 10.3827 8.07612C10.6277 8.17761 10.8224 8.37229 10.9239 8.61732C11 8.80109 11 9.03406 11 9.5V14.5C11 14.9659 11 15.1989 10.9239 15.3827C10.8224 15.6277 10.6277 15.8224 10.3827 15.9239C10.1989 16 9.96594 16 9.5 16C9.03406 16 8.80109 16 8.61732 15.9239C8.37229 15.8224 8.17761 15.6277 8.07612 15.3827C8 15.1989 8 14.9659 8 14.5V9.5Z'
                  stroke='#ffffff'
                  strokeWidth='1.5'
                />
                <path
                  d='M13 9.5C13 9.03406 13 8.80109 13.0761 8.61732C13.1776 8.37229 13.3723 8.17761 13.6173 8.07612C13.8011 8 14.0341 8 14.5 8C14.9659 8 15.1989 8 15.3827 8.07612C15.6277 8.17761 15.8224 8.37229 15.9239 8.61732C16 8.80109 16 9.03406 16 9.5V14.5C16 14.9659 16 15.1989 15.9239 15.3827C15.8224 15.6277 15.6277 15.8224 15.3827 15.9239C15.1989 16 14.9659 16 14.5 16C14.0341 16 13.8011 16 13.6173 15.9239C13.3723 15.8224 13.1776 15.6277 13.0761 15.3827C13 15.1989 13 14.9659 13 14.5V9.5Z'
                  stroke='#ffffff'
                  strokeWidth='1.5'
                />
                <path
                  d='M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7'
                  stroke='#ffffff'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                />
              </svg>
            ) : (
              <svg viewBox='0 0 24 24' fill='none' aria-hidden='true' className='h-16 w-16'>
                <path
                  d='M13.8876 9.9348C14.9625 10.8117 15.5 11.2501 15.5 12C15.5 12.7499 14.9625 13.1883 13.8876 14.0652C13.5909 14.3073 13.2966 14.5352 13.0261 14.7251C12.7888 14.8917 12.5201 15.064 12.2419 15.2332C11.1695 15.8853 10.6333 16.2114 10.1524 15.8504C9.6715 15.4894 9.62779 14.7336 9.54038 13.2222C9.51566 12.7947 9.5 12.3757 9.5 12C9.5 11.6243 9.51566 11.2053 9.54038 10.7778C9.62779 9.26636 9.6715 8.51061 10.1524 8.1496C10.6333 7.78859 11.1695 8.11466 12.2419 8.76679C12.5201 8.93597 12.7888 9.10831 13.0261 9.27492C13.2966 9.46483 13.5909 9.69274 13.8876 9.9348Z'
                  stroke='#ffffff'
                  strokeWidth='1.5'
                />
                <path
                  d='M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7'
                  stroke='#ffffff'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                />
              </svg>
            )}
          </button>

          {isVideoBuffering ? (
            <div className='pointer-events-none absolute left-1/2 top-1/2 z-20 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-sm'>
              <span
                className='h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white'
                aria-hidden='true'
              />
            </div>
          ) : null}

          {commentNotice ? (
            <div className='pointer-events-none absolute left-1/2 top-1/2 z-30 w-[min(82vw,320px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-black/72 px-4 py-3 text-center text-sm font-medium text-white shadow-2xl backdrop-blur-md'>
              {commentNotice}
            </div>
          ) : null}

          <div className='absolute left-4 top-5 max-w-[65%]'>
            <p
              className='truncate text-sm font-semibold uppercase tracking-[0.18em] text-white/90'
              title={storeName || 'Store'}
            >
              {storeName || 'Store'}
            </p>
          </div>

          <button
            type='button'
            onClick={handlePrimaryAddAction}
            disabled={!story?.product_id || !productSlug || isProductLoading}
            className='absolute right-4 top-16 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50'
            aria-label={story?.has_variants ? 'Open product options' : 'Add product to cart'}
            title={story?.has_variants ? 'Choose options' : 'Add to cart'}
          >
            <StoreCartIcon className='h-6 w-6' />
          </button>

          <div className='absolute right-4 top-1/2 flex -translate-y-1/2 flex-col items-center gap-4'>
            <button
              type='button'
              onClick={handleWishlist}
              disabled={!story?.product_id || !productSlug}
              className='inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55 disabled:cursor-not-allowed disabled:opacity-50'
              aria-label={isSaved ? 'Saved to wishlist' : 'Add to wishlist'}
              title={isSaved ? 'Saved' : 'Wishlist'}
            >
              <Heart size={18} className={isSaved ? 'fill-current text-red-500' : ''} />
            </button>

            <button
              type='button'
              onClick={handleCommentAction}
              disabled={isAuthLoading || (!productSlug && reviewCount <= 0)}
              className='inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55 disabled:cursor-not-allowed disabled:opacity-50'
              aria-label={reviewCount > 0 ? 'Open product reviews' : 'Leave a comment'}
              title={reviewCount > 0 ? 'Open reviews' : 'Comments for verified owners'}
            >
              <MessageCircle size={18} />
            </button>

            <button
              type='button'
              onClick={() => setShareOpen(true)}
              disabled={!productSlug}
              className='inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55 disabled:cursor-not-allowed disabled:opacity-50'
              aria-label='Share product'
              title='Share'
            >
              <Share2 size={18} />
            </button>
          </div>

          <button
            type='button'
            onClick={handleProductClick}
            disabled={!productHref}
            className='absolute bottom-4 left-4 right-4 rounded-[26px] border border-white/10 bg-black/45 p-3 text-left backdrop-blur-md transition hover:bg-black/55 disabled:cursor-not-allowed disabled:opacity-80'
          >
            <div className='flex items-center gap-3'>
              <div className='relative h-14 w-14 flex-none overflow-hidden rounded-full border border-white/20 bg-white/10'>
                {posterUrl ? (
                  <Image
                    src={posterUrl}
                    alt={productName || story.title}
                    fill
                    sizes='56px'
                    className='object-cover'
                  />
                ) : (
                  <div className='flex h-full w-full items-center justify-center text-xs font-semibold text-white/80'>
                    {productName.slice(0, 1).toUpperCase() || '?'}
                  </div>
                )}
              </div>

              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-semibold text-white' title={productName || story.title}>
                  {productName || story.title}
                </p>
                <div className='mt-1 flex items-center gap-2'>
                  {displayPrice > 0 ? (
                    <span className='text-sm font-semibold text-white'>
                      {formatMoney(displayPrice)}
                    </span>
                  ) : null}
                  {originalPrice > 0 ? (
                    <span className='text-xs text-white/60 line-through'>
                      {formatMoney(originalPrice)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </button>

          <div className='absolute left-full top-1/2 z-20 ml-3 hidden -translate-y-1/2 md:flex md:flex-col md:items-center md:gap-4'>
            <button
              type='button'
              onClick={onPrevious}
              disabled={!canGoPrevious}
              className='inline-flex h-16 w-16 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-35'
              aria-label='Previous story video'
              title='Previous'
            >
              <ChevronUp size={28} strokeWidth={2.4} />
            </button>

            <button
              type='button'
              onClick={onNext}
              disabled={!canGoNext}
              className='inline-flex h-16 w-16 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-35'
              aria-label='Next story video'
              title='Next'
            >
              <ChevronDown size={28} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </section>

      <ShareProductModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        shareUrl={shareUrl}
        productName={productName || story?.title || 'Product'}
        overlayZIndexClass={STORY_PLAYER_SHARE_Z_INDEX}
      />

      <ProductVariantQuickAddModal
        open={productPickerOpen}
        product={storyProduct}
        onClose={() => setProductPickerOpen(false)}
        overlayZIndexClass={STORY_PLAYER_QUICK_ADD_Z_INDEX}
        lightboxZIndexClass={STORY_PLAYER_QUICK_ADD_LIGHTBOX_Z_INDEX}
        onConfirm={(payload) => {
          if (!storyProduct) return
          const quantity = Math.max(1, Number(payload?.quantity) || 1)
          cart?.addItem?.(
            {
              ...storyProduct,
              ...payload,
              image: payload?.image || storyProduct.image || '',
              price: Number(payload?.price ?? storyProduct.price) || 0,
              originalPrice:
                payload?.originalPrice !== undefined ? payload.originalPrice : storyProduct.originalPrice,
            },
            quantity,
          )
          setProductPickerOpen(false)
        }}
      />
    </>
  )
}

export default StoryVideoFeedSlide
