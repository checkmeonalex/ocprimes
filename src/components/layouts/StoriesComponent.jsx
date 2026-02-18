'use client'
import React, { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { storiesData } from '../data/storiesData'
import useWindowWidth from '../hooks/useWindowWidth'

const StoriesCarousel = () => {
  const windowWidth = useWindowWidth()
  const isMobile = windowWidth < 640
  const [currentIndex, setCurrentIndex] = useState(0)
  const [itemsPerView, setItemsPerView] = useState(4)
  const [mounted, setMounted] = useState(false)
  const scrollRef = useRef(null)
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

  const scrollToIndex = (index) => {
    if (!scrollRef.current || !mounted) return
    
    const container = scrollRef.current
    const items = container.children
    if (!items[index]) return
    
    const targetItem = items[index]
    const containerRect = container.getBoundingClientRect()
    const targetRect = targetItem.getBoundingClientRect()
    
    // Calculate scroll position to center the target item (or align to start)
    const scrollLeft = container.scrollLeft + (targetRect.left - containerRect.left)
    
    container.scrollTo({
      left: scrollLeft,
      behavior: 'smooth'
    })
  }

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
    return Math.ceil(storiesData.length / visibleItems)
  }

  const getCurrentProgressIndex = () => {
    if (!mounted) return 0
    const visibleItems = Math.ceil(itemsPerView)
    return Math.floor(currentIndex / visibleItems)
  }

  const storiesList = [
    {
      id: 'create-story',
      isCreateStory: true,
    },
    ...storiesData,
  ]

  const splitName = (value = '') => {
    const parts = String(value).trim().split(/\s+/).filter(Boolean)
    return {
      first: parts[0] || '',
      second: parts[1] || '',
    }
  }

  return (
    <div className='w-full pt-2 pb-0 mt-3 lg:mt-8'>
      {/* Header with Navigation Buttons */}
      <div className={`flex justify-between items-center mb-4 ${isMobile ? 'px-1' : 'px-4 md:px-6 lg:px-8'}`}>
        <h2 className={`${isMobile ? 'text-4xl' : 'text-2xl md:text-3xl'} font-medium text-gray-900`}>
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
            {storiesList.map((story, index) => (
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
                <div className='group cursor-pointer px-0 transition-all duration-300'>
                  {story.isCreateStory ? (
                    <div className='flex h-[250px] md:h-[380px] lg:h-[430px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
                      <div className='relative min-h-0 flex-1 overflow-hidden bg-slate-200'>
                        <img
                          src={storiesData[0]?.image || ''}
                          alt='Create story'
                          className='h-full w-full object-cover opacity-80'
                          loading='lazy'
                          draggable={false}
                        />
                        <button
                          type='button'
                          className='absolute bottom-2 left-1/2 inline-flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-white bg-blue-500 text-white shadow'
                          aria-label='Create story'
                        >
                          +
                        </button>
                      </div>
                      <div className='flex h-[44px] md:h-[56px] items-center justify-center px-1 text-center text-xs md:text-sm font-semibold text-slate-900'>
                        Create story
                      </div>
                    </div>
                  ) : (
                    <div className='relative h-[250px] md:h-[380px] lg:h-[430px] overflow-hidden rounded-2xl bg-gray-100 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl'>
                      <img
                        src={story.image}
                        alt={`${story.username}'s story`}
                        className='w-full h-full object-cover transition-transform duration-300 group-hover:scale-105'
                        loading='lazy'
                        draggable={false}
                      />
                      <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20' />
                      <span className='absolute right-2 top-2 inline-flex min-w-5 items-center justify-center rounded-md bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white'>
                        1
                      </span>
                      <div className='absolute bottom-2 left-2 right-2'>
                        <p className='text-[10px] font-semibold leading-3 text-white'>
                          {splitName(story.username).first}
                        </p>
                        <p className='text-[10px] font-semibold leading-3 text-white'>
                          {splitName(story.username).second}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
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
  )
}

export default StoriesCarousel
