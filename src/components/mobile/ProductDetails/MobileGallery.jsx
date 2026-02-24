'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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
  badgeText = null,
  badgeVariant = 'discount',
}) {
  const imageList = useMemo(() => {
    return Array.isArray(images) ? images : []
  }, [images])
  const imageCount = imageList.length
  const imageSignature = useMemo(() => imageList.join('||'), [imageList])
  const [activeIndex, setActiveIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [lightboxCurrentIndex, setLightboxCurrentIndex] = useState(0)
  const [isLightboxZooming, setIsLightboxZooming] = useState(false)
  const [lightboxZoomPosition, setLightboxZoomPosition] = useState({
    x: 50,
    y: 50,
  })
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const lightboxTouchStartX = useRef(0)
  const lightboxTouchEndX = useRef(0)

  const handleImageSelect = (index) => {
    setActiveIndex(index)
  }

  const handleSwipe = () => {
    if (imageCount <= 1) return
    const delta = touchStartX.current - touchEndX.current
    const threshold = 40
    if (Math.abs(delta) < threshold) return

    if (delta > 0) {
      setActiveIndex((prev) => {
        return (prev + 1) % imageCount
      })
    } else {
      setActiveIndex((prev) => {
        return prev === 0 ? imageCount - 1 : prev - 1
      })
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
    setLightboxCurrentIndex(activeIndex)
    setIsLightboxOpen(true)
  }

  const goToPrevious = () => {
    if (!imageCount) return
    setLightboxCurrentIndex((prev) =>
      prev === 0 ? imageCount - 1 : prev - 1
    )
  }

  const goToNext = () => {
    if (!imageCount) return
    setLightboxCurrentIndex((prev) =>
      prev === imageCount - 1 ? 0 : prev + 1
    )
  }

  const handleLightboxSwipe = () => {
    if (isLightboxZooming) return
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
    if (!imageCount) return
    const currentIndex = currentImage ? imageList.indexOf(currentImage) : 0
    if (currentIndex >= 0 && currentIndex !== activeIndex) {
      setActiveIndex(currentIndex)
    }
  }, [activeIndex, currentImage, imageCount, imageSignature])

  useEffect(() => {
    if (!imageCount) return
    if (!setCurrentImage) return
    const nextImage = imageList[activeIndex] || imageList[0]
    if (nextImage && nextImage !== currentImage) {
      setCurrentImage(nextImage)
    }
  }, [activeIndex, currentImage, imageCount, imageSignature, setCurrentImage])

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
              {imageList.map((imageSrc, index) => (
                <img
                  key={`${imageSrc}-${index}`}
                  src={imageSrc}
                  alt={productName}
                  className='h-full w-full shrink-0 object-cover'
                  loading={index === activeIndex ? 'eager' : 'lazy'}
                  decoding='async'
                />
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

          <div className='absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2'>
            {imageList.map((_, index) => (
              <button
                key={index}
                type='button'
                onClick={() => handleImageSelect(index)}
                className={`h-1.5 rounded-full transition-all ${
                  activeIndex === index
                    ? 'w-6 bg-blue-500'
                    : 'w-2 bg-white/70'
                }`}
                aria-label={`View image ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {isClient && isLightboxOpen
        ? createPortal(
        <div className='fixed inset-0 z-[2147483647] flex h-[100dvh] flex-col bg-black/95 pt-[env(safe-area-inset-top)]'>
          {/* Header */}
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
                {lightboxCurrentIndex + 1} of {imageCount}
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
          <div className='relative min-h-0 flex-1 px-2 sm:px-4'>
            {/* Navigation arrows */}
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

            {/* Image container */}
            <div
              className='flex h-full w-full items-center justify-center overflow-hidden py-1'
              onClick={() => setIsLightboxZooming(!isLightboxZooming)}
              onMouseMove={handleLightboxMouseMove}
              onTouchMove={handleTouchMove}
              onTouchStart={(e) => {
                if (isLightboxZooming) return
                lightboxTouchStartX.current = e.touches[0].clientX
                lightboxTouchEndX.current = e.touches[0].clientX
              }}
              onTouchEnd={handleLightboxSwipe}
              onTouchMoveCapture={(e) => {
                if (isLightboxZooming) return
                lightboxTouchEndX.current = e.touches[0].clientX
              }}
              style={{ cursor: isLightboxZooming ? 'zoom-out' : 'zoom-in' }}
            >
              <img
                src={imageList[lightboxCurrentIndex]}
                alt={`${productName} ${lightboxCurrentIndex + 1}`}
                className='max-w-full max-h-full object-contain transition-transform duration-300'
                style={
                  isLightboxZooming
                    ? {
                        transform: 'scale(2)',
                        transformOrigin: `${lightboxZoomPosition.x}% ${lightboxZoomPosition.y}%`,
                        maxWidth: '100%',
                        maxHeight: '100%',
                        margin: '0 auto',
                      }
                    : {
                        transform: 'scale(1)',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        margin: '0 auto',
                      }
                }
                draggable={false}
              />
            </div>
          </div>

          {/* Bottom thumbnail strip */}
          <div className='shrink-0 bg-black/35 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2'>
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
            ,
            document.body
          )
        : null}

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
