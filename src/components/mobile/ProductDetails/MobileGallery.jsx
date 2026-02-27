'use client'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const normalizeMediaItems = (media, images = []) => {
  const seen = new Set()
  const dedupe = (items) =>
    items.filter((item) => {
      const type = String(item?.type || 'image').trim().toLowerCase()
      const url = String(item?.url || '').trim().toLowerCase()
      if (!url) return false
      const key = `${type}:${url}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  if (Array.isArray(media) && media.length) {
    return dedupe(media
      .map((item) => {
        const type = item?.type === 'video' ? 'video' : 'image'
        const url = String(item?.url || '').trim()
        const poster = String(item?.poster || '').trim()
        if (!url) return null
        return { type, url, poster }
      })
      .filter(Boolean))
  }

  return dedupe((Array.isArray(images) ? images : [])
    .map((url) => String(url || '').trim())
    .filter(Boolean)
    .map((url) => ({ type: 'image', url, poster: '' })))
}

const formatVideoTime = (seconds) => {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function MobileCustomVideoPlayer({
  src,
  poster,
  containerClassName,
  videoClassName,
  isActive = true,
  shouldAutoPlay = false,
  onAutoPlayHandled,
  onPauseToCover,
}) {
  const rootRef = useRef(null)
  const videoRef = useRef(null)
  const resumeOnActiveRef = useRef(false)
  const manualPauseRef = useRef(false)
  const hideControlsTimerRef = useRef(null)
  const autoPlayHandledRef = useRef(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isInView, setIsInView] = useState(true)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const clearHideControlsTimer = useCallback(() => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current)
      hideControlsTimerRef.current = null
    }
  }, [])

  const scheduleHideControls = useCallback(() => {
    clearHideControlsTimer()
    hideControlsTimerRef.current = setTimeout(() => {
      setControlsVisible(false)
    }, 3000)
  }, [clearHideControlsTimer])

  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true)
    if (isPlaying) {
      scheduleHideControls()
    }
  }, [isPlaying, scheduleHideControls])

  const togglePlay = useCallback((event) => {
    event?.preventDefault?.()
    event?.stopPropagation?.()
    const videoEl = videoRef.current
    if (!videoEl) return
    if (videoEl.paused) {
      videoEl.play().catch(() => {})
      return
    }
    manualPauseRef.current = true
    videoEl.pause()
  }, [])

  const toggleMute = useCallback((event) => {
    event?.preventDefault?.()
    event?.stopPropagation?.()
    const videoEl = videoRef.current
    if (!videoEl) return
    const nextMuted = !videoEl.muted
    videoEl.muted = nextMuted
    setIsMuted(nextMuted)
  }, [])

  const handleSeek = useCallback((event) => {
    event?.stopPropagation?.()
    const nextPercent = Number(event.target.value || 0)
    const videoEl = videoRef.current
    if (!videoEl || !Number.isFinite(nextPercent) || duration <= 0) return
    videoEl.currentTime = (Math.max(0, Math.min(100, nextPercent)) / 100) * duration
  }, [duration])

  useEffect(() => {
    const videoEl = videoRef.current
    if (!videoEl) return
    videoEl.muted = isMuted
  }, [isMuted])

  useEffect(() => {
    const node = rootRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        setIsInView(Boolean(entry?.isIntersecting))
      },
      { threshold: 0.45 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const videoEl = videoRef.current
    if (!videoEl) return
    if (!isActive || !isInView) {
      if (!videoEl.paused) {
        resumeOnActiveRef.current = true
      }
      videoEl.pause()
      return
    }
    if (resumeOnActiveRef.current) {
      videoEl.play().catch(() => {})
      resumeOnActiveRef.current = false
    }
  }, [isActive, isInView])

  useEffect(() => {
    if (!shouldAutoPlay) return
    const videoEl = videoRef.current
    if (!videoEl) return
    if (autoPlayHandledRef.current) return
    autoPlayHandledRef.current = true
    videoEl.play().catch(() => {})
    if (onAutoPlayHandled) onAutoPlayHandled()
  }, [onAutoPlayHandled, shouldAutoPlay])

  useEffect(() => {
    if (shouldAutoPlay) return
    autoPlayHandledRef.current = false
  }, [shouldAutoPlay])

  useEffect(() => {
    if (!isPlaying) {
      clearHideControlsTimer()
      setControlsVisible(true)
      return
    }
    scheduleHideControls()
    return clearHideControlsTimer
  }, [clearHideControlsTimer, isPlaying, scheduleHideControls])

  useEffect(() => () => {
    clearHideControlsTimer()
    const videoEl = videoRef.current
    if (videoEl) videoEl.pause()
  }, [clearHideControlsTimer])

  return (
    <div
      ref={rootRef}
      className={`relative ${containerClassName}`}
      onClick={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      onTouchEnd={(event) => {
        event.stopPropagation()
        showControlsTemporarily()
      }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        preload='metadata'
        playsInline
        controls={false}
        loop
        muted={isMuted}
        className={videoClassName}
        onLoadedMetadata={(event) => {
          const videoEl = event.currentTarget
          setDuration(Number(videoEl.duration || 0))
        }}
        onTimeUpdate={(event) => {
          const videoEl = event.currentTarget
          setCurrentTime(Number(videoEl.currentTime || 0))
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false)
          if (manualPauseRef.current) {
            manualPauseRef.current = false
            if (onPauseToCover) onPauseToCover()
          }
        }}
        onEnded={() => {
          setIsPlaying(false)
          resumeOnActiveRef.current = false
        }}
      />
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          type='button'
          onClick={togglePlay}
          className={`inline-flex items-center justify-center rounded-full ${
            controlsVisible ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
        >
          {isPlaying ? (
            <svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-16 w-16'>
              <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25ZM2.75 12C2.75 6.89137 6.89137 2.75 12 2.75C17.1086 2.75 21.25 6.89137 21.25 12C21.25 17.1086 17.1086 21.25 12 21.25C6.89137 21.25 2.75 17.1086 2.75 12Z'
                fill='#ededed'
              />
              <rect x='9' y='8.2' width='2.2' height='7.6' rx='0.8' fill='#111111' />
              <rect x='12.8' y='8.2' width='2.2' height='7.6' rx='0.8' fill='#111111' />
            </svg>
          ) : (
            <svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-20 w-20'>
              <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M11.0748 7.50835C9.74622 6.72395 8.25 7.79065 8.25 9.21316V14.7868C8.25 16.2093 9.74622 17.276 11.0748 16.4916L15.795 13.7048C17.0683 12.953 17.0683 11.047 15.795 10.2952L11.0748 7.50835ZM9.75 9.21316C9.75 9.01468 9.84615 8.87585 9.95947 8.80498C10.0691 8.73641 10.1919 8.72898 10.3122 8.80003L15.0324 11.5869C15.165 11.6652 15.25 11.8148 15.25 12C15.25 12.1852 15.165 12.3348 15.0324 12.4131L10.3122 15.2C10.1919 15.271 10.0691 15.2636 9.95947 15.195C9.84615 15.1242 9.75 14.9853 9.75 14.7868V9.21316Z'
                fill='#ededed'
              />
              <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25ZM2.75 12C2.75 6.89137 6.89137 2.75 12 2.75C17.1086 2.75 21.25 6.89137 21.25 12C21.25 17.1086 17.1086 21.25 12 21.25C6.89137 21.25 2.75 17.1086 2.75 12Z'
                fill='#ededed'
              />
            </svg>
          )}
        </button>
      </div>
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pb-2 pt-8 transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className={controlsVisible ? 'pointer-events-auto' : 'pointer-events-none'}>
          <input
            type='range'
            min='0'
            max='100'
            value={progress}
            onChange={handleSeek}
            onClick={(event) => event.stopPropagation()}
            onTouchStart={showControlsTemporarily}
            className='h-1.5 w-full cursor-pointer accent-white'
            aria-label='Seek video'
          />
          <div className='mt-1 flex items-center justify-between text-white'>
            <span className='text-[11px] font-medium tabular-nums'>
              {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
            </span>
            <button
              type='button'
              onClick={toggleMute}
              onTouchStart={showControlsTemporarily}
              className='inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15'
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            >
              {isMuted ? (
                <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2'>
                  <path d='M11 5L6 9H3v6h3l5 4V5z' />
                  <path d='M22 9l-6 6' />
                  <path d='M16 9l6 6' />
                </svg>
              ) : (
                <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2'>
                  <path d='M11 5L6 9H3v6h3l5 4V5z' />
                  <path d='M15.5 8.5a5 5 0 010 7' />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MobileGallery({
  images = [],
  media = [],
  currentImage,
  setCurrentImage,
  productName = 'Product',
  vendorNameOverlay = '',
  badgeText = null,
  badgeVariant = 'discount',
}) {
  const mediaItems = useMemo(() => normalizeMediaItems(media, images), [images, media])
  const mediaCount = mediaItems.length
  const [activeIndex, setActiveIndex] = useState(0)
  const [isDraggingMain, setIsDraggingMain] = useState(false)
  const [dragOffsetPx, setDragOffsetPx] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [playingVideoUrl, setPlayingVideoUrl] = useState('')
  const [lightboxCurrentIndex, setLightboxCurrentIndex] = useState(0)
  const lastSyncedUrlRef = useRef('')
  const mainViewportRef = useRef(null)
  const sliderTrackRef = useRef(null)
  const swipeHintTimerRef = useRef(null)
  const swipeHintAnimationRef = useRef(null)
  const hasUserInteractedRef = useRef(false)
  const suppressMainClickRef = useRef(false)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const lightboxTouchStartX = useRef(0)
  const lightboxTouchEndX = useRef(0)
  const lightboxThumbStripRef = useRef(null)

  const activeMedia = mediaItems[activeIndex] || null
  const isActiveVideoPlaying =
    String(activeMedia?.type || '') === 'video' &&
    String(playingVideoUrl || '').trim() === String(activeMedia?.url || '').trim()

  const clearSwipeHintTimer = useCallback(() => {
    if (!swipeHintTimerRef.current) return
    clearTimeout(swipeHintTimerRef.current)
    swipeHintTimerRef.current = null
  }, [])

  const clearSwipeHintAnimation = useCallback(() => {
    if (!swipeHintAnimationRef.current) return
    swipeHintAnimationRef.current.cancel?.()
    swipeHintAnimationRef.current = null
  }, [])

  const markGalleryInteracted = useCallback(() => {
    hasUserInteractedRef.current = true
    clearSwipeHintTimer()
    clearSwipeHintAnimation()
  }, [clearSwipeHintAnimation, clearSwipeHintTimer])

  const syncCurrentImageByIndex = useCallback((index) => {
    if (!setCurrentImage) return
    const safeIndex = Math.max(0, Math.min(mediaCount - 1, index))
    const nextUrl = String(mediaItems[safeIndex]?.url || '').trim()
    if (!nextUrl) return
    const currentUrl = String(currentImage || '').trim()
    if (nextUrl === currentUrl || lastSyncedUrlRef.current === nextUrl) return
    lastSyncedUrlRef.current = nextUrl
    setCurrentImage(nextUrl)
  }, [currentImage, mediaCount, mediaItems, setCurrentImage])

  const updateActiveIndex = useCallback((nextIndex) => {
    if (!mediaCount) return
    const safeIndex = Math.max(0, Math.min(mediaCount - 1, Number(nextIndex) || 0))
    setActiveIndex((prev) => (prev === safeIndex ? prev : safeIndex))
    syncCurrentImageByIndex(safeIndex)
  }, [mediaCount, syncCurrentImageByIndex])

  const handleImageSelect = (index) => {
    markGalleryInteracted()
    updateActiveIndex(index)
  }

  const startVideoPlayer = useCallback((url) => {
    const key = String(url || '').trim()
    if (!key) return
    setPlayingVideoUrl(key)
  }, [])

  const finishMainDrag = useCallback(() => {
    if (!mediaCount) return
    const viewportWidth = Number(mainViewportRef.current?.getBoundingClientRect?.().width || 0)
    const delta = touchEndX.current - touchStartX.current
    const movedEnoughForDrag = Math.abs(delta) > 8
    suppressMainClickRef.current = movedEnoughForDrag

    const threshold = viewportWidth > 0 ? viewportWidth * 0.18 : 44
    if (Math.abs(delta) >= threshold && mediaCount > 1) {
      if (delta < 0) {
        updateActiveIndex((activeIndex + 1) % mediaCount)
      } else {
        updateActiveIndex(activeIndex === 0 ? mediaCount - 1 : activeIndex - 1)
      }
    }
    setIsDraggingMain(false)
    setDragOffsetPx(0)
  }, [activeIndex, mediaCount, updateActiveIndex])

  const openLightbox = () => {
    if (suppressMainClickRef.current) {
      suppressMainClickRef.current = false
      return
    }
    markGalleryInteracted()
    setLightboxCurrentIndex(activeIndex)
    setIsLightboxOpen(true)
  }

  const goToPrevious = () => {
    if (!mediaCount) return
    setLightboxCurrentIndex((prev) => (prev === 0 ? mediaCount - 1 : prev - 1))
  }

  const goToNext = () => {
    if (!mediaCount) return
    setLightboxCurrentIndex((prev) => (prev === mediaCount - 1 ? 0 : prev + 1))
  }

  const handleLightboxSwipe = () => {
    const delta = lightboxTouchStartX.current - lightboxTouchEndX.current
    const threshold = 40
    if (Math.abs(delta) < threshold) return

    if (delta > 0) {
      goToNext()
      return
    }

    goToPrevious()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      goToPrevious()
    } else if (e.key === 'ArrowRight') {
      goToNext()
    } else if (e.key === 'Escape') {
      setIsLightboxOpen(false)
    }
  }

  useEffect(() => {
    if (!mediaCount) return
    const currentIndex = currentImage
      ? mediaItems.findIndex((item) => item.url === currentImage)
      : 0
    if (currentIndex < 0) return
    setActiveIndex((prev) => (prev === currentIndex ? prev : currentIndex))
  }, [currentImage, mediaCount, mediaItems])

  useEffect(() => {
    hasUserInteractedRef.current = false
    clearSwipeHintTimer()
    clearSwipeHintAnimation()
  }, [clearSwipeHintAnimation, clearSwipeHintTimer, mediaCount, productName])

  useEffect(() => {
    if (mediaCount <= 1) return undefined
    if (activeIndex !== 0) return undefined
    if (isLightboxOpen) return undefined
    if (hasUserInteractedRef.current) return undefined
    if (typeof window !== 'undefined') {
      const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
      if (prefersReducedMotion) return undefined
    }

    const scheduleNextHint = (delayMs) => {
      clearSwipeHintTimer()
      swipeHintTimerRef.current = setTimeout(() => {
        if (hasUserInteractedRef.current) return
        const track = sliderTrackRef.current
        if (!track || typeof track.animate !== 'function') return
        const trackWidth = Number(track.getBoundingClientRect?.().width || 0)
        const shiftPx = Math.max(30, Math.min(55, Math.round(trackWidth * 0.1)))
        clearSwipeHintAnimation()
        swipeHintAnimationRef.current = track.animate(
          [
            { transform: 'translateX(0)' },
            { transform: `translateX(-${shiftPx}px)` },
            { transform: 'translateX(0)' },
          ],
          {
            duration: 1500,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          },
        )
        swipeHintAnimationRef.current.onfinish = () => {
          swipeHintAnimationRef.current = null
          if (hasUserInteractedRef.current) return
          scheduleNextHint(2000)
        }
      }, delayMs)
    }

    clearSwipeHintTimer()
    scheduleNextHint(900)

    return () => {
      clearSwipeHintTimer()
      clearSwipeHintAnimation()
    }
  }, [activeIndex, clearSwipeHintAnimation, clearSwipeHintTimer, isLightboxOpen, mediaCount])

  useEffect(() => {
    const active = mediaItems[activeIndex]
    if (active?.type !== 'video') {
      setPlayingVideoUrl('')
    }
  }, [activeIndex, mediaItems])

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isLightboxOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = 'unset'
      }
    }
  }, [isLightboxOpen])

  useEffect(() => {
    if (!isLightboxOpen) return
    const strip = lightboxThumbStripRef.current
    if (!strip) return
    const activeThumb = strip.querySelector?.(`[data-lightbox-thumb="${lightboxCurrentIndex}"]`)
    if (!activeThumb || typeof activeThumb.scrollIntoView !== 'function') return
    activeThumb.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [lightboxCurrentIndex, isLightboxOpen])

  useEffect(() => () => {
    clearSwipeHintTimer()
    clearSwipeHintAnimation()
  }, [clearSwipeHintAnimation, clearSwipeHintTimer])

  if (!mediaCount) return null

  return (
    <>
      <div className='w-full'>
        <div className='relative w-full overflow-hidden rounded-none bg-transparent'>
          <div
            ref={mainViewportRef}
            className='w-full cursor-pointer'
            style={{ aspectRatio: '4 / 5' }}
            onClick={openLightbox}
            onTouchStart={(e) => {
              markGalleryInteracted()
              touchStartX.current = e.touches[0].clientX
              touchEndX.current = e.touches[0].clientX
              setIsDraggingMain(true)
              setDragOffsetPx(0)
            }}
            onTouchMove={(e) => {
              const nextX = e.touches[0].clientX
              touchEndX.current = nextX
              const delta = nextX - touchStartX.current
              const viewportWidth = Number(mainViewportRef.current?.getBoundingClientRect?.().width || 0)
              const maxOffset = viewportWidth > 0 ? viewportWidth * 0.92 : 280
              const clamped = Math.max(-maxOffset, Math.min(maxOffset, delta))
              setDragOffsetPx(clamped)
            }}
            onTouchEnd={finishMainDrag}
            onTouchCancel={finishMainDrag}
          >
            <div
              ref={sliderTrackRef}
              className={`flex h-full w-full ${
                isDraggingMain ? 'transition-none' : 'transition-transform duration-300 ease-out'
              }`}
              style={{
                transform: `translateX(calc(-${activeIndex * 100}% + ${dragOffsetPx}px))`,
              }}
            >
              {mediaItems.map((item, index) => (
                <div key={`${item.type}-${item.url}-${index}`} className='h-full w-full shrink-0 bg-slate-100'>
                  {item.type === 'video' ? (
                    playingVideoUrl === String(item.url || '').trim() ? (
                      <MobileCustomVideoPlayer
                        src={item.url}
                        poster={item.poster || undefined}
                        containerClassName='h-full w-full'
                        videoClassName='h-full w-full object-contain bg-black'
                        isActive={index === activeIndex}
                        shouldAutoPlay
                        onPauseToCover={() => setPlayingVideoUrl('')}
                      />
                    ) : (
                      <button
                        type='button'
                        onClick={(event) => {
                          event.stopPropagation()
                          startVideoPlayer(item.url)
                        }}
                        className='relative h-full w-full bg-slate-100'
                        aria-label='Play video'
                      >
                        <video
                          src={item.url}
                          poster={item.poster || undefined}
                          muted
                          preload='metadata'
                          className='h-full w-full object-cover opacity-90'
                        />
                        <span className='absolute inset-0 flex items-center justify-center bg-black/25'>
                          <svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-24 w-24'>
                            <path
                              fillRule='evenodd'
                              clipRule='evenodd'
                              d='M11.0748 7.50835C9.74622 6.72395 8.25 7.79065 8.25 9.21316V14.7868C8.25 16.2093 9.74622 17.276 11.0748 16.4916L15.795 13.7048C17.0683 12.953 17.0683 11.047 15.795 10.2952L11.0748 7.50835ZM9.75 9.21316C9.75 9.01468 9.84615 8.87585 9.95947 8.80498C10.0691 8.73641 10.1919 8.72898 10.3122 8.80003L15.0324 11.5869C15.165 11.6652 15.25 11.8148 15.25 12C15.25 12.1852 15.165 12.3348 15.0324 12.4131L10.3122 15.2C10.1919 15.271 10.0691 15.2636 9.95947 15.195C9.84615 15.1242 9.75 14.9853 9.75 14.7868V9.21316Z'
                              fill='#ededed'
                            />
                            <path
                              fillRule='evenodd'
                              clipRule='evenodd'
                              d='M12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25ZM2.75 12C2.75 6.89137 6.89137 2.75 12 2.75C17.1086 2.75 21.25 6.89137 21.25 12C21.25 17.1086 17.1086 21.25 12 21.25C6.89137 21.25 2.75 17.1086 2.75 12Z'
                              fill='#ededed'
                            />
                          </svg>
                        </span>
                      </button>
                    )
                  ) : (
                    <img
                      src={item.url}
                      alt={productName}
                      className='h-full w-full object-cover'
                      loading={index === activeIndex ? 'eager' : 'lazy'}
                      decoding='async'
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {badgeText && (
            <div
              className={`absolute left-4 text-xs font-semibold px-3 py-1 rounded-full ${
                vendorNameOverlay ? 'top-14' : 'top-4'
              } ${
                badgeVariant === 'new'
                  ? 'bg-yellow-300 text-yellow-900'
                  : 'bg-red-500 text-white'
              }`}
            >
              {badgeText}
            </div>
          )}
          {vendorNameOverlay && !isActiveVideoPlaying ? (
            <div className='pointer-events-none absolute left-4 top-4 z-10 max-w-[80%]'>
              <p className='truncate text-[clamp(0.95rem,5.2vw,1.35rem)] font-medium leading-none text-black/85 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)] [font-family:Georgia,serif]'>
                {vendorNameOverlay}
              </p>
            </div>
          ) : null}

          {activeMedia?.type === 'video' ? (
            <span className='absolute right-4 top-4 rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold text-white'>
              Video
            </span>
          ) : null}

          <div className='absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2'>
            {mediaItems.map((item, index) => (
              <button
                key={`${item.type}-${item.url}-${index}`}
                type='button'
                onClick={() => handleImageSelect(index)}
                className={`h-1.5 rounded-full transition-all ${
                  activeIndex === index
                    ? 'w-6 bg-blue-500'
                    : 'w-2 bg-white/70'
                }`}
                aria-label={`View media ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {isClient && isLightboxOpen
        ? createPortal(
            <div className='fixed inset-0 z-[2147483647] flex h-[100dvh] flex-col bg-black/95 pt-[env(safe-area-inset-top)]'>
              <div className='flex shrink-0 items-center justify-between px-3 py-2 text-white'>
                <div className='flex items-center gap-3'>
                  <button
                    onClick={() => setIsLightboxOpen(false)}
                    className='p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors'
                  >
                    <svg
                      className='w-6 h-6'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                  </button>
                  <span className='text-lg font-medium'>
                    {lightboxCurrentIndex + 1} of {mediaCount}
                  </span>
                </div>
              </div>

              <div className='relative min-h-0 flex-1 px-2 sm:px-4'>
                <button
                  onClick={goToPrevious}
                  className='absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/20 p-2.5 text-white transition-colors hover:bg-black/35 sm:left-4 sm:p-3'
                >
                  <svg
                    className='w-6 h-6'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M15 19l-7-7 7-7'
                    />
                  </svg>
                </button>

                <button
                  onClick={goToNext}
                  className='absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/20 p-2.5 text-white transition-colors hover:bg-black/35 sm:right-4 sm:p-3'
                >
                  <svg
                    className='w-6 h-6'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 5l7 7-7 7'
                    />
                  </svg>
                </button>

                <div
                  className='h-full w-full overflow-hidden'
                  onTouchStart={(e) => {
                    lightboxTouchStartX.current = e.touches[0].clientX
                    lightboxTouchEndX.current = e.touches[0].clientX
                  }}
                  onTouchMove={(e) => {
                    lightboxTouchEndX.current = e.touches[0].clientX
                  }}
                  onTouchEnd={handleLightboxSwipe}
                >
                  <div
                    className='flex h-full w-full transition-transform duration-300 ease-out'
                    style={{ transform: `translateX(-${lightboxCurrentIndex * 100}%)` }}
                  >
                    {mediaItems.map((item, index) => (
                      <div
                        key={`lightbox-${item.type}-${item.url}-${index}`}
                        className='flex h-full w-full shrink-0 items-center justify-center px-2 py-4 sm:px-4'
                      >
                        {item.type === 'video' ? (
                          <MobileCustomVideoPlayer
                            src={item.url}
                            poster={item.poster || undefined}
                            containerClassName='max-h-full max-w-full rounded-lg bg-black'
                            videoClassName='max-h-full max-w-full rounded-lg bg-black'
                            isActive={index === lightboxCurrentIndex}
                          />
                        ) : (
                          <img
                            src={item.url}
                            alt={`${productName} ${index + 1}`}
                            className='max-h-full max-w-full object-contain'
                            draggable={false}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className='shrink-0 border-t border-white/15 bg-black/55 px-2 py-2 pb-[calc(env(safe-area-inset-bottom)+10px)]'>
                <div
                  ref={lightboxThumbStripRef}
                  className='flex gap-2 overflow-x-auto no-scrollbar'
                >
                  {mediaItems.map((item, index) => (
                    <button
                      key={`lightbox-thumb-${item.type}-${item.url}-${index}`}
                      type='button'
                      data-lightbox-thumb={index}
                      onClick={() => setLightboxCurrentIndex(index)}
                      className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md border transition ${
                        lightboxCurrentIndex === index
                          ? 'border-white ring-2 ring-white/40'
                          : 'border-white/25'
                      }`}
                      aria-label={`View media ${index + 1}`}
                    >
                      {item.type === 'video' ? (
                        <>
                          <video
                            src={item.url}
                            poster={item.poster || undefined}
                            muted
                            preload='metadata'
                            className='h-full w-full object-cover'
                          />
                          <span className='pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20'>
                            <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' xmlns='http://www.w3.org/2000/svg'>
                              <path
                                fillRule='evenodd'
                                clipRule='evenodd'
                                d='M11.0748 7.50835C9.74622 6.72395 8.25 7.79065 8.25 9.21316V14.7868C8.25 16.2093 9.74622 17.276 11.0748 16.4916L15.795 13.7048C17.0683 12.953 17.0683 11.047 15.795 10.2952L11.0748 7.50835ZM9.75 9.21316C9.75 9.01468 9.84615 8.87585 9.95947 8.80498C10.0691 8.73641 10.1919 8.72898 10.3122 8.80003L15.0324 11.5869C15.165 11.6652 15.25 11.8148 15.25 12C15.25 12.1852 15.165 12.3348 15.0324 12.4131L10.3122 15.2C10.1919 15.271 10.0691 15.2636 9.95947 15.195C9.84615 15.1242 9.75 14.9853 9.75 14.7868V9.21316Z'
                                fill='#ededed'
                              />
                              <path
                                fillRule='evenodd'
                                clipRule='evenodd'
                                d='M12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25ZM2.75 12C2.75 6.89137 6.89137 2.75 12 2.75C17.1086 2.75 21.25 6.89137 21.25 12C21.25 17.1086 17.1086 21.25 12 21.25C6.89137 21.25 2.75 17.1086 2.75 12Z'
                                fill='#ededed'
                              />
                            </svg>
                          </span>
                        </>
                      ) : (
                        <img
                          src={item.url}
                          alt={`${productName} ${index + 1}`}
                          className='h-full w-full object-cover'
                          draggable={false}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
