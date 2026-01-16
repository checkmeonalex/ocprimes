'use client'
import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

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
}) {
  const router = useRouter()
  const [activeIndex, setActiveIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [lightboxCurrentIndex, setLightboxCurrentIndex] = useState(0)
  const [isLightboxZooming, setIsLightboxZooming] = useState(false)
  const [lightboxZoomPosition, setLightboxZoomPosition] = useState({
    x: 50,
    y: 50,
  })
  const activeImage = images[activeIndex] || images[0]
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const handleImageSelect = (index) => {
    setActiveIndex(index)
    if (setCurrentImage) {
      setCurrentImage(images[index])
    }
  }

  const handleSwipe = () => {
    const delta = touchStartX.current - touchEndX.current
    const threshold = 40
    if (Math.abs(delta) < threshold) return

    if (delta > 0) {
      setActiveIndex((prev) => {
        const nextIndex = (prev + 1) % images.length
        if (setCurrentImage) {
          setCurrentImage(images[nextIndex])
        }
        return nextIndex
      })
    } else {
      setActiveIndex((prev) => {
        const nextIndex = prev === 0 ? images.length - 1 : prev - 1
        if (setCurrentImage) {
          setCurrentImage(images[nextIndex])
        }
        return nextIndex
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

  useEffect(() => {
    const currentIndex = currentImage ? images.indexOf(currentImage) : 0
    if (currentIndex >= 0) {
      setActiveIndex(currentIndex)
    }
  }, [currentImage, images])

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
        <div className='relative w-full bg-gray-50 rounded-2xl overflow-hidden'>
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
            <img
              src={activeImage}
              alt={productName}
              className='w-full h-full object-cover'
            />
          </div>

          <button
            type='button'
            onClick={() => router.back()}
            className='absolute top-4 left-4 w-9 h-9 rounded-full bg-white/90 shadow-sm flex items-center justify-center'
            aria-label='Back'
          >
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
                d='M15 19l-7-7 7-7'
              />
            </svg>
          </button>

          {badgeText && (
            <div className='absolute bottom-4 left-4 bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded-full'>
              {badgeText}
            </div>
          )}

          <div className='absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2'>
            {images.map((_, index) => (
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
