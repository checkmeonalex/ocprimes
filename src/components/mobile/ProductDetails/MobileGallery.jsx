import React, { useState, useRef, useEffect } from 'react'

export default function MobileGallery({
  images = [
    'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop',
  ],
  currentImage,
  setCurrentImage,
  productName = 'Premium Hoodie',
}) {
  const [activeImage, setActiveImage] = useState(currentImage || images[0])
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [lightboxCurrentIndex, setLightboxCurrentIndex] = useState(0)
  const [isLightboxZooming, setIsLightboxZooming] = useState(false)
  const [lightboxZoomPosition, setLightboxZoomPosition] = useState({
    x: 50,
    y: 50,
  })
  const [imageAspectRatio, setImageAspectRatio] = useState(null)
  const mainImageRef = useRef(null)
  const thumbnailsRef = useRef(null)
  const [shouldStackVertically, setShouldStackVertically] = useState(false)

  const handleImageSelect = (img, index) => {
    setActiveImage(img)
    if (setCurrentImage) {
      setCurrentImage(img)
    }
  }

  const handleLightboxMouseMove = (e) => {
    if (!isLightboxZooming) return

    const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
    let x = ((e.pageX - left) / width) * 100
    let y = ((e.pageY - top) / height) * 100

    x = Math.min(75, Math.max(25, x))
    y = Math.min(75, Math.max(25, y))

    setLightboxZoomPosition({ x, y })
  }

  const handleTouchMove = (e) => {
    if (!isLightboxZooming) return

    const touch = e.touches[0]
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
    let x = ((touch.clientX - left) / width) * 100
    let y = ((touch.clientY - top) / height) * 100

    x = Math.min(75, Math.max(25, x))
    y = Math.min(75, Math.max(25, y))

    setLightboxZoomPosition({ x, y })
  }

  const openLightbox = () => {
    const currentIndex = images.indexOf(activeImage)
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

  const handleMainImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target
    const ratio = naturalWidth / naturalHeight
    setImageAspectRatio(ratio)
  }

  useEffect(() => {
    const checkHeights = () => {
      if (mainImageRef.current && thumbnailsRef.current) {
        const mainHeight = mainImageRef.current.offsetHeight
        const thumbHeight = thumbnailsRef.current.offsetHeight
        setShouldStackVertically(mainHeight < thumbHeight)
      }
    }

    checkHeights()
    window.addEventListener('resize', checkHeights)
    return () => window.removeEventListener('resize', checkHeights)
  }, [imageAspectRatio])

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

  return (
    <>
      <div className='w-full max-w-2xl mx-auto bg-white'>
        {/* Main Layout with conditional className */}
        <div
          className={`${
            imageAspectRatio === 1 || shouldStackVertically
              ? 'flex flex-col gap-4'
              : 'flex gap-4'
          }`}
        >
          {/* Main Image Display */}
          <div
            ref={mainImageRef}
            className={`${
              imageAspectRatio === 1 || shouldStackVertically
                ? 'w-full'
                : 'flex-1'
            }`}
          >
            <div
              className='w-full bg-gray-50 rounded-lg overflow-hidden cursor-pointer group'
              style={{
                aspectRatio: imageAspectRatio === 1 ? '1 / 1' : '3 / 4',
              }}
              onClick={openLightbox}
            >
              <img
                src={activeImage}
                alt={productName}
                className='w-full h-full object-contain object-center transition-transform duration-300 group-hover:scale-105'
                onLoad={handleMainImageLoad}
              />
              {/* Zoom indicator */}
              <div className='absolute top-3 right-3 bg-black bg-opacity-60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity'>
                <svg
                  className='w-4 h-4'
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
              </div>
            </div>
          </div>

          {/* Thumbnails with conditional styling */}
          <div
            ref={thumbnailsRef}
            className={`
              flex gap-2
              ${
                imageAspectRatio === 1 || shouldStackVertically
                  ? 'flex-row overflow-x-auto scrollbar-hide'
                  : 'flex-col'
              }
            `}
            style={
              imageAspectRatio === 1 || shouldStackVertically
                ? { height: '80px' }
                : { width: '80px' }
            }
          >
            {images.slice(0, 4).map((img, index) => (
              <div
                key={index}
                className={`
                  relative cursor-pointer rounded-lg overflow-hidden transition-all duration-200
                  ${
                    activeImage === img
                      ? 'ring-2 ring-blue-500 ring-offset-1'
                      : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-1 opacity-70 hover:opacity-100'
                  }
                `}
                onClick={() => handleImageSelect(img, index)}
                style={{ aspectRatio: '1 / 1' }}
              >
                <img
                  src={img}
                  alt={`${productName} view ${index + 1}`}
                  className='w-full h-full object-cover'
                />
                {/* Selected indicator */}
                {activeImage === img && (
                  <div className='absolute inset-0 bg-blue-500 bg-opacity-10 flex items-center justify-center'>
                    <div className='bg-blue-500 text-white rounded-full p-1'>
                      <svg
                        className='w-3 h-3'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                      >
                        <path
                          fillRule='evenodd'
                          d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                          clipRule='evenodd'
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Show more indicator if there are more than 4 images */}
            {images.length > 4 && (
              <div className='flex flex-col items-center gap-1'>
                <div
                  className='relative cursor-pointer rounded-lg overflow-hidden transition-all duration-200 hover:ring-2 hover:ring-gray-300 hover:ring-offset-1 opacity-70 hover:opacity-100'
                  onClick={openLightbox}
                  style={{ aspectRatio: '1 / 1', width: '100%' }}
                >
                  <img
                    src={images[4]}
                    alt={`${productName} view 5`}
                    className='w-full h-full object-cover'
                  />
                  {/* Dark overlay with plus icon */}
                  <div className='absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center'>
                    <div className='text-white text-center'>
                      <div className='text-lg font-bold mb-1'>
                        +{images.length - 4}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={openLightbox}
                  className='text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors'
                >
                  View All
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col'>
          {/* Header */}
          <div className='flex items-center justify-between p-4 text-white'>
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
                {lightboxCurrentIndex + 1} of {images.length}
              </span>
            </div>
            <button
              onClick={() => setIsLightboxZooming(!isLightboxZooming)}
              className='p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors'
              title={isLightboxZooming ? 'Zoom out' : 'Zoom in'}
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
                  d={
                    isLightboxZooming
                      ? 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10h-3'
                      : 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7'
                  }
                />
              </svg>
            </button>
          </div>

          {/* Main image area */}
          <div className='flex-1 flex items-center justify-center relative px-4'>
            {/* Navigation arrows */}
            <button
              onClick={goToPrevious}
              className='absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-3 z-10 hover:bg-opacity-70 transition-colors'
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
              className='absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-3 z-10 hover:bg-opacity-70 transition-colors'
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

            {/* Image container */}
            <div
              className='w-full h-full flex items-center justify-center p-6'
              onClick={() => setIsLightboxZooming(!isLightboxZooming)}
              onMouseMove={handleLightboxMouseMove}
              onTouchMove={handleTouchMove}
              style={{ cursor: isLightboxZooming ? 'zoom-out' : 'zoom-in' }}
            >
              <img
                src={images[lightboxCurrentIndex]}
                alt={`${productName} ${lightboxCurrentIndex + 1}`}
                className='max-w-full max-h-full object-contain transition-transform duration-300'
                style={
                  isLightboxZooming
                    ? {
                        transform: 'scale(2)',
                        transformOrigin: `${lightboxZoomPosition.x}% ${lightboxZoomPosition.y}%`,
                        maxWidth: '90vw',
                        maxHeight: '80vh',
                        margin: '0 auto',
                      }
                    : {
                        transform: 'scale(1)',
                        maxWidth: '90vw',
                        maxHeight: '80vh',
                        margin: '0 auto',
                      }
                }
                draggable={false}
              />
            </div>
          </div>

          {/* Bottom thumbnail strip */}
          <div className='p-4 bg-black bg-opacity-30'>
            <div className='flex gap-2 overflow-x-auto scrollbar-hide'>
              {images.map((img, index) => (
                <div
                  key={index}
                  className={`flex-shrink-0 cursor-pointer rounded overflow-hidden border-2 transition-all ${
                    lightboxCurrentIndex === index
                      ? 'border-white ring-1 ring-white'
                      : 'border-gray-400 opacity-70 hover:opacity-100'
                  }`}
                  onClick={() => setLightboxCurrentIndex(index)}
                  style={{
                    width: '60px',
                    height: '60px',
                    minWidth: '60px',
                    minHeight: '60px',
                  }}
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
        </div>
      )}

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  )
}
