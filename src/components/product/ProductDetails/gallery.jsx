import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import MobileGallery from '../../mobile/ProductDetails/MobileGallery'

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

export default function Gallery({
  images,
  media,
  currentImage,
  setCurrentImage,
  productName,
  vendorNameOverlay = '',
  badgeText = null,
  badgeVariant = 'discount',
  mainImageRef = null,
  forceMobileView = false,
}) {
  const mediaItems = useMemo(() => normalizeMediaItems(media, images), [media, images])
  const activeMedia = useMemo(() => {
    const byCurrent = mediaItems.find((item) => item.url === currentImage)
    if (byCurrent) return byCurrent
    return mediaItems[0] || null
  }, [currentImage, mediaItems])
  const [viewportWidth, setViewportWidth] = useState(() => {
    if (typeof window === 'undefined') return 1280
    return window.innerWidth
  })
  const [viewportHeight, setViewportHeight] = useState(() => {
    if (typeof window === 'undefined') return 900
    return window.innerHeight
  })
  const [isMobileView, setIsMobileView] = useState(() => {
    if (forceMobileView) return true
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })
  const [isZooming, setIsZooming] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 })
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [lightboxFilter, setLightboxFilter] = useState('all')
  const [playingVideoUrl, setPlayingVideoUrl] = useState('')
  const isActiveVideoPlaying =
    String(activeMedia?.type || '') === 'video' &&
    String(playingVideoUrl || '').trim() === String(activeMedia?.url || '').trim()
  const [lightboxCurrentIndex, setLightboxCurrentIndex] = useState(0)
  const [isLightboxZooming, setIsLightboxZooming] = useState(false)
  const [isLightboxDragging, setIsLightboxDragging] = useState(false)
  const [lightboxZoomPosition, setLightboxZoomPosition] = useState({
    x: 50,
    y: 50,
  })
  const [lightboxActiveAspect, setLightboxActiveAspect] = useState(1)
  const mainMediaContainerRef = useRef(null)
  const [mainAspect, setMainAspect] = useState(3 / 4)
  const [mainContainerHeight, setMainContainerHeight] = useState(0)
  const lastAspectRef = useRef(3 / 4)
  const lastAspectImageRef = useRef('')
  const activeVideoRef = useRef(null)
  const lightboxDragStartRef = useRef({
    clientX: 0,
    clientY: 0,
    zoomX: 50,
    zoomY: 50,
  })
  const lightboxTouchDraggingRef = useRef(false)
  const lightboxSuppressClickRef = useRef(false)

  useEffect(() => {
    if (forceMobileView) {
      setIsMobileView(true)
      return undefined
    }
    const checkDeviceWidth = () => {
      const nextWidth = Number(window.innerWidth || 0)
      const nextHeight = Number(window.innerHeight || 0)
      setViewportWidth(nextWidth)
      if (nextHeight > 0) setViewportHeight(nextHeight)
      setIsMobileView(nextWidth < 768)
    }
    checkDeviceWidth()
    window.addEventListener('resize', checkDeviceWidth)
    return () => window.removeEventListener('resize', checkDeviceWidth)
  }, [forceMobileView])

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
    let x = ((e.pageX - left) / width) * 100
    let y = ((e.pageY - top) / height) * 100

    x = Math.min(100, Math.max(0, x))
    y = Math.min(100, Math.max(0, y))

    setZoomPosition({ x, y })
  }

  const handleLightboxMouseMove = (e) => {
    if (!isLightboxZooming || !isLightboxDragging) return

    const { width, height } = e.currentTarget.getBoundingClientRect()
    const deltaX = e.clientX - lightboxDragStartRef.current.clientX
    const deltaY = e.clientY - lightboxDragStartRef.current.clientY
    let x = lightboxDragStartRef.current.zoomX - (deltaX / width) * 100
    let y = lightboxDragStartRef.current.zoomY - (deltaY / height) * 100

    x = Math.min(90, Math.max(10, x))
    y = Math.min(90, Math.max(10, y))

    setLightboxZoomPosition({ x, y })
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      lightboxSuppressClickRef.current = true
    }
  }

  const openLightbox = () => {
    const currentIndex = mediaItems.findIndex((item) => item.url === activeMedia?.url)
    setLightboxFilter('all')
    setLightboxCurrentIndex(currentIndex >= 0 ? currentIndex : 0)
    setIsLightboxOpen(true)
  }

  const startVideoPlayer = useCallback((url) => {
    const key = String(url || '').trim()
    if (!key) return
    setPlayingVideoUrl(key)
  }, [])

  useEffect(() => {
    const activeUrl = String(activeMedia?.url || '').trim()
    if (!activeUrl || playingVideoUrl !== activeUrl) return
    const videoEl = activeVideoRef.current
    if (!videoEl) return
    videoEl.play().catch(() => {})
  }, [activeMedia, playingVideoUrl])

  useEffect(() => {
    if (activeMedia?.type !== 'video') {
      setPlayingVideoUrl('')
    }
  }, [activeMedia])

  const filteredLightboxIndexes = useMemo(() => {
    const allIndexes = mediaItems.map((_, index) => index)
    if (lightboxFilter === 'image') {
      return allIndexes.filter((index) => mediaItems[index]?.type === 'image')
    }
    if (lightboxFilter === 'video') {
      return allIndexes.filter((index) => mediaItems[index]?.type === 'video')
    }
    return allIndexes
  }, [mediaItems, lightboxFilter])

  useEffect(() => {
    if (!isLightboxOpen || !filteredLightboxIndexes.length) return
    if (!filteredLightboxIndexes.includes(lightboxCurrentIndex)) {
      setLightboxCurrentIndex(filteredLightboxIndexes[0])
    }
  }, [filteredLightboxIndexes, isLightboxOpen, lightboxCurrentIndex])

  const goToPrevious = () => {
    if (!filteredLightboxIndexes.length) return
    setLightboxCurrentIndex((prev) => {
      const currentIndexInFilter = filteredLightboxIndexes.includes(prev)
        ? filteredLightboxIndexes.indexOf(prev)
        : 0
      const previousIndexInFilter =
        currentIndexInFilter <= 0
          ? filteredLightboxIndexes.length - 1
          : currentIndexInFilter - 1
      return filteredLightboxIndexes[previousIndexInFilter]
    })
  }

  const goToNext = () => {
    if (!filteredLightboxIndexes.length) return
    setLightboxCurrentIndex((prev) => {
      const currentIndexInFilter = filteredLightboxIndexes.includes(prev)
        ? filteredLightboxIndexes.indexOf(prev)
        : 0
      const nextIndexInFilter =
        currentIndexInFilter >= filteredLightboxIndexes.length - 1
          ? 0
          : currentIndexInFilter + 1
      return filteredLightboxIndexes[nextIndexInFilter]
    })
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

  React.useEffect(() => {
    if (isLightboxOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isLightboxOpen])

  useEffect(() => {
    if (!isLightboxOpen) return undefined
    const previousOverflow = document.body.style.overflow
    const previousOverscroll = document.body.style.overscrollBehavior
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousOverscroll
    }
  }, [isLightboxOpen])

  useEffect(() => {
    if (!isLightboxDragging) return undefined
    const stopDragging = () => setIsLightboxDragging(false)
    window.addEventListener('mouseup', stopDragging)
    return () => window.removeEventListener('mouseup', stopDragging)
  }, [isLightboxDragging])

  useEffect(() => {
    setIsLightboxZooming(false)
    setIsLightboxDragging(false)
    lightboxSuppressClickRef.current = false
    setLightboxZoomPosition({ x: 50, y: 50 })
  }, [lightboxCurrentIndex])

  const handleMainImageLoad = useCallback((event) => {
    const imageEl = event.currentTarget
    if (!imageEl) return
    const width = Number(imageEl.naturalWidth || 0)
    const height = Number(imageEl.naturalHeight || 0)
    if (!width || !height) return
    const nextAspect = width / height
    if (!Number.isFinite(nextAspect) || nextAspect <= 0) return

    const srcKey = String(imageEl.currentSrc || imageEl.src || '')
    const sameImage = srcKey && lastAspectImageRef.current === srcKey
    const sameAspect = Math.abs(lastAspectRef.current - nextAspect) < 0.0001
    if (sameImage && sameAspect) return

    lastAspectImageRef.current = srcKey
    lastAspectRef.current = nextAspect
    setMainAspect(nextAspect)
  }, [])

  const isTabletView = !forceMobileView && viewportWidth >= 768 && viewportWidth < 1024
  const mainImageMaxWidth = isTabletView ? 390 : 560
  const mainImageHeight = mainImageMaxWidth / mainAspect
  const defaultThumbSize = isTabletView ? 52 : 64
  const gapSize = 8
  const fallbackMainHeight = Math.max(defaultThumbSize, Math.round(mainImageHeight))
  const effectiveMainHeight = Math.max(
    defaultThumbSize,
    Math.round(mainContainerHeight || fallbackMainHeight),
  )
  const maxThumbSlots = Math.max(
    1,
    Math.floor((effectiveMainHeight + gapSize) / (defaultThumbSize + gapSize)),
  )

  const visibleThumbsCount =
    mediaItems.length > maxThumbSlots
      ? Math.max(0, maxThumbSlots - 1)
      : mediaItems.length

  const remainingCount = mediaItems.length - visibleThumbsCount
  const lightboxImageCount = mediaItems.filter((item) => item.type === 'image').length
  const lightboxVideoCount = mediaItems.length - lightboxImageCount
  const activeLightboxMedia =
    mediaItems[lightboxCurrentIndex] ||
    mediaItems[filteredLightboxIndexes[0]] ||
    mediaItems[0] ||
    null
  const activeLightboxPosition = Math.max(
    0,
    filteredLightboxIndexes.indexOf(lightboxCurrentIndex),
  )
  const lightboxResolvedAspect = Math.max(
    0.45,
    Math.min(
      2.4,
      Number(
        activeLightboxMedia?.type === 'video'
          ? lightboxActiveAspect || 16 / 9
          : lightboxActiveAspect || 1,
      ) || 1,
    ),
  )
  const lightboxSidebarWidth = Math.max(250, Math.min(360, Math.round(viewportWidth * 0.34)))
  const lightboxOuterPadding = viewportWidth >= 640 ? 32 : 16
  const lightboxStagePadding = viewportWidth >= 1024 ? 48 : 32
  const lightboxMaxMediaHeight = Math.max(280, Math.round(viewportHeight * 0.86))
  const lightboxAvailableStageWidth = Math.max(
    260,
    viewportWidth - lightboxSidebarWidth - lightboxOuterPadding - lightboxStagePadding,
  )
  const lightboxMediaWidth = Math.max(
    260,
    Math.min(1320, lightboxAvailableStageWidth, Math.round(lightboxMaxMediaHeight * lightboxResolvedAspect)),
  )
  const lightboxMediaHeight = Math.max(
    220,
    Math.round(lightboxMediaWidth / lightboxResolvedAspect),
  )
  const lightboxShellHeight = Math.max(
    420,
    Math.min(Math.round(viewportHeight * 0.94), lightboxMediaHeight + 56),
  )

  useEffect(() => {
    if (isMobileView) return undefined
    const element = mainMediaContainerRef.current
    if (!element || typeof ResizeObserver === 'undefined') return undefined

    const updateHeight = () => {
      const nextHeight = Math.round(element.getBoundingClientRect().height)
      if (nextHeight > 0) setMainContainerHeight(nextHeight)
    }

    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(element)
    return () => observer.disconnect()
  }, [activeMedia?.url, isMobileView, mainAspect])

  if (!mediaItems.length) return null

  return (
    <>
      {forceMobileView || isMobileView ? (
        <MobileGallery
          images={images}
          media={mediaItems}
          currentImage={activeMedia?.url || currentImage}
          setCurrentImage={setCurrentImage}
          productName={productName}
          vendorNameOverlay={vendorNameOverlay}
          badgeText={badgeText}
          badgeVariant={badgeVariant}
        />
      ) : (
        <div className='flex gap-0 items-start'>
          <div
            className='flex flex-col items-center'
            style={{
              width: defaultThumbSize + 16,
              gap: `${gapSize}px`,
              height: `${effectiveMainHeight}px`,
              maxHeight: `${effectiveMainHeight}px`,
              overflow: 'hidden',
            }}
          >
            {mediaItems.slice(0, visibleThumbsCount).map((item, index) => (
              <div
                key={`${item.type}-${item.url}-${index}`}
                className={`cursor-pointer border-2 rounded-md overflow-hidden transition-all ${
                  activeMedia?.url === item.url
                    ? 'border-gray-800 shadow-sm'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
                onClick={() => setCurrentImage(item.url)}
                onMouseEnter={() => setCurrentImage(item.url)}
                style={{
                  width: defaultThumbSize,
                  height: defaultThumbSize,
                  minWidth: defaultThumbSize,
                  minHeight: defaultThumbSize,
                }}
              >
                {item.type === 'video' ? (
                  <div className='relative h-full w-full bg-black'>
                    <video
                      src={item.url}
                      poster={item.poster || undefined}
                      muted
                      preload='metadata'
                      className='h-full w-full object-cover'
                    />
                    <span className='absolute inset-0 flex items-center justify-center'>
                      <svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-7 w-7'>
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
                  </div>
                ) : (
                  <img
                    src={item.url}
                    alt={`${productName} ${index + 1}`}
                    className='w-full h-full object-cover hover:opacity-80 transition-opacity'
                  />
                )}
              </div>
            ))}

            {remainingCount > 0 && (
              <div
                className='relative cursor-pointer border-2 rounded-md overflow-hidden border-gray-200 flex flex-col items-center justify-center text-center bg-gray-100'
                style={{
                  width: defaultThumbSize,
                  height: defaultThumbSize,
                  minWidth: defaultThumbSize,
                  minHeight: defaultThumbSize,
                }}
                onClick={openLightbox}
                title={`View all ${mediaItems.length} items`}
              >
                <div className='absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center text-white text-base font-bold leading-tight'>
                  +{remainingCount}
                  <br />
                  <span className='text-sm'>View All</span>
                </div>
                {mediaItems[visibleThumbsCount]?.type === 'video' ? (
                  <video
                    src={mediaItems[visibleThumbsCount]?.url}
                    muted
                    preload='metadata'
                    className='w-full h-full object-cover opacity-40'
                  />
                ) : (
                  <img
                    src={mediaItems[visibleThumbsCount]?.url}
                    alt='More media'
                    className='w-full h-full object-cover opacity-40'
                  />
                )}
              </div>
            )}
          </div>

          <div className='flex flex-col w-full lg:w-[640px]'>
            <div
              ref={(node) => {
                mainMediaContainerRef.current = node
                if (!mainImageRef) return
                if (typeof mainImageRef === 'function') {
                  mainImageRef(node)
                  return
                }
                mainImageRef.current = node
              }}
              className='bg-gray-50 rounded-md overflow-hidden flex items-start justify-center relative w-full'
              style={{
                aspectRatio: activeMedia?.type === 'video'
                  ? '4 / 5'
                  : `${Math.max(0.2, Math.min(4, Number(mainAspect) || 0.75))}`,
                maxWidth: `${mainImageMaxWidth}px`,
                position: 'relative',
              }}
              onMouseEnter={() => setIsZooming(true)}
              onMouseLeave={() => setIsZooming(false)}
              onMouseMove={handleMouseMove}
              onClick={() => {
                if (activeMedia?.type === 'video') return
                openLightbox()
              }}
            >
              <button
                onClick={openLightbox}
                className='absolute top-2 right-2 rounded-md p-2 hover:bg-black/10 z-10'
                title='Expand'
              >
                <svg
                  viewBox='0 0 28 28'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                  className='h-5 w-5'
                  aria-hidden='true'
                >
                  <path d='M2.99701 2C2.44638 2 2 2.44637 2 2.997V6.98502C2 7.53565 2.44638 7.98203 2.99701 7.98203C3.54764 7.98203 3.99399 7.53565 3.99399 6.98502V5.40382L9.75339 11.1633C10.1427 11.5526 10.774 11.5526 11.1634 11.1633C11.5527 10.7739 11.5527 10.1426 11.1634 9.75328L5.40411 3.99401H6.98499C7.53561 3.99401 7.98199 3.54764 7.98199 2.997C7.98199 2.44637 7.53561 2 6.98499 2H2.99701Z' fill='#000000' />
                  <path d='M2.99701 26C2.44638 26 2 25.5536 2 25.003V21.015C2 20.4643 2.44638 20.018 2.99701 20.018C3.54764 20.018 3.99399 20.4643 3.99399 21.015V22.4053L9.75299 16.6462C10.1424 16.2568 10.7736 16.2568 11.163 16.6462C11.5523 17.0356 11.5523 17.6668 11.163 18.0562L5.2132 24.006H6.98499C7.53561 24.006 7.98199 24.4524 7.98199 25.003C7.98199 25.5536 7.53561 26 6.98499 26H2.99701Z' fill='#000000' />
                  <path d='M26 25.0028C26 25.5535 25.5536 25.9998 25.003 25.9998H21.015C20.4644 25.9998 20.018 25.5535 20.018 25.0028C20.018 24.4522 20.4644 24.0058 21.015 24.0058H22.5959L16.8321 18.242C16.4427 17.8527 16.4427 17.2214 16.8321 16.832C17.2214 16.4427 17.8527 16.4427 18.2421 16.832L24.006 22.596V21.0148C24.006 20.4642 24.4524 20.0178 25.003 20.0178C25.5536 20.0178 26 20.4642 26 21.0148V25.0028Z' fill='#000000' />
                  <path d='M24.9824 2.00407C25.533 2.00407 25.9794 2.45044 25.9794 3.00107V6.98909C25.9794 7.53972 25.533 7.98609 24.9824 7.98609C24.4317 7.98609 23.9854 7.53972 23.9854 6.98909V5.42363L18.2462 11.1628C17.8569 11.5522 17.2256 11.5522 16.8363 11.1628C16.4469 10.7735 16.4469 10.1422 16.8363 9.75285L22.591 3.99808H20.9944C20.4438 3.99808 19.9974 3.5517 19.9974 3.00108C19.9974 2.45044 20.4438 2.00407 20.9944 2.00407H24.9824Z' fill='#000000' />
                </svg>
              </button>

              {activeMedia?.type === 'video' ? (
                playingVideoUrl === String(activeMedia?.url || '').trim() ? (
                  <video
                    ref={activeVideoRef}
                    src={activeMedia.url}
                    poster={activeMedia.poster || undefined}
                    controls
                    loop
                    preload='metadata'
                    className='h-full w-full object-contain bg-black'
                    onPause={() => setPlayingVideoUrl('')}
                  />
                ) : (
                  <button
                    type='button'
                    onClick={() => startVideoPlayer(activeMedia.url)}
                    className='relative h-full w-full bg-slate-100'
                    aria-label='Play video'
                  >
                    <video
                      src={activeMedia.url}
                      poster={activeMedia.poster || undefined}
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
                  src={activeMedia?.url}
                  alt={productName}
                  onLoad={handleMainImageLoad}
                  className='w-full h-full object-contain transition-transform duration-300'
                  style={
                    isZooming
                      ? {
                          transform: 'scale(2)',
                          transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                        }
                      : { transform: 'scale(1)' }
                  }
                />
              )}
              {badgeText ? (
                <div
                  className={`absolute left-4 text-xs font-semibold px-3 py-1 rounded-full z-10 ${
                    vendorNameOverlay ? 'top-16' : 'top-4'
                  } ${
                    badgeVariant === 'new'
                      ? 'bg-yellow-300 text-yellow-900'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {badgeText}
                </div>
              ) : null}
              {vendorNameOverlay && !isActiveVideoPlaying ? (
                <div className='pointer-events-none absolute left-4 top-4 z-10 max-w-[78%]'>
                  <p className='truncate text-[clamp(1.05rem,2.1vw,2.05rem)] font-medium leading-none text-black/85 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)] [font-family:Georgia,serif]'>
                    {vendorNameOverlay}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {isLightboxOpen && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-2 sm:p-4'
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsLightboxOpen(false)
            }
          }}
        >
          <div
            className='flex w-full max-w-[1540px] overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-200 bg-white text-slate-900 shadow-[0_20px_45px_rgba(15,23,42,0.12)]'
            style={{ height: `${lightboxShellHeight}px` }}
          >
            <aside
              className='flex shrink-0 flex-col border-r border-gray-200 bg-white'
              style={{ width: `${lightboxSidebarWidth}px` }}
            >
              <div className='border-b border-gray-200 p-5'>
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-600'>
                  Product Media
                </p>
                <h3 className='mt-2 text-xl font-semibold text-slate-900'>Shop Gallery</h3>
                <p className='mt-1 text-sm text-slate-700'>{mediaItems.length} items</p>
                <div className='mt-4 grid grid-cols-3 gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1'>
                  <button
                    type='button'
                    onClick={() => setLightboxFilter('all')}
                    className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${
                      lightboxFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-700 hover:bg-white/70'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type='button'
                    onClick={() => setLightboxFilter('image')}
                    className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${
                      lightboxFilter === 'image'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-700 hover:bg-white/70'
                    }`}
                  >
                    Images
                  </button>
                  {lightboxVideoCount > 0 ? (
                    <button
                      type='button'
                      onClick={() => setLightboxFilter('video')}
                      className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${
                        lightboxFilter === 'video'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-700 hover:bg-white/70'
                      }`}
                    >
                      Videos
                    </button>
                  ) : (
                    <div />
                  )}
                </div>
              </div>

              <div className='flex-1 overflow-y-auto px-4 py-4'>
                <div className='grid grid-cols-2 gap-3'>
                  {filteredLightboxIndexes.map((index) => {
                    const item = mediaItems[index]
                    if (!item) return null
                    return (
                      <div
                        key={`${item.type}-${item.url}-${index}`}
                        className={`group relative cursor-pointer overflow-hidden rounded-xl border transition ${
                          lightboxCurrentIndex === index
                            ? 'border-gray-900 ring-2 ring-gray-200'
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                        onClick={() => setLightboxCurrentIndex(index)}
                        style={{ aspectRatio: '1 / 1' }}
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
                            <span className='pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25'>
                              <svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-8 w-8'>
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
                          <img src={item.url} alt={`${productName} ${index + 1}`} className='h-full w-full object-cover' />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className='border-t border-gray-200 px-5 py-4 text-sm text-slate-700'>
                <span className='font-medium text-slate-900'>
                  {filteredLightboxIndexes.length ? activeLightboxPosition + 1 : 0} / {filteredLightboxIndexes.length}
                </span>
                <span className='ml-2 text-slate-600'>
                  ({lightboxImageCount} images{lightboxVideoCount > 0 ? `, ${lightboxVideoCount} videos` : ''})
                </span>
              </div>
            </aside>

            <section className='relative flex flex-1 items-center justify-center overflow-hidden bg-white'>
              <button
                type='button'
                onClick={() => setIsLightboxOpen(false)}
                className='absolute right-5 top-5 z-20 rounded-full border border-gray-300 bg-white p-2 text-gray-700 transition hover:bg-gray-100'
                title='Close'
              >
                <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M6 6l12 12M18 6L6 18' />
                </svg>
              </button>

              <button
                onClick={goToPrevious}
                className='absolute left-5 top-1/2 z-20 -translate-y-1/2 rounded-full border border-gray-300 bg-white p-3 text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35'
                title='Previous'
                disabled={filteredLightboxIndexes.length <= 1}
              >
                <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
                </svg>
              </button>

              <button
                onClick={goToNext}
                className='absolute right-5 top-1/2 z-20 -translate-y-1/2 rounded-full border border-gray-300 bg-white p-3 text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35'
                title='Next'
                disabled={filteredLightboxIndexes.length <= 1}
              >
                <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                </svg>
              </button>

              <div className='flex h-full w-full items-center justify-center p-4 lg:p-6'>
                {activeLightboxMedia?.type === 'video' ? (
                  <video
                    src={activeLightboxMedia?.url}
                    controls
                    loop
                    preload='metadata'
                    onLoadedMetadata={(event) => {
                      const width = Number(event.currentTarget.videoWidth || 0)
                      const height = Number(event.currentTarget.videoHeight || 0)
                      if (!width || !height) return
                      const nextAspect = width / height
                      if (!Number.isFinite(nextAspect) || nextAspect <= 0) return
                      setLightboxActiveAspect(nextAspect)
                    }}
                    className='rounded-2xl bg-black object-contain'
                    style={{
                      width: `${lightboxMediaWidth}px`,
                      height: `${lightboxMediaHeight}px`,
                      maxWidth: '100%',
                      maxHeight: '100%',
                    }}
                  />
                ) : (
                  <div
                    className='relative'
                    onClick={() => {
                      if (lightboxSuppressClickRef.current) {
                        lightboxSuppressClickRef.current = false
                        return
                      }
                      setIsLightboxZooming((prev) => {
                        const next = !prev
                        if (!next) {
                          setLightboxZoomPosition({ x: 50, y: 50 })
                          setIsLightboxDragging(false)
                        }
                        return next
                      })
                    }}
                    onMouseDown={(event) => {
                      if (!isLightboxZooming) return
                      event.preventDefault()
                      setIsLightboxDragging(true)
                      lightboxSuppressClickRef.current = false
                      lightboxDragStartRef.current = {
                        clientX: event.clientX,
                        clientY: event.clientY,
                        zoomX: lightboxZoomPosition.x,
                        zoomY: lightboxZoomPosition.y,
                      }
                    }}
                    onMouseMove={handleLightboxMouseMove}
                    onMouseUp={() => setIsLightboxDragging(false)}
                    onMouseLeave={() => setIsLightboxDragging(false)}
                    onTouchStart={(event) => {
                      if (!isLightboxZooming) return
                      const touch = event.touches?.[0]
                      if (!touch) return
                      lightboxTouchDraggingRef.current = true
                      lightboxSuppressClickRef.current = false
                      lightboxDragStartRef.current = {
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                        zoomX: lightboxZoomPosition.x,
                        zoomY: lightboxZoomPosition.y,
                      }
                    }}
                    onTouchMove={(event) => {
                      if (!isLightboxZooming || !lightboxTouchDraggingRef.current) return
                      event.preventDefault()
                      const touch = event.touches?.[0]
                      const node = event.currentTarget
                      if (!touch || !node) return
                      const rect = node.getBoundingClientRect()
                      if (!rect.width || !rect.height) return
                      const deltaX = touch.clientX - lightboxDragStartRef.current.clientX
                      const deltaY = touch.clientY - lightboxDragStartRef.current.clientY
                      let x = lightboxDragStartRef.current.zoomX - (deltaX / rect.width) * 100
                      let y = lightboxDragStartRef.current.zoomY - (deltaY / rect.height) * 100
                      x = Math.min(90, Math.max(10, x))
                      y = Math.min(90, Math.max(10, y))
                      setLightboxZoomPosition({ x, y })
                      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
                        lightboxSuppressClickRef.current = true
                      }
                    }}
                    onTouchEnd={() => {
                      lightboxTouchDraggingRef.current = false
                    }}
                    onTouchCancel={() => {
                      lightboxTouchDraggingRef.current = false
                    }}
                    style={{
                      overflow: 'hidden',
                      cursor: isLightboxZooming
                        ? isLightboxDragging
                          ? 'grabbing'
                          : 'grab'
                        : 'zoom-in',
                      touchAction: isLightboxZooming ? 'none' : 'auto',
                      width: `${lightboxMediaWidth}px`,
                      height: `${lightboxMediaHeight}px`,
                      maxWidth: '100%',
                      maxHeight: '100%',
                    }}
                  >
                    <img
                      src={activeLightboxMedia?.url}
                      alt={`${productName} ${lightboxCurrentIndex + 1}`}
                      onLoad={(event) => {
                        const width = Number(event.currentTarget.naturalWidth || 0)
                        const height = Number(event.currentTarget.naturalHeight || 0)
                        if (!width || !height) return
                        const nextAspect = width / height
                        if (!Number.isFinite(nextAspect) || nextAspect <= 0) return
                        setLightboxActiveAspect(nextAspect)
                      }}
                      className='h-full w-full rounded-2xl object-contain transition-transform duration-200'
                      style={
                        isLightboxZooming
                          ? {
                              transform: 'scale(2)',
                              transformOrigin: `${lightboxZoomPosition.x}% ${lightboxZoomPosition.y}%`,
                            }
                          : {
                              transform: 'scale(1)',
                            }
                      }
                      draggable={false}
                    />
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  )
}
