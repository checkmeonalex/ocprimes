import React, { useState, useEffect } from 'react'
import MobileGallery from '../../mobile/ProductDetails/MobileGallery'

export default function Gallery({
  images,
  currentImage,
  setCurrentImage,
  productName,
}) {
  const [isMobileView, setIsMobileView] = useState(false)
  const [isZooming, setIsZooming] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 })
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [lightboxCurrentIndex, setLightboxCurrentIndex] = useState(0)
  const [isLightboxZooming, setIsLightboxZooming] = useState(false)
  const [lightboxZoomPosition, setLightboxZoomPosition] = useState({
    x: 50,
    y: 50,
  })

  useEffect(() => {
    const checkDeviceWidth = () => {
      setIsMobileView(window.innerWidth <= 768)
    }

    // Initial check
    checkDeviceWidth()

    // Add event listener
    window.addEventListener('resize', checkDeviceWidth)

    // Cleanup
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

    // Clamp x and y between 10 and 90
    x = Math.min(90, Math.max(10, x))
    y = Math.min(90, Math.max(10, y))

    setLightboxZoomPosition({ x, y })
  }

  const openLightbox = () => {
    const currentIndex = images.indexOf(currentImage)
    setLightboxCurrentIndex(currentIndex >= 0 ? currentIndex : 0)
    setIsLightboxOpen(true)
  }

  const goToPrevious = () => {
    setLightboxCurrentIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    )
  }

  const goToNext = () => {
    setLightboxCurrentIndex((prev) =>
      prev === images.length - 1 ? 0 : prev + 1
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

  const maxMainImageWidth = 400
  const portraitHeight = (maxMainImageWidth * 4) / 3
  const defaultThumbSize = 64
  const gapSize = 8

  // Calculate how many thumbs fit fully at default size within portraitHeight
  const maxThumbCount = Math.floor(
    (portraitHeight + gapSize) / (defaultThumbSize + gapSize)
  )

  // Determine how many thumbnails to show normally (all or maxThumbCount - 1 if overflow)
  const visibleThumbsCount =
    images.length > maxThumbCount ? maxThumbCount - 1 : images.length

  // How many images remain hidden behind the "+N" overlay
  const remainingCount = images.length - visibleThumbsCount

  return (
    <>
      {isMobileView ? (
        <MobileGallery
          images={images}
          currentImage={currentImage}
          setCurrentImage={setCurrentImage}
          productName={productName}
        />
      ) : (
        <div className='flex gap-4'>
          {/* Thumbnails */}
          <div
            className='flex flex-col items-center bg-white rounded-md border border-gray-200'
            style={{
              height: portraitHeight,
              width: defaultThumbSize + 16,
              gap: `${gapSize}px`,
            }}
          >
            {images.slice(0, visibleThumbsCount).map((img, index) => (
              <div
                key={index}
                className={`cursor-pointer border-2 rounded-md overflow-hidden transition-all ${
                  currentImage === img
                    ? 'border-gray-800 shadow-sm'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
                onClick={() => setCurrentImage(img)}
                style={{
                  width: defaultThumbSize,
                  height: defaultThumbSize,
                  minWidth: defaultThumbSize,
                  minHeight: defaultThumbSize,
                }}
              >
                <img
                  src={img}
                  alt={`${productName} ${index + 1}`}
                  className='w-full h-full object-cover hover:opacity-80 transition-opacity'
                />
              </div>
            ))}

            {/* Show "+N View All" overlay if more images remain */}
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
                title={`View all ${images.length} images`}
              >
                {/* Semi-transparent overlay with count */}
                <div className='absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center text-white text-base font-bold leading-tight'>
                  +{remainingCount}
                  <br />
                  <span className='text-sm'>View All</span>
                </div>
                {/* Last thumbnail blurred beneath */}
                <img
                  src={images[visibleThumbsCount]}
                  alt='More images'
                  className='w-full h-full object-cover opacity-40'
                />
              </div>
            )}
          </div>

          {/* Main image with zoom & expand */}
          <div
            className='flex-1 bg-gray-50 rounded-md overflow-hidden flex items-start justify-center relative'
            style={{
              aspectRatio: '3 / 4',
              maxWidth: `${maxMainImageWidth}px`,
              width: '100%',
              position: 'relative',
            }}
            onMouseEnter={() => setIsZooming(true)}
            onMouseLeave={() => setIsZooming(false)}
            onMouseMove={handleMouseMove}
          >
            {/* Expand button */}
            <button
              onClick={openLightbox}
              className='absolute top-2 right-2 bg-white rounded-md p-2 shadow-lg hover:bg-gray-100 border border-gray-300 z-10'
              title='Expand'
            >
              ⛶
            </button>

            <img
              src={currentImage}
              alt={productName}
              className='max-w-full max-h-full object-contain transition-transform duration-300'
              style={
                isZooming
                  ? {
                      transform: 'scale(2)',
                      transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                    }
                  : { transform: 'scale(1)' }
              }
            />
          </div>
        </div>
      )}

      {/* Enhanced Gallery Modal */}
      {isLightboxOpen && (
        <div
          className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center'
          onClick={(e) => {
            // Only close if clicking the overlay background
            if (e.target === e.currentTarget) {
              setIsLightboxOpen(false)
            }
          }}
        >
          <div className='bg-white rounded-lg shadow-2xl max-w-6xl w-full mx-8 my-4 flex h-[95vh]'>
            {/* Left Sidebar with Thumbnails */}
            <div className='w-80 bg-white border-r border-gray-200 flex flex-col rounded-l-lg'>
              {/* Header */}
              <div className='p-4 border-b border-gray-200 flex items-center justify-between'>
                <div>
                  <h3 className='font-medium text-gray-900'>Images & Videos</h3>
                  <p className='text-sm text-gray-500'>{images.length} items</p>
                </div>
                <button
                  onClick={() => setIsLightboxOpen(false)}
                  className='p-2 hover:bg-gray-100 rounded-md transition-colors'
                  title='Close'
                >
                  ✕
                </button>
              </div>

              {/* Thumbnails Grid */}
              <div className='flex-1 overflow-y-auto p-4'>
                <div className='grid grid-cols-3 gap-3'>
                  {images.map((img, index) => (
                    <div
                      key={index}
                      className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        lightboxCurrentIndex === index
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      onClick={() => setLightboxCurrentIndex(index)}
                      style={{ aspectRatio: '1' }}
                    >
                      <img
                        src={img}
                        alt={`${productName} ${index + 1}`}
                        className='w-full h-full object-cover'
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Counter */}
              <div className='p-4 border-t border-gray-200 text-center'>
                <span className='text-sm text-gray-600'>
                  {lightboxCurrentIndex + 1} of {images.length}
                </span>
              </div>
            </div>

            {/* Main Content Area */}
            <div className='flex-1 flex items-center justify-center relative rounded-r-lg overflow-hidden'>
              {/* Navigation Arrows */}
              <button
                onClick={goToPrevious}
                className='absolute left-6 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-3 shadow-lg transition-all z-10'
                title='Previous image'
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
                className='absolute right-6 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-3 shadow-lg transition-all z-10'
                title='Next image'
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
              {/* Main Image */}
              <div className='w-full h-[75vh] flex items-center justify-center p-6'>
                <div
                  className='relative'
                  onClick={() => setIsLightboxZooming((prev) => !prev)}
                  onMouseMove={handleLightboxMouseMove}
                  onMouseLeave={() => setIsLightboxZooming(false)} // cancel zoom on leave
                  style={{
                    overflow: 'hidden',
                    cursor: isLightboxZooming ? 'zoom-out' : 'zoom-in',
                  }}
                >
                  <img
                    src={images[lightboxCurrentIndex]}
                    alt={`${productName} ${lightboxCurrentIndex + 1}`}
                    className='max-w-full max-h-full object-contain rounded-lg transition-transform duration-200'
                    style={
                      isLightboxZooming
                        ? {
                            transform: 'scale(2)',
                            transformOrigin: `${lightboxZoomPosition.x}% ${lightboxZoomPosition.y}%`,
                            maxWidth: '800px', // max width for zoomed image
                            maxHeight: '600px', // max height for zoomed image
                          }
                        : {
                            transform: 'scale(1)',
                            maxWidth: '800px',
                            maxHeight: '600px',
                          }
                    }
                    draggable={false} // Prevent drag interference
                  />
                </div>
              </div>

              {/* Top Right Controls */}
              <div className='absolute top-4 right-4 flex gap-2'>
                <button
                  className='bg-white bg-opacity-80 hover:bg-opacity-100 rounded-md p-2 shadow-lg transition-all'
                  title='Zoom'
                >
                  <svg
                    className='w-5 h-5'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7'
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
  