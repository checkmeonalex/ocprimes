'use client'
import { useMemo, useState, useEffect, useRef } from 'react'

const clampImages = (images = []) =>
  Array.isArray(images) ? images.filter(Boolean).slice(0, 5) : []

const isSafeSlideLink = (value = '') =>
  typeof value === 'string' &&
  (value.startsWith('/') || value.startsWith('http://') || value.startsWith('https://'))

function BannerSlider({
  images = [],
  mobileImages = [],
  links = [],
  title = 'Banner',
  autoMs = 5000,
  transitionMode = 'none',
  fadeDurationMs = 700,
  fadeScaleActive = 1,
  fadeScaleInactive = 1.03,
  heightClass = 'h-[220px]',
  className = '',
  enforceAspect = true,
  showControls = true,
  controlsVariant = 'round',
  controlsTop = '50%',
  controlsTranslateY = '-50%',
  showIndicators = true,
  indicatorPosition = 'bottom-center',
  indicatorVariant = 'dots',
  showPlayPause = false,
}) {
  const slides = useMemo(() => clampImages(images), [images])
  const mobileSlides = useMemo(
    () =>
      slides.map((_slide, idx) =>
        typeof mobileImages?.[idx] === 'string' ? mobileImages[idx].trim() : '',
      ),
    [mobileImages, slides],
  )
  const slideLinks = useMemo(
    () =>
      Array.isArray(links)
        ? links.slice(0, slides.length).map((link) => (isSafeSlideLink(link) ? link : ''))
        : [],
    [links, slides.length],
  )
  const [index, setIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const timerRef = useRef(null)
  const isFadeMode = transitionMode === 'fade'

  const shapeClass = enforceAspect ? 'aspect-[16/9]' : heightClass

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!isPlaying || slides.length <= 1) return undefined
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length)
    }, autoMs)
    timerRef.current = id
    return () => clearInterval(id)
  }, [slides.length, autoMs, isPlaying])

  useEffect(() => {
    if (index >= slides.length) setIndex(0)
  }, [slides.length, index])

  if (!slides.length) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 h-full ${className}`}>
        <span className='text-sm text-gray-400'>No banner image</span>
      </div>
    )
  }

  const go = (dir) => {
    setIndex((prev) => {
      const next = (prev + dir + slides.length) % slides.length
      return next
    })
  }

  const renderSlide = (slideIndex) => {
    const content = (
      <picture className='block h-full w-full'>
        {mobileSlides[slideIndex] ? (
          <source media='(max-width: 767px)' srcSet={mobileSlides[slideIndex]} />
        ) : null}
        <img
          src={slides[slideIndex]}
          alt={`${title} - slide ${slideIndex + 1}`}
          className='h-full w-full object-cover'
        />
      </picture>
    )

    if (!slideLinks[slideIndex]) return content

    return (
      <a
        href={slideLinks[slideIndex]}
        className='block h-full w-full'
        aria-label={`${title} - slide ${slideIndex + 1} link`}
        tabIndex={slideIndex === index ? 0 : -1}
      >
        {content}
      </a>
    )
  }

  const Arrow = ({ dir, className = 'h-5 w-5', strokeWidth = 2 }) => (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      className={className}
      fill='none'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      {dir === 'left' ? <path d='M15 18l-6-6 6-6' /> : <path d='M9 18l6-6-6-6' />}
    </svg>
  )

  return (
    <div className={`relative w-full overflow-hidden ${shapeClass} ${className}`}>
      <div className='absolute inset-0'>
        {isFadeMode
          ? slides.map((_slide, slideIndex) => {
              const isActive = slideIndex === index
              return (
                <div
                  key={`banner-slide-${slideIndex}`}
                  className={`absolute inset-0 transition-[opacity,transform] ease-out ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  } ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}`}
                  style={{
                    transitionDuration: `${fadeDurationMs}ms`,
                    transform: `scale(${isActive ? fadeScaleActive : fadeScaleInactive})`,
                    transformOrigin: 'center center',
                    willChange: 'opacity, transform',
                  }}
                  aria-hidden={!isActive}
                >
                  {renderSlide(slideIndex)}
                </div>
              )
            })
          : renderSlide(index)}
      </div>

      {showControls && slides.length > 1 && (
        <>
          <button
            type='button'
            onClick={() => go(-1)}
            style={{ top: controlsTop, transform: `translateY(${controlsTranslateY})` }}
            className={`absolute left-3 z-20 ${
              controlsVariant === 'rect'
                ? 'h-20 w-12 rounded-md bg-transparent text-white border border-transparent hover:border-white/80'
                : 'h-12 w-12 rounded-full bg-transparent text-gray-700 drop-shadow'
            } flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-800/70 focus-visible:outline-offset-2 active:outline active:outline-2 active:outline-gray-800/70 active:outline-offset-2`}
            aria-label='Previous banner'
          >
            <Arrow
              dir='left'
              className={controlsVariant === 'rect' ? 'h-8 w-8' : 'h-5 w-5'}
              strokeWidth={controlsVariant === 'rect' ? 2.5 : 2}
            />
          </button>
          <button
            type='button'
            onClick={() => go(1)}
            style={{ top: controlsTop, transform: `translateY(${controlsTranslateY})` }}
            className={`absolute right-3 z-20 ${
              controlsVariant === 'rect'
                ? 'h-20 w-12 rounded-md bg-transparent text-white border border-transparent hover:border-white/80'
                : 'h-12 w-12 rounded-full bg-transparent text-gray-700 drop-shadow'
            } flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-800/70 focus-visible:outline-offset-2 active:outline active:outline-2 active:outline-gray-800/70 active:outline-offset-2`}
            aria-label='Next banner'
          >
            <Arrow
              dir='right'
              className={controlsVariant === 'rect' ? 'h-8 w-8' : 'h-5 w-5'}
              strokeWidth={controlsVariant === 'rect' ? 2.5 : 2}
            />
          </button>
          {(showIndicators || showPlayPause) && slides.length > 1 && (
            <div
              className={`absolute z-20 flex items-center gap-2 ${
                indicatorPosition === 'top-right'
                  ? 'top-4 right-4'
                  : 'bottom-4 left-1/2 -translate-x-1/2'
              }`}
            >
              {showIndicators &&
                slides.map((_, i) => {
                  const isActive = i === index
                  const baseClass =
                    indicatorVariant === 'pill'
                      ? 'h-2 rounded-full transition-all'
                      : 'h-2 w-2 rounded-full transition-all'
                  const activeClass =
                    indicatorVariant === 'pill'
                      ? 'w-6 bg-white'
                      : 'bg-white w-6'
                  const inactiveClass =
                    indicatorVariant === 'pill' ? 'w-2 bg-white/50' : 'bg-white/50'
                  return (
                    <button
                      key={i}
                      type='button'
                      onClick={() => setIndex(i)}
                      className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  )
                })}
              {showPlayPause && (
                <button
                  type='button'
                  onClick={() => setIsPlaying((prev) => !prev)}
                  className='ml-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/60 text-white transition hover:border-white'
                  aria-label={isPlaying ? 'Pause autoplay' : 'Play autoplay'}
                >
                  {isPlaying ? (
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      viewBox='0 0 24 24'
                      className='h-4 w-4'
                      fill='currentColor'
                      aria-hidden='true'
                    >
                      <rect x='6' y='5' width='4' height='14' rx='1.5' />
                      <rect x='14' y='5' width='4' height='14' rx='1.5' />
                    </svg>
                  ) : (
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      viewBox='0 0 24 24'
                      className='h-4 w-4'
                      fill='currentColor'
                      aria-hidden='true'
                    >
                      <path d='M8 5.5v13l10-6.5-10-6.5z' />
                    </svg>
                  )}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default BannerSlider
