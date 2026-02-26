import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import MobileGallery from '../../mobile/ProductDetails/MobileGallery'

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

export default function Gallery({
  images,
  media,
  currentImage,
  setCurrentImage,
  productName,
  badgeText = null,
  badgeVariant = 'discount',
  mainImageRef = null,
}) {
  const mediaItems = useMemo(() => normalizeMediaItems(media, images), [media, images])
  const activeMedia = useMemo(() => {
    const byCurrent = mediaItems.find((item) => item.url === currentImage)
    if (byCurrent) return byCurrent
    return mediaItems[0] || null
  }, [currentImage, mediaItems])
  const [isMobileView, setIsMobileView] = useState(false)
  const [isZooming, setIsZooming] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 })
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [unlockedVideoMap, setUnlockedVideoMap] = useState({})
  const [lightboxCurrentIndex, setLightboxCurrentIndex] = useState(0)
  const [isLightboxZooming, setIsLightboxZooming] = useState(false)
  const [lightboxZoomPosition, setLightboxZoomPosition] = useState({
    x: 50,
    y: 50,
  })
  const [mainAspect, setMainAspect] = useState(3 / 4)
  const lastAspectRef = useRef(3 / 4)
  const lastAspectImageRef = useRef('')

  useEffect(() => {
    const checkDeviceWidth = () => {
      setIsMobileView(window.innerWidth <= 768)
    }
    checkDeviceWidth()
    window.addEventListener('resize', checkDeviceWidth)
    return () => window.removeEventListener('resize', checkDeviceWidth)
  }, [])

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
    let x = ((e.pageX - left) / width) * 100
    let y = ((e.pageY - top) / height) * 100

    x = Math.min(100, Math.max(0, x))
    y = Math.min(100, Math.max(0, y))

    setZoomPosition({ x, y })
  }

  const handleLightboxMouseMove = (e) => {
    if (!isLightboxZooming) return

    const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
    let x = ((e.pageX - left) / width) * 100
    let y = ((e.pageY - top) / height) * 100

    x = Math.min(90, Math.max(10, x))
    y = Math.min(90, Math.max(10, y))

    setLightboxZoomPosition({ x, y })
  }

  const openLightbox = () => {
    const currentIndex = mediaItems.findIndex((item) => item.url === activeMedia?.url)
    setLightboxCurrentIndex(currentIndex >= 0 ? currentIndex : 0)
    setIsLightboxOpen(true)
  }

  const unlockVideoPlayer = useCallback((url) => {
    const key = String(url || '').trim()
    if (!key) return
    setUnlockedVideoMap((prev) => ({ ...prev, [key]: true }))
  }, [])

  const goToPrevious = () => {
    setLightboxCurrentIndex((prev) =>
      prev === 0 ? mediaItems.length - 1 : prev - 1,
    )
  }

  const goToNext = () => {
    setLightboxCurrentIndex((prev) =>
      prev === mediaItems.length - 1 ? 0 : prev + 1,
    )
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

  const mainImageMaxWidth = 560
  const mainImageHeight = mainImageMaxWidth / mainAspect
  const defaultThumbSize = 64
  const gapSize = 8

  const maxThumbCount = Math.floor(
    (mainImageHeight + gapSize) / (defaultThumbSize + gapSize),
  )

  const visibleThumbsCount =
    mediaItems.length > maxThumbCount ? maxThumbCount - 1 : mediaItems.length

  const remainingCount = mediaItems.length - visibleThumbsCount

  if (!mediaItems.length) return null

  return (
    <>
      {isMobileView ? (
        <MobileGallery
          images={images}
          media={mediaItems}
          currentImage={activeMedia?.url || currentImage}
          setCurrentImage={setCurrentImage}
          productName={productName}
          badgeText={badgeText}
          badgeVariant={badgeVariant}
        />
      ) : (
        <div className='flex gap-0 items-start'>
          <div
            className='flex flex-col items-center bg-white rounded-md border border-gray-200'
            style={{
              width: defaultThumbSize + 16,
              gap: `${gapSize}px`,
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
              ref={mainImageRef}
              className='bg-gray-50 rounded-md overflow-hidden flex items-start justify-center relative w-full'
              style={{
                aspectRatio: '4 / 5',
                maxWidth: `${mainImageMaxWidth}px`,
                maxHeight: 'calc(100vh - 220px)',
                position: 'relative',
              }}
              onMouseEnter={() => setIsZooming(true)}
              onMouseLeave={() => setIsZooming(false)}
              onMouseMove={handleMouseMove}
            >
              <button
                onClick={openLightbox}
                className='absolute top-2 right-2 bg-white rounded-md p-2 shadow-lg hover:bg-gray-100 border border-gray-300 z-10'
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
                unlockedVideoMap[String(activeMedia?.url || '').trim()] ? (
                  <video
                    src={activeMedia.url}
                    poster={activeMedia.poster || undefined}
                    controls
                    preload='metadata'
                    className='h-full w-full object-contain bg-black'
                  />
                ) : (
                  <button
                    type='button'
                    onClick={() => unlockVideoPlayer(activeMedia.url)}
                    className='relative h-full w-full bg-black'
                    aria-label='Play video'
                  >
                    <video
                      src={activeMedia.url}
                      poster={activeMedia.poster || undefined}
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
                  src={activeMedia?.url}
                  alt={productName}
                  onLoad={handleMainImageLoad}
                  className={`w-full h-full transition-transform duration-300 ${
                    mainAspect && mainAspect < 0.8
                      ? 'object-contain object-[30%_50%]'
                      : 'object-cover'
                  }`}
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
                  className={`absolute top-4 left-4 text-xs font-semibold px-3 py-1 rounded-full z-10 ${
                    badgeVariant === 'new'
                      ? 'bg-yellow-300 text-yellow-900'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {badgeText}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {isLightboxOpen && (
        <div
          className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center'
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsLightboxOpen(false)
            }
          }}
        >
          <div className='bg-white rounded-lg shadow-2xl max-w-6xl w-full mx-8 my-4 flex h-[95vh]'>
            <div className='w-80 bg-white border-r border-gray-200 flex flex-col rounded-l-lg'>
              <div className='p-4 border-b border-gray-200 flex items-center justify-between'>
                <div>
                  <h3 className='font-medium text-gray-900'>Images & Videos</h3>
                  <p className='text-sm text-gray-500'>{mediaItems.length} items</p>
                </div>
                <button
                  onClick={() => setIsLightboxOpen(false)}
                  className='p-2 hover:bg-gray-100 rounded-md transition-colors'
                  title='Close'
                >
                  ✕
                </button>
              </div>

              <div className='flex-1 overflow-y-auto p-4'>
                <div className='grid grid-cols-3 gap-3'>
                  {mediaItems.map((item, index) => (
                    <div
                      key={`${item.type}-${item.url}-${index}`}
                      className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        lightboxCurrentIndex === index
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      onClick={() => setLightboxCurrentIndex(index)}
                      style={{ aspectRatio: '1' }}
                    >
                      {item.type === 'video' ? (
                        <div className='relative h-full w-full bg-black'>
                          <video src={item.url} muted preload='metadata' className='h-full w-full object-cover' />
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
                          className='w-full h-full object-cover'
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className='p-4 border-t border-gray-200 text-center'>
                <span className='text-sm text-gray-600'>
                  {lightboxCurrentIndex + 1} of {mediaItems.length}
                </span>
              </div>
            </div>

            <div className='flex-1 flex items-center justify-center relative rounded-r-lg overflow-hidden'>
              <button
                onClick={goToPrevious}
                className='absolute left-6 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-3 shadow-lg transition-all z-10'
                title='Previous image'
              >
                <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
                </svg>
              </button>

              <button
                onClick={goToNext}
                className='absolute right-6 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-3 shadow-lg transition-all z-10'
                title='Next image'
              >
                <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                </svg>
              </button>

              <div className='w-full h-[75vh] flex items-center justify-center p-6'>
                {mediaItems[lightboxCurrentIndex]?.type === 'video' ? (
                  <video
                    src={mediaItems[lightboxCurrentIndex]?.url}
                    controls
                    preload='metadata'
                    className='max-w-full max-h-full rounded-lg bg-black'
                    style={{ maxWidth: '900px', maxHeight: '650px' }}
                  />
                ) : (
                  <div
                    className='relative'
                    onClick={() => setIsLightboxZooming((prev) => !prev)}
                    onMouseMove={handleLightboxMouseMove}
                    onMouseLeave={() => setIsLightboxZooming(false)}
                    style={{
                      overflow: 'hidden',
                      cursor: isLightboxZooming ? 'zoom-out' : 'zoom-in',
                    }}
                  >
                    <img
                      src={mediaItems[lightboxCurrentIndex]?.url}
                      alt={`${productName} ${lightboxCurrentIndex + 1}`}
                      className='max-w-full max-h-full object-contain rounded-lg transition-transform duration-200'
                      style={
                        isLightboxZooming
                          ? {
                              transform: 'scale(2)',
                              transformOrigin: `${lightboxZoomPosition.x}% ${lightboxZoomPosition.y}%`,
                              maxWidth: '800px',
                              maxHeight: '600px',
                            }
                          : {
                              transform: 'scale(1)',
                              maxWidth: '800px',
                              maxHeight: '600px',
                            }
                      }
                      draggable={false}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
