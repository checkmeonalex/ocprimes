'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Heart, MessageCircle, Share2, Volume2, VolumeX } from 'lucide-react'
import Link from 'next/link'
import ShareProductModal from '@/components/product/ShareProductModal'
import { useOptionalCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
import { buildVendorHref } from '@/lib/catalog/vendor'
import { useAuthUser } from '@/lib/auth/useAuthUser.ts'
import StoreCartIcon from '@/components/icons/StoreCartIcon'
import { useUserI18n } from '@/lib/i18n/useUserI18n'

const getSellerInitials = (value = '') => {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'ST'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

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

const ExpandIcon = ({ className = '' }) => (
  <svg viewBox='0 0 24 24' fill='none' aria-hidden='true' className={className}>
    <path
      d='M21 14V16.2C21 17.8802 21 18.7202 20.673 19.362C20.3854 19.9265 19.9265 20.3854 19.362 20.673C18.7202 21 17.8802 21 16.2 21H14M10 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V10M15 9L21 3M21 3H15M21 3V9M9 15L3 21M3 21H9M3 21L3 15'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

const MinimizeIcon = ({ className = '' }) => (
  <svg viewBox='0 0 24 24' fill='none' aria-hidden='true' className={className}>
    <path
      d='M11.9425 1.25H12.0573C14.3657 1.24999 16.1747 1.24998 17.5862 1.43975C19.0309 1.63399 20.171 2.03933 21.0658 2.93414C21.9606 3.82895 22.3659 4.96897 22.5602 6.41371C22.7499 7.82519 22.7499 9.63423 22.7499 11.9426V12.0574C22.7499 14.3658 22.7499 16.1748 22.5602 17.5863C22.3659 19.031 21.9606 20.1711 21.0658 21.0659C20.2374 21.8943 19.198 22.3038 17.8993 22.514C16.6225 22.7207 15.0164 22.7458 13.0013 22.7494C12.5871 22.7502 12.2507 22.415 12.2499 22.0008C12.2492 21.5866 12.5843 21.2502 12.9986 21.2494C15.0385 21.2457 16.5216 21.2175 17.6596 21.0333C18.7756 20.8526 19.4765 20.5338 20.0051 20.0052C20.5748 19.4355 20.9017 18.6648 21.0735 17.3864C21.2483 16.0864 21.2499 14.3782 21.2499 12C21.2499 9.62178 21.2483 7.91356 21.0735 6.61358C20.9017 5.33517 20.5748 4.56445 20.0051 3.9948C19.4355 3.42514 18.6647 3.09825 17.3863 2.92637C16.0864 2.75159 14.3781 2.75 11.9999 2.75C9.62169 2.75 7.91347 2.75159 6.61349 2.92637C5.33509 3.09825 4.56437 3.42514 3.99471 3.9948C3.46609 4.52341 3.1473 5.22427 2.96665 6.34031C2.78246 7.47827 2.75416 8.96143 2.75049 11.0014C2.74974 11.4156 2.41335 11.7507 1.99914 11.75C1.58493 11.7493 1.24975 11.4129 1.25049 10.9986C1.25412 8.9835 1.27926 7.37741 1.48592 6.10063C1.69614 4.80193 2.10563 3.76255 2.93405 2.93414C3.82886 2.03933 4.96888 1.63399 6.41362 1.43975C7.82511 1.24998 9.63414 1.24999 11.9425 1.25Z'
      fill='currentColor'
    />
    <path
      d='M16.5 12C16.5 12.4142 16.1642 12.75 15.75 12.75H12C11.5858 12.75 11.25 12.4142 11.25 12V8.25C11.25 7.83579 11.5858 7.5 12 7.5C12.4142 7.5 12.75 7.83579 12.75 8.25V10.1893L16.4697 6.46967C16.7626 6.17678 17.2374 6.17678 17.5303 6.46967C17.8232 6.76256 17.8232 7.23744 17.5303 7.53033L13.8107 11.25H15.75C16.1642 11.25 16.5 11.5858 16.5 12Z'
      fill='currentColor'
    />
    <path
      d='M5.948 13.25C5.04952 13.25 4.3003 13.2499 3.70552 13.3299C3.07773 13.4143 2.51093 13.6 2.05546 14.0555C1.59999 14.5109 1.41432 15.0777 1.32991 15.7055C1.24995 16.3003 1.24997 17.0495 1.25 17.948V18.052C1.24997 18.9505 1.24995 19.6997 1.32991 20.2945C1.41432 20.9223 1.59999 21.4891 2.05546 21.9445C2.51093 22.4 3.07773 22.5857 3.70552 22.6701C4.3003 22.7501 5.04951 22.75 5.94798 22.75H6.052C6.95047 22.75 7.69971 22.7501 8.29448 22.6701C8.92228 22.5857 9.48908 22.4 9.94455 21.9445C10.4 21.4891 10.5857 20.9223 10.6701 20.2945C10.7501 19.6997 10.75 18.9505 10.75 18.052V17.948C10.75 17.0495 10.7501 16.3003 10.6701 15.7055C10.5857 15.0777 10.4 14.5109 9.94455 14.0555C9.48908 13.6 8.92228 13.4143 8.29448 13.3299C7.6997 13.2499 6.95048 13.25 6.052 13.25H5.948ZM3.11612 15.1161C3.24644 14.9858 3.44393 14.8786 3.9054 14.8165C4.38843 14.7516 5.03599 14.75 6 14.75C6.96401 14.75 7.61157 14.7516 8.09461 14.8165C8.55607 14.8786 8.75357 14.9858 8.88389 15.1161C9.0142 15.2464 9.12143 15.4439 9.18347 15.9054C9.24841 16.3884 9.25 17.036 9.25 18C9.25 18.964 9.24841 19.6116 9.18347 20.0946C9.12143 20.5561 9.0142 20.7536 8.88389 20.8839C8.75357 21.0142 8.55607 21.1214 8.09461 21.1835C7.61157 21.2484 6.96401 21.25 6 21.25C5.03599 21.25 4.38843 21.2484 3.9054 21.1835C3.44393 21.1214 3.24644 21.0142 3.11612 20.8839C2.9858 20.7536 2.87858 20.5561 2.81654 20.0946C2.7516 19.6116 2.75 18.964 2.75 18C2.75 17.036 2.7516 16.3884 2.81654 15.9054C2.87858 15.4439 2.9858 15.2464 3.11612 15.1161Z'
      fill='currentColor'
    />
  </svg>
)

export default function PlayVideoCard({
  item,
  isActive,
  isChromeCollapsed = false,
  isMuted = false,
  onToggleCategoryStrip,
  onToggleMute,
}) {
  const cart = useOptionalCart()
  const { openSaveModal, isWishlisted, isRecentlySaved } = useWishlist()
  const { user, isLoading: isAuthLoading } = useAuthUser()
  const { formatMoney } = useUserI18n()
  const articleRef = useRef(null)
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [showPlaybackButton, setShowPlaybackButton] = useState(true)
  const [sellerLogoFailed, setSellerLogoFailed] = useState(false)
  const [mediaAspectRatio, setMediaAspectRatio] = useState(9 / 16)
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 })
  const [shareOpen, setShareOpen] = useState(false)
  const [commentNotice, setCommentNotice] = useState('')
  const playbackTimerRef = useRef(null)
  const commentNoticeTimerRef = useRef(null)
  const resumeAfterVisibilityRef = useRef(false)

  const vendorHref = useMemo(
    () => buildVendorHref(item?.seller_name || 'Store', item?.seller_slug),
    [item?.seller_name, item?.seller_slug],
  )
  const productHref = useMemo(() => buildProductHref(item?.slug), [item?.slug])
  const shareUrl = useMemo(() => resolveShareUrl(item?.slug), [item?.slug])
  const displayPrice = useMemo(() => {
    const basePrice = Number(item?.price) || 0
    const discountPrice = Number(item?.discount_price) || 0
    return discountPrice > 0 && discountPrice < basePrice ? discountPrice : basePrice
  }, [item?.discount_price, item?.price])
  const originalPrice = useMemo(() => {
    const basePrice = Number(item?.price) || 0
    const discountPrice = Number(item?.discount_price) || 0
    return discountPrice > 0 && discountPrice < basePrice ? basePrice : 0
  }, [item?.discount_price, item?.price])
  const isSaved = isWishlisted(item?.id) || isRecentlySaved(item?.id)
  const reviewCount = Math.max(0, Number(item?.reviews) || 0)
  const reviewHref = productHref ? `${productHref}#reviews-section` : ''
  const variationCount = Math.max(0, Number(item?.variation_count) || 0)
  const frameStyle = useMemo(() => {
    const nextWidth = Number(frameSize.width) || 0
    const nextHeight = Number(frameSize.height) || 0
    if (!nextWidth || !nextHeight) return { maxWidth: '100%' }
    return {
      width: `${nextWidth}px`,
      height: `${nextHeight}px`,
      maxWidth: '100%',
    }
  }, [frameSize.height, frameSize.width])
  const mediaBoundsStyle = useMemo(() => {
    const containerWidth = Number(frameSize.width) || 0
    const containerHeight = Number(frameSize.height) || 0
    const ratio = mediaAspectRatio > 0 ? mediaAspectRatio : 9 / 16

    if (!containerWidth || !containerHeight) {
      return { inset: '0px' }
    }

    let renderedWidth = containerWidth
    let renderedHeight = renderedWidth / ratio

    if (renderedHeight > containerHeight) {
      renderedHeight = containerHeight
      renderedWidth = renderedHeight * ratio
    }

    const offsetX = Math.max(0, (containerWidth - renderedWidth) / 2)
    const offsetY = Math.max(0, (containerHeight - renderedHeight) / 2)

    return {
      left: `${offsetX}px`,
      top: `${offsetY}px`,
      width: `${renderedWidth}px`,
      height: `${renderedHeight}px`,
    }
  }, [frameSize.height, frameSize.width, mediaAspectRatio])

  useEffect(
    () => () => {
      if (playbackTimerRef.current) {
        window.clearTimeout(playbackTimerRef.current)
      }
      if (commentNoticeTimerRef.current) {
        window.clearTimeout(commentNoticeTimerRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    const videoEl = videoRef.current
    if (!videoEl) return
    videoEl.muted = Boolean(isMuted)
  }, [isMuted])

  const revealPlaybackButton = useCallback((hideAfterMs = 0) => {
    if (playbackTimerRef.current) {
      window.clearTimeout(playbackTimerRef.current)
    }
    setShowPlaybackButton(true)
    if (hideAfterMs > 0) {
      playbackTimerRef.current = window.setTimeout(() => {
        setShowPlaybackButton(false)
      }, hideAfterMs)
    }
  }, [])

  useEffect(() => {
    const videoEl = videoRef.current
    if (!videoEl) return

    if (!isActive) {
      resumeAfterVisibilityRef.current = false
      videoEl.pause()
      setIsPlaying(false)
      setIsBuffering(false)
      setShowPlaybackButton(true)
      return
    }

    setIsBuffering(true)
    const playTimer = window.setTimeout(() => {
      void videoEl.play().catch(() => {
        setIsBuffering(false)
      })
    }, 60)

    return () => {
      window.clearTimeout(playTimer)
    }
  }, [isActive])

  useEffect(() => {
    const handleVisibilityChange = () => {
      const videoEl = videoRef.current
      if (!videoEl) return

      if (document.hidden) {
        if (!videoEl.paused) {
          resumeAfterVisibilityRef.current = true
          videoEl.pause()
        }
        return
      }

      if (!isActive || !resumeAfterVisibilityRef.current) return
      resumeAfterVisibilityRef.current = false
      void videoEl.play().catch(() => {})
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isActive])

  useEffect(() => {
    const updateFrameSize = () => {
      const articleEl = articleRef.current
      const parentEl = articleEl?.parentElement || null
      const parentWidth =
        parentEl?.clientWidth ||
        articleEl?.closest?.('[data-play-feed-column]')?.clientWidth ||
        window.innerWidth
      const parentHeight = parentEl?.clientHeight || 0

      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const widthBreakpoint = viewportWidth >= 1024 ? 'desktop' : viewportWidth >= 768 ? 'tablet' : 'mobile'
      const verticalReserve =
        widthBreakpoint === 'desktop'
          ? isChromeCollapsed
            ? 72
            : 120
          : widthBreakpoint === 'tablet'
            ? isChromeCollapsed
              ? 120
              : 190
            : isChromeCollapsed
              ? 132
              : 185
      const preferredMinWidth =
        widthBreakpoint === 'desktop' ? 430 : widthBreakpoint === 'tablet' ? 340 : 300
      const maxAvailableHeight = Math.max(360, viewportHeight - verticalReserve)
      const maxAvailableWidth = Math.max(280, Number(parentWidth) || viewportWidth)
      const ratio = mediaAspectRatio > 0 ? mediaAspectRatio : 9 / 16

      if (widthBreakpoint === 'mobile') {
        setFrameSize({
          width: Math.round(maxAvailableWidth),
          height: Math.round(Math.max(360, parentHeight || maxAvailableHeight)),
        })
        return
      }

      let nextWidth = maxAvailableWidth
      let nextHeight = nextWidth / ratio

      if (nextHeight > maxAvailableHeight) {
        nextHeight = maxAvailableHeight
        nextWidth = nextHeight * ratio
      }

      if (nextWidth < preferredMinWidth && preferredMinWidth <= maxAvailableWidth) {
        nextWidth = preferredMinWidth
        nextHeight = nextWidth / ratio
      }

      if (nextHeight > maxAvailableHeight) {
        nextHeight = maxAvailableHeight
        nextWidth = nextHeight * ratio
      }

      setFrameSize({
        width: Math.round(nextWidth),
        height: Math.round(nextHeight),
      })
    }

    updateFrameSize()

    const articleEl = articleRef.current
    const parentEl = articleEl?.parentElement || null
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' && parentEl
        ? new ResizeObserver(() => updateFrameSize())
        : null

    if (resizeObserver && parentEl) {
      resizeObserver.observe(parentEl)
    }

    window.addEventListener('resize', updateFrameSize)
    return () => {
      window.removeEventListener('resize', updateFrameSize)
      resizeObserver?.disconnect()
    }
  }, [isChromeCollapsed, mediaAspectRatio])

  const togglePlayback = useCallback(() => {
    const videoEl = videoRef.current
    if (!videoEl) return

    revealPlaybackButton(videoEl.paused ? 900 : 0)
    if (videoEl.paused) {
      void videoEl.play().catch(() => {})
      return
    }
    videoEl.pause()
  }, [revealPlaybackButton])

  const toggleMute = useCallback(() => {
    const videoEl = videoRef.current
    if (!videoEl) return
    onToggleMute?.()
  }, [onToggleMute])

  const handleWishlist = useCallback(() => {
    if (!item?.id || !item?.product_name || !item?.slug) return
    openSaveModal({
      id: item.id,
      name: item.product_name,
      slug: item.slug,
      price: displayPrice,
      image: item.poster_url || '',
    })
  }, [displayPrice, item, openSaveModal])

  const handleAddToCart = useCallback(() => {
    if (!item?.id || !item?.product_name || !item?.slug) return
    cart?.addItem?.({
      id: item.id,
      slug: item.slug,
      name: item.product_name,
      price: displayPrice,
      originalPrice: null,
      image: item.poster_url || '',
      vendor: item?.seller_name || '',
    })
  }, [cart, displayPrice, item])

  const showCommentNotice = useCallback((message) => {
    setCommentNotice(message)
    if (commentNoticeTimerRef.current) {
      window.clearTimeout(commentNoticeTimerRef.current)
    }
    commentNoticeTimerRef.current = window.setTimeout(() => {
      setCommentNotice('')
    }, 2600)
  }, [])

  const openInNextTab = useCallback((href) => {
    const nextHref = String(href || '').trim()
    if (!nextHref || typeof window === 'undefined') return
    window.open(nextHref, '_blank', 'noopener,noreferrer')
  }, [])

  const handleReviewAction = useCallback(() => {
    if (reviewCount > 0 && reviewHref) {
      openInNextTab(reviewHref)
      return
    }

    if (isAuthLoading) return

    if (!user && typeof window !== 'undefined') {
      const nextTarget = `${window.location.pathname}${window.location.search}${window.location.hash}`
      window.location.href = `/login?next=${encodeURIComponent(nextTarget || '/')}`
      return
    }

    showCommentNotice('Only verified owners can leave a comment.')
  }, [isAuthLoading, openInNextTab, reviewCount, reviewHref, showCommentNotice, user])

  const actionItems = useMemo(
    () => [
      {
        key: 'wishlist',
        label: 'Wishlist',
        icon: Heart,
        active: isSaved,
        onClick: handleWishlist,
      },
      {
        key: 'reviews',
        label: 'Reviews',
        icon: MessageCircle,
        onClick: handleReviewAction,
      },
      {
        key: 'cart',
        label: 'Cart',
        onClick: handleAddToCart,
      },
      {
        key: 'share',
        label: 'Share',
        icon: Share2,
        onClick: () => setShareOpen(true),
      },
    ],
    [handleAddToCart, handleReviewAction, handleWishlist, isSaved],
  )

  return (
    <>
      <div ref={articleRef} className='relative mx-auto w-full overflow-visible' style={frameStyle}>
        <article className='relative h-full w-full min-h-[360px] overflow-hidden bg-black md:min-h-[420px] md:shadow-[0_22px_50px_rgba(15,23,42,0.16)]'>
          <div className='absolute inset-0'>
            <video
              ref={videoRef}
              src={item.video_url}
              poster={item.poster_url || undefined}
              muted={isMuted}
              playsInline
              loop
              preload={isActive ? 'metadata' : 'none'}
              className='h-full w-full cursor-pointer object-contain'
              onLoadedMetadata={(event) => {
                const videoEl = event.currentTarget
                if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
                  setMediaAspectRatio(videoEl.videoWidth / videoEl.videoHeight)
                }
              }}
              onClick={togglePlayback}
              onLoadStart={() => setIsBuffering(true)}
              onWaiting={() => setIsBuffering(true)}
              onStalled={() => setIsBuffering(true)}
              onSeeking={() => setIsBuffering(true)}
              onPlaying={() => {
                setIsPlaying(true)
                setIsBuffering(false)
                revealPlaybackButton(900)
              }}
              onPlay={() => {
                setIsPlaying(true)
                setIsBuffering(false)
              }}
              onPause={() => {
                setIsPlaying(false)
                setIsBuffering(false)
                setShowPlaybackButton(true)
              }}
              onCanPlay={() => setIsBuffering(false)}
              onCanPlayThrough={() => setIsBuffering(false)}
              onSeeked={() => setIsBuffering(false)}
              onEnded={() => setIsBuffering(false)}
            />
          </div>

          <div
            className='pointer-events-none absolute z-[9] bg-[linear-gradient(180deg,rgba(7,10,18,0.42)_0%,rgba(7,10,18,0.06)_24%,rgba(7,10,18,0.08)_58%,rgba(7,10,18,0.68)_100%)]'
            style={mediaBoundsStyle}
          />

          <div className='pointer-events-none absolute z-10' style={mediaBoundsStyle}>
            <div className='absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 md:p-5'>
              <div className='min-w-0 flex items-center gap-2 md:gap-3'>
                <Link
                  href={vendorHref}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='pointer-events-auto flex min-w-0 items-center gap-2 md:gap-3'
                >
                  <div className='relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/25 bg-[#111827] text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)] md:h-12 md:w-12'>
                    {item?.seller_logo_url && !sellerLogoFailed ? (
                      <img
                        src={item.seller_logo_url}
                        alt={item.seller_name}
                        className='h-full w-full object-cover'
                        onError={() => setSellerLogoFailed(true)}
                      />
                    ) : (
                      <div className='flex h-full w-full items-center justify-center text-xs font-semibold md:text-sm'>
                        {getSellerInitials(item?.seller_name)}
                      </div>
                    )}
                  </div>

                  <div className='min-w-0'>
                    <span className='block truncate text-sm font-semibold text-white hover:underline'>
                      {item?.seller_name || 'Store'}
                    </span>
                  </div>
                </Link>
              </div>

              <button
                type='button'
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onToggleCategoryStrip?.()
                }}
                className='pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/32 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/44 md:h-10 md:w-10'
                aria-label={isChromeCollapsed ? 'Minimize categories' : 'Expand categories'}
                title={isChromeCollapsed ? 'Minimize categories' : 'Expand categories'}
              >
                {isChromeCollapsed ? (
                  <MinimizeIcon className='h-4 w-4 md:h-[18px] md:w-[18px]' />
                ) : (
                  <ExpandIcon className='h-4 w-4 md:h-[18px] md:w-[18px]' />
                )}
              </button>
            </div>

            <div className='absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/38 to-transparent md:h-28 md:from-black/28' />

            <div className='absolute inset-x-0 bottom-16 p-3 md:bottom-0 md:p-5'>
              <div className='min-w-0 max-w-[78%] md:max-w-[80%] lg:max-w-[78%]'>
                {productHref ? (
                  <Link
                    href={productHref}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='block w-full truncate text-base font-semibold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] hover:underline'
                  >
                    {item?.product_name}
                  </Link>
                ) : (
                  <p className='block w-full truncate text-base font-semibold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]'>
                    {item?.product_name}
                  </p>
                )}
                <div className='mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-white/95 drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]'>
                  {displayPrice > 0 ? (
                    <span>{formatMoney(displayPrice)}</span>
                  ) : null}
                  {originalPrice > 0 ? (
                    <span className='text-white/70 line-through'>{formatMoney(originalPrice)}</span>
                  ) : null}
                  {variationCount > 0 ? (
                    <span className='text-white/80'>
                      {variationCount} {variationCount === 1 ? 'option' : 'options'}
                    </span>
                  ) : null}
                </div>
                <p className='mt-1 line-clamp-2 text-sm leading-6 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]'>
                  {item?.short_description || item?.product_name}
                </p>
              </div>
            </div>

            <button
              type='button'
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                toggleMute()
              }}
              className='pointer-events-auto absolute bottom-8 right-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/32 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/44 md:bottom-5 md:right-5'
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>

          <div className='pointer-events-none absolute inset-0 z-10'>
            {commentNotice ? (
              <div className='pointer-events-none absolute left-1/2 top-1/2 z-20 w-[min(82vw,320px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-black/72 px-4 py-3 text-center text-sm font-medium text-white shadow-2xl backdrop-blur-md'>
                {commentNotice}
              </div>
            ) : null}

            <button
              type='button'
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                togglePlayback()
              }}
              className={`pointer-events-auto absolute left-1/2 top-1/2 z-10 inline-flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition duration-300 ${
                (showPlaybackButton || !isPlaying) && !isBuffering
                  ? 'opacity-100'
                  : 'pointer-events-none opacity-0'
              }`}
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              {isPlaying ? (
                <svg viewBox='0 0 24 24' fill='none' aria-hidden='true' className='h-14 w-14'>
                  <path d='M8 9.5C8 8.67157 8.67157 8 9.5 8C10.3284 8 11 8.67157 11 9.5V14.5C11 15.3284 10.3284 16 9.5 16C8.67157 16 8 15.3284 8 14.5V9.5Z' stroke='currentColor' strokeWidth='1.5' />
                  <path d='M13 9.5C13 8.67157 13.6716 8 14.5 8C15.3284 8 16 8.67157 16 9.5V14.5C16 15.3284 15.3284 16 14.5 16C13.6716 16 13 15.3284 13 14.5V9.5Z' stroke='currentColor' strokeWidth='1.5' />
                  <path d='M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
                </svg>
              ) : (
                <svg viewBox='0 0 24 24' fill='none' aria-hidden='true' className='h-14 w-14'>
                  <path d='M13.8876 9.9348C14.9625 10.8117 15.5 11.2501 15.5 12C15.5 12.7499 14.9625 13.1883 13.8876 14.0652C13.5909 14.3073 13.2966 14.5352 13.0261 14.7251C12.7888 14.8917 12.5201 15.064 12.2419 15.2332C11.1695 15.8853 10.6333 16.2114 10.1524 15.8504C9.6715 15.4894 9.62779 14.7336 9.54038 13.2222C9.51566 12.7947 9.5 12.3757 9.5 12C9.5 11.6243 9.51566 11.2053 9.54038 10.7778C9.62779 9.26636 9.6715 8.51061 10.1524 8.1496C10.6333 7.78859 11.1695 8.11466 12.2419 8.76679C12.5201 8.93597 12.7888 9.10831 13.0261 9.27492C13.2966 9.46483 13.5909 9.69274 13.8876 9.9348Z' stroke='currentColor' strokeWidth='1.5' />
                  <path d='M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
                </svg>
              )}
            </button>

            {isBuffering ? (
              <div className='pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm'>
                <span className='h-9 w-9 animate-spin rounded-full border-2 border-white/35 border-t-white' aria-hidden='true' />
              </div>
            ) : null}

          </div>
        </article>

        <div className='pointer-events-none absolute left-full top-1/2 z-20 ml-3 hidden -translate-y-1/2 lg:block'>
          <div className='pointer-events-auto flex flex-col items-center gap-3'>
            {actionItems.map((action) => {
              const content = (
                <>
                  <span
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-full border transition ${
                      action.active
                        ? 'border-black/10 bg-black text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]'
                        : 'border-slate-300 bg-white text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:bg-slate-50'
                    }`}
                  >
                      {action.key === 'cart' ? (
                        <StoreCartIcon className='h-5 w-5' />
                      ) : (
                        <action.icon size={20} strokeWidth={2.1} />
                      )}
                    </span>
                  <span className='text-[11px] font-medium text-slate-700'>
                    {action.label}
                  </span>
                </>
              )

              return (
                <button
                  key={action.key}
                  type='button'
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    action.onClick?.()
                  }}
                  className='flex flex-col items-center gap-1.5'
                >
                  {content}
                </button>
              )
            })}
          </div>
        </div>

        <div className='pointer-events-none absolute z-20 lg:hidden' style={mediaBoundsStyle}>
          <div className='absolute right-2.5 top-1/2 -translate-y-1/2'>
            <div className='pointer-events-auto flex flex-col items-center gap-2'>
              {actionItems.map((action) => {
              const content = (
                <>
                  <span
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-sm transition ${
                        action.active
                          ? 'border-white/30 bg-white text-slate-950 shadow-[0_10px_24px_rgba(0,0,0,0.18)]'
                          : 'border-white/18 bg-black/38 text-white hover:bg-black/48'
                      }`}
                    >
                      {action.key === 'cart' ? (
                        <StoreCartIcon className='h-4 w-4' />
                      ) : (
                        <action.icon size={16} strokeWidth={2.1} />
                      )}
                    </span>
                    <span className='text-[9px] font-medium text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.38)]'>
                      {action.label}
                    </span>
                  </>
                )

                return (
                  <button
                    key={action.key}
                    type='button'
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      action.onClick?.()
                    }}
                    className='flex flex-col items-center gap-1'
                  >
                    {content}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <ShareProductModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        shareUrl={shareUrl}
        productName={item?.product_name || 'Product'}
      />
    </>
  )
}
