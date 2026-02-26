'use client'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const normalizeMediaItems = (media, images = []) => {
  if (Array.isArray(media) && media.length) {
    return media
      .map((item) => {
        const type = item?.type === 'video' ? 'video' : 'image'
        const url = String(item?.url || '').trim()
        const poster = String(item?.poster || '').trim()
        if (!url) return null
        return { type, url, poster }
      })
      .filter(Boolean)
  }

  return (Array.isArray(images) ? images : [])
    .map((url) => String(url || '').trim())
    .filter(Boolean)
    .map((url) => ({ type: 'image', url, poster: '' }))
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
}) {
  const rootRef = useRef(null)
  const videoRef = useRef(null)
  const resumeOnActiveRef = useRef(false)
  const hideControlsTimerRef = useRef(null)
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
        onPause={() => setIsPlaying(false)}
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
  badgeText = null,
  badgeVariant = 'discount',
}) {
  const mediaItems = useMemo(() => normalizeMediaItems(media, images), [images, media])
  const mediaCount = mediaItems.length
  const [activeIndex, setActiveIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [unlockedVideoMap, setUnlockedVideoMap] = useState({})
  const [lightboxCurrentIndex, setLightboxCurrentIndex] = useState(0)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const lightboxTouchStartX = useRef(0)
  const lightboxTouchEndX = useRef(0)

  const activeMedia = mediaItems[activeIndex] || null

  const handleImageSelect = (index) => {
    setActiveIndex(index)
  }

  const unlockVideoPlayer = useCallback((url) => {
    const key = String(url || '').trim()
    if (!key) return
    setUnlockedVideoMap((prev) => ({ ...prev, [key]: true }))
  }, [])

  const handleSwipe = () => {
    if (mediaCount <= 1) return
    const delta = touchStartX.current - touchEndX.current
    const threshold = 40
    if (Math.abs(delta) < threshold) return

    if (delta > 0) {
      setActiveIndex((prev) => (prev + 1) % mediaCount)
      return
    }

    setActiveIndex((prev) => (prev === 0 ? mediaCount - 1 : prev - 1))
  }

  const openLightbox = () => {
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
    if (currentIndex >= 0 && currentIndex !== activeIndex) {
      setActiveIndex(currentIndex)
    }
  }, [activeIndex, currentImage, mediaCount, mediaItems])

  useEffect(() => {
    if (!mediaCount) return
    if (!setCurrentImage) return
    const nextMedia = mediaItems[activeIndex] || mediaItems[0]
    if (nextMedia?.url && nextMedia.url !== currentImage) {
      setCurrentImage(nextMedia.url)
    }
  }, [activeIndex, currentImage, mediaCount, mediaItems, setCurrentImage])

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

  if (!mediaCount) return null

  return (
    <>
      <div className='w-full bg-white'>
        <div className='relative w-full bg-gray-50 rounded-lg overflow-hidden'>
          <div
            className='w-full cursor-pointer'
            style={{ aspectRatio: '4 / 5' }}
            onClick={openLightbox}
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX
            }}
            onTouchMove={(e) => {
              touchEndX.current = e.touches[0].clientX
            }}
            onTouchEnd={handleSwipe}
          >
            <div
              className='flex h-full w-full transition-transform duration-300 ease-out'
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {mediaItems.map((item, index) => (
                <div key={`${item.type}-${item.url}-${index}`} className='h-full w-full shrink-0 bg-black'>
                  {item.type === 'video' ? (
                    unlockedVideoMap[String(item.url || '').trim()] ? (
                      <MobileCustomVideoPlayer
                        src={item.url}
                        poster={item.poster || undefined}
                        containerClassName='h-full w-full'
                        videoClassName='h-full w-full object-contain'
                        isActive={index === activeIndex}
                      />
                    ) : (
                      <button
                        type='button'
                        onClick={(event) => {
                          event.stopPropagation()
                          unlockVideoPlayer(item.url)
                        }}
                        className='relative h-full w-full bg-black'
                        aria-label='Play video'
                      >
                        <video
                          src={item.url}
                          poster={item.poster || undefined}
                          muted
                          preload='metadata'
                          className='h-full w-full object-contain opacity-90'
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
              className={`absolute top-4 left-4 text-xs font-semibold px-3 py-1 rounded-full ${
                badgeVariant === 'new'
                  ? 'bg-yellow-300 text-yellow-900'
                  : 'bg-red-500 text-white'
              }`}
            >
              {badgeText}
            </div>
          )}

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
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
