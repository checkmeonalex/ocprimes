'use client'
import React, { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import useWindowWidth from '../../hooks/useWindowWidth'
import StoryVideoPlayerModal from './StoryVideoPlayerModal'

const StoriesCarousel = ({ stories = [] }) => {
  const windowWidth = useWindowWidth()
  const isMobile = windowWidth < 640
  const [currentIndex, setCurrentIndex] = useState(0)
  const [itemsPerView, setItemsPerView] = useState(4)
  const [playingStoryId, setPlayingStoryId] = useState('')
  const [unmutedStoryId, setUnmutedStoryId] = useState('')
  const [selectedStory, setSelectedStory] = useState(null)
  const [mounted, setMounted] = useState(false)
  const scrollRef = useRef(null)
  const videoRefs = useRef({})
  const [scrollWidth, setScrollWidth] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)

  // Track container and scroll dimensions
  useEffect(() => {
    if (!scrollRef.current || !mounted) return
    
    const updateDimensions = () => {
      const container = scrollRef.current
      if (!container) return
      
      setContainerWidth(container.clientWidth)
      setScrollWidth(container.scrollWidth)
    }
    
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    
    return () => window.removeEventListener('resize', updateDimensions)
  }, [mounted, itemsPerView])

  useEffect(() => {
    setMounted(true)
  }, [])

useEffect(() => {
  if (!mounted) return

  const updateItemsPerView = () => {
    const width = window.innerWidth
    let newItemsPerView
    
    if (width < 640) {
      newItemsPerView = 3  // Mobile
    } else if (width < 768) {
      newItemsPerView = 2  // Small tablet
    } else if (width < 1024) {
      newItemsPerView = 3    // Tablet
    } else {
      newItemsPerView = 4  // Desktop and above
    }
    
    setItemsPerView(newItemsPerView)
  }

  updateItemsPerView()
  window.addEventListener('resize', updateItemsPerView)
  return () => window.removeEventListener('resize', updateItemsPerView)
}, [mounted])


  // Set up scroll listener to track current position and update navigation state
  useEffect(() => {
    if (!scrollRef.current || !mounted) return

    const container = scrollRef.current
    
    const handleScroll = () => {
      if (!container.children.length) return
      
      const containerRect = container.getBoundingClientRect()
      const containerCenter = containerRect.left + containerRect.width / 2
      
      let closestIndex = 0
      let closestDistance = Infinity
      
      Array.from(container.children).forEach((item, index) => {
        const itemRect = item.getBoundingClientRect()
        const itemCenter = itemRect.left + itemRect.width / 2
        const distance = Math.abs(itemCenter - containerCenter)
        
        if (distance < closestDistance) {
          closestDistance = distance
          closestIndex = index
        }
      })
      
      setCurrentIndex(closestIndex)
      
      // Update dimensions to recalculate nav state
      setContainerWidth(container.clientWidth)
      setScrollWidth(container.scrollWidth)
    }
    
    // Initial call to set correct index
    handleScroll()
    
    // Add scroll listener with throttling
    let timeoutId = null
    const throttledHandleScroll = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(handleScroll, 16) // ~60fps
    }
    
    container.addEventListener('scroll', throttledHandleScroll, { passive: true })
    
    return () => {
      container.removeEventListener('scroll', throttledHandleScroll)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [mounted, itemsPerView])

  const maxScrollLeft = Math.max(0, scrollWidth - containerWidth)
  const canGoLeft = scrollRef.current ? scrollRef.current.scrollLeft > 10 : false
  const canGoRight = scrollRef.current ? scrollRef.current.scrollLeft < maxScrollLeft - 10 : false

  const handlePrevious = () => {
    if (!scrollRef.current || !mounted) return
    
    const container = scrollRef.current
    const scrollAmount = container.clientWidth * 0.8 // Scroll by 80% of container width
    
    container.scrollBy({
      left: -scrollAmount,
      behavior: 'smooth'
    })
  }

  const handleNext = () => {
    if (!scrollRef.current || !mounted) return
    
    const container = scrollRef.current
    const scrollAmount = container.clientWidth * 0.8 // Scroll by 80% of container width
    const maxScroll = container.scrollWidth - container.clientWidth
    
    // If we're near the end, scroll to the very end
    if (container.scrollLeft + scrollAmount >= maxScroll) {
      container.scrollTo({
        left: maxScroll,
        behavior: 'smooth'
      })
    } else {
      container.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  const getProgressCount = () => {
    if (!mounted) return 1
    // Calculate based on how many "pages" we can scroll through
    const visibleItems = Math.ceil(itemsPerView)
    return Math.max(1, Math.ceil(stories.length / visibleItems))
  }

  const getCurrentProgressIndex = () => {
    if (!mounted) return 0
    const visibleItems = Math.ceil(itemsPerView)
    return Math.floor(currentIndex / visibleItems)
  }

  const storiesList = Array.isArray(stories) ? stories : []

  if (!storiesList.length) return null

  const formatSellerHandle = (value = '') => {
    const normalized = String(value).trim().replace(/^@+/, '')
    return normalized ? `@${normalized}` : ''
  }

  const setVideoRef = (storyId, node) => {
    const key = String(storyId || '').trim()
    if (!key) return
    if (node) {
      videoRefs.current[key] = node
      return
    }
    delete videoRefs.current[key]
  }

  const handleToggleStoryPlayback = async (storyId) => {
    const key = String(storyId || '').trim()
    if (!key) return

    const activeVideo = videoRefs.current[key]
    if (!activeVideo) return

    if (playingStoryId === key && !activeVideo.paused) {
      activeVideo.pause()
      setPlayingStoryId('')
      return
    }

    Object.entries(videoRefs.current).forEach(([entryId, videoEl]) => {
      if (entryId !== key && videoEl && typeof videoEl.pause === 'function') {
        videoEl.pause()
      }
    })

    try {
      await activeVideo.play()
      setPlayingStoryId(key)
    } catch {
      setPlayingStoryId('')
    }
  }

  const handleToggleStoryMute = (storyId) => {
    const key = String(storyId || '').trim()
    if (!key) return

    const activeVideo = videoRefs.current[key]
    if (!activeVideo) return

    const shouldUnmute = unmutedStoryId !== key

    Object.entries(videoRefs.current).forEach(([entryId, videoEl]) => {
      if (!videoEl) return
      videoEl.muted = entryId !== key || !shouldUnmute
    })

    setUnmutedStoryId(shouldUnmute ? key : '')
  }

  const handleOpenStoryPlayer = (story) => {
    if (story?.media_type !== 'video') return

    Object.values(videoRefs.current).forEach((videoEl) => {
      if (videoEl && typeof videoEl.pause === 'function') {
        videoEl.pause()
        videoEl.muted = true
      }
    })

    setPlayingStoryId('')
    setUnmutedStoryId('')
    setSelectedStory(story)
  }

  return (
    <>
      <div className='mt-2 w-full pb-0 pt-2 lg:mt-4'>
      {/* Header with Navigation Buttons */}
      <div className={`mb-3 flex items-center justify-between ${isMobile ? 'px-1' : 'px-4 md:px-6 lg:px-8'}`}>
        <h2 className={`${isMobile ? 'text-xl' : 'text-xl sm:text-2xl'} font-semibold text-gray-900`}>
          Stories
        </h2>

        <div className={`items-center gap-3 ${isMobile ? 'hidden' : 'flex'}`}>
          <button
            onClick={handlePrevious}
            className={`p-2 rounded-full border-2 transition-all duration-300 ${
              canGoLeft && mounted
                ? 'bg-white border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 shadow-sm hover:shadow-md'
                : 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
            }`}
            disabled={!canGoLeft || !mounted}
            aria-label='Previous stories'
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={handleNext}
            className={`p-2 rounded-full border-2 transition-all duration-300 ${
              canGoRight && mounted
                ? 'bg-white border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 shadow-sm hover:shadow-md'
                : 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
            }`}
            disabled={!canGoRight || !mounted}
            aria-label='Next stories'
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Stories Carousel Container */}
      <div className='relative w-full'>
        <div className={isMobile ? '' : 'lg:px-2'}>
          <div 
            ref={scrollRef}
            className={`flex overflow-x-auto scrollbar-hide scroll-smooth ${isMobile ? 'gap-2 pl-2 pr-2' : 'gap-2'}`}
            style={{
              scrollSnapType: 'x proximity', // Changed from mandatory to proximity
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {storiesList.map((story) => {
              const storyKey = String(story.id || '').trim()
              const isPlaying = playingStoryId === storyKey
              const isUnmuted = unmutedStoryId === storyKey

              return (
                <div
                  key={story.id}
                  className='flex-none'
                  style={{
                    width:
                      windowWidth < 640
                        ? 'min(42vw, 170px)'
                        : windowWidth < 768
                          ? 'min(30vw, 210px)'
                          : windowWidth < 1024
                            ? 'min(27vw, 230px)'
                            : 'min(24.5vw, 250px)',
                    minWidth:
                      windowWidth < 640
                        ? '132px'
                        : windowWidth < 768
                          ? '170px'
                          : windowWidth < 1024
                            ? '190px'
                            : '210px',
                    scrollSnapAlign: 'start',
                  }}
                >
                  <div className='group px-0 transition-all duration-300'>
                    <div
                      className={`relative h-[250px] md:h-[380px] lg:h-[430px] overflow-hidden rounded-2xl bg-gray-100 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                        story.media_type === 'video' ? 'cursor-pointer' : ''
                      }`}
                      onClick={() => handleOpenStoryPlayer(story)}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return
                        event.preventDefault()
                        handleOpenStoryPlayer(story)
                      }}
                      role={story.media_type === 'video' ? 'button' : undefined}
                      tabIndex={story.media_type === 'video' ? 0 : undefined}
                    >
                      {story.media_type === 'video' ? (
                        <video
                          ref={(node) => setVideoRef(story.id, node)}
                          src={story.media_url}
                          aria-label={story.title}
                          className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
                          muted={!isUnmuted}
                          loop
                          playsInline
                          preload='none'
                          poster={story.product_image_url || undefined}
                          onPause={() => setPlayingStoryId((prev) => (prev === storyKey ? '' : prev))}
                          onPlay={() => setPlayingStoryId(storyKey)}
                        />
                      ) : (
                        <img
                          src={story.media_url}
                          alt={story.media_alt || story.title}
                          className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
                          loading='lazy'
                          draggable={false}
                        />
                      )}
                      <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20' />
                      {story.media_type === 'video' ? (
                        <button
                          type='button'
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            handleToggleStoryPlayback(story.id)
                          }}
                          className='absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-900'
                          aria-label={isPlaying ? 'Pause story video' : 'Play story video'}
                          title={isPlaying ? 'Pause' : 'Play'}
                        >
                          {isPlaying ? (
                            <svg viewBox='0 0 24 24' fill='none' aria-hidden='true' className='h-7 w-7'>
                              <path
                                d='M8 9.5C8 9.03406 8 8.80109 8.07612 8.61732C8.17761 8.37229 8.37229 8.17761 8.61732 8.07612C8.80109 8 9.03406 8 9.5 8C9.96594 8 10.1989 8 10.3827 8.07612C10.6277 8.17761 10.8224 8.37229 10.9239 8.61732C11 8.80109 11 9.03406 11 9.5V14.5C11 14.9659 11 15.1989 10.9239 15.3827C10.8224 15.6277 10.6277 15.8224 10.3827 15.9239C10.1989 16 9.96594 16 9.5 16C9.03406 16 8.80109 16 8.61732 15.9239C8.37229 15.8224 8.17761 15.6277 8.07612 15.3827C8 15.1989 8 14.9659 8 14.5V9.5Z'
                                stroke='#fb3232'
                                strokeWidth='1.5'
                              />
                              <path
                                d='M13 9.5C13 9.03406 13 8.80109 13.0761 8.61732C13.1776 8.37229 13.3723 8.17761 13.6173 8.07612C13.8011 8 14.0341 8 14.5 8C14.9659 8 15.1989 8 15.3827 8.07612C15.6277 8.17761 15.8224 8.37229 15.9239 8.61732C16 8.80109 16 9.03406 16 9.5V14.5C16 14.9659 16 15.1989 15.9239 15.3827C15.8224 15.6277 15.6277 15.8224 15.3827 15.9239C15.1989 16 14.9659 16 14.5 16C14.0341 16 13.8011 16 13.6173 15.9239C13.3723 15.8224 13.1776 15.6277 13.0761 15.3827C13 15.1989 13 14.9659 13 14.5V9.5Z'
                                stroke='#fb3232'
                                strokeWidth='1.5'
                              />
                              <path
                                d='M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7'
                                stroke='#fb3232'
                                strokeWidth='1.5'
                                strokeLinecap='round'
                              />
                            </svg>
                          ) : (
                            <svg viewBox='0 0 24 24' fill='none' aria-hidden='true' className='h-7 w-7'>
                              <path
                                d='M13.8876 9.9348C14.9625 10.8117 15.5 11.2501 15.5 12C15.5 12.7499 14.9625 13.1883 13.8876 14.0652C13.5909 14.3073 13.2966 14.5352 13.0261 14.7251C12.7888 14.8917 12.5201 15.064 12.2419 15.2332C11.1695 15.8853 10.6333 16.2114 10.1524 15.8504C9.6715 15.4894 9.62779 14.7336 9.54038 13.2222C9.51566 12.7947 9.5 12.3757 9.5 12C9.5 11.6243 9.51566 11.2053 9.54038 10.7778C9.62779 9.26636 9.6715 8.51061 10.1524 8.1496C10.6333 7.78859 11.1695 8.11466 12.2419 8.76679C12.5201 8.93597 12.7888 9.10831 13.0261 9.27492C13.2966 9.46483 13.5909 9.69274 13.8876 9.9348Z'
                                stroke='#fb3232'
                                strokeWidth='1.5'
                              />
                              <path
                                d='M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7'
                                stroke='#fb3232'
                                strokeWidth='1.5'
                                strokeLinecap='round'
                              />
                            </svg>
                          )}
                        </button>
                      ) : null}
                      {story.media_type === 'video' ? (
                        <button
                          type='button'
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            handleToggleStoryMute(story.id)
                          }}
                          className='absolute bottom-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-900'
                          aria-label={isUnmuted ? 'Mute story video' : 'Unmute story video'}
                          title={isUnmuted ? 'Mute' : 'Unmute'}
                        >
                          <span className='inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/80 bg-transparent'>
                            <svg
                              viewBox='0 0 20 20'
                              aria-hidden='true'
                              className='h-3.5 w-3.5 stroke-white'
                              fill='none'
                              strokeWidth='1.8'
                              strokeLinecap='round'
                              strokeLinejoin='round'
                            >
                              <path d='M3.5 8.2h3.3l3.9-3.3v10.2l-3.9-3.3H3.5z' />
                              {isUnmuted ? (
                                <>
                                  <path d='M13.1 7.1a4.3 4.3 0 0 1 0 5.8' />
                                  <path d='M15.5 5.3a6.9 6.9 0 0 1 0 9.4' />
                                </>
                              ) : (
                                <path d='M13.4 6.6 16.4 13.4M16.4 6.6 13.4 13.4' />
                              )}
                            </svg>
                          </span>
                        </button>
                      ) : null}
                      <div
                        className={`absolute bottom-2 left-2 ${
                          story.media_type === 'video' ? 'right-12' : 'right-2'
                        }`}
                      >
                        {formatSellerHandle(story.seller_name) ? (
                          <p className='truncate text-[10px] font-normal leading-3 text-white/90'>
                            {formatSellerHandle(story.seller_name)}
                          </p>
                        ) : null}
                        <p className='mt-1 truncate text-[10px] font-semibold leading-3 text-white'>
                          {story.title}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {!isMobile && mounted && scrollWidth > containerWidth && (
          <div className='flex justify-center mt-4 gap-1.5'>
            {Array.from({ length: getProgressCount() }).map((_, index) => {
              const isActive = getCurrentProgressIndex() === index
              return (
                <button
                  key={index}
                  onClick={() => {
                    const container = scrollRef.current
                    if (!container) return

                    const maxScroll = container.scrollWidth - container.clientWidth
                    const scrollPerPage = maxScroll / (getProgressCount() - 1)
                    const targetScroll =
                      index === getProgressCount() - 1 ? maxScroll : index * scrollPerPage

                    container.scrollTo({
                      left: targetScroll,
                      behavior: 'smooth',
                    })
                  }}
                  className={`h-2 rounded-full transition-all duration-200 ${
                    isActive ? 'w-6 bg-gray-800' : 'w-2 bg-gray-300'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              )
            })}
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
      </div>
      </div>

      <StoryVideoPlayerModal
        open={Boolean(selectedStory)}
        story={selectedStory}
        stories={storiesList}
        onClose={() => setSelectedStory(null)}
      />
    </>
  )
}

export default StoriesCarousel
