import React, { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { storiesData } from '../data/storiesData'
import useWindowWidth from '../hooks/useWindowWidth'

const StoriesCarousel = () => {
  const windowWidth = useWindowWidth()
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
      newItemsPerView = 2.5  // Mobile
    } else if (width < 768) {
      newItemsPerView = 2.5  // Small tablet
    } else if (width < 1024) {
      newItemsPerView = 3    // Tablet
    } else {
      newItemsPerView = 5    // Desktop and above
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

  const getBadgeStyle = (badge, isLive) => {
    if (isLive) return 'bg-red-500 text-white'
    if (badge === 'Premiere') return 'bg-yellow-500 text-black'
    return 'bg-blue-500 text-white'
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

  return (
    <div className='w-full py-2'>
      {/* Header with Navigation Buttons */}
      <div className='flex justify-between items-center mb-4 px-4 md:px-6 lg:px-8'>
        <h2 className='text-2xl md:text-3xl font-medium text-gray-900'>
          Stories
        </h2>

        <div className='flex items-center gap-3'>
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
        <div className='lg:px-8'>
          <div 
            ref={scrollRef}
            className='flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth'
            style={{
              scrollSnapType: 'x proximity', // Changed from mandatory to proximity
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {storiesData.map((story) => (
              <div
                key={story.id}
                className='flex-none'
                style={{
                  width: `${100 / itemsPerView}%`,
                  minWidth: windowWidth < 640 ? '40%' : windowWidth < 768 ? '40%' : windowWidth < 1024 ? '33.33%' : '20%',
                  scrollSnapAlign: 'start',
                }}
              >
                <div className='cursor-pointer group transition-all duration-300 px-1'>
                  <div className='relative aspect-[2.5/4] rounded-2xl overflow-hidden bg-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1'>
                    <img
                      src={story.image}
                      alt={`${story.username}'s story`}
                      className='w-full h-full object-cover transition-transform duration-300 group-hover:scale-105'
                      loading='lazy'
                      draggable={false}
                    />
                    <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30' />
                    <div className='absolute top-3 left-3'>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${getBadgeStyle(
                          story.badge,
                          story.isLive
                        )}`}
                      >
                        {story.badge}
                      </span>
                    </div>
                    {story.viewers && (
                      <div className='absolute top-3 right-3 flex items-center gap-1 bg-black/60 px-2 py-1 rounded-full backdrop-blur-sm'>
                        <Eye size={12} className='text-white' />
                        <span className='text-white text-xs font-medium'>
                          {story.viewers}
                        </span>
                      </div>
                    )}
                    <div className='absolute bottom-3 left-3 right-3 flex items-center gap-2'>
                      <img
                        src={story.avatar}
                        alt={story.username}
                        className='w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm'
                        draggable={false}
                      />
                      <span className='text-white text-sm font-medium truncate'>
                        {story.username}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {mounted && scrollWidth > containerWidth && (
          <div className='flex justify-center mt-4 gap-1.5'>
            {Array.from({ length: getProgressCount() }).map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  const container = scrollRef.current
                  if (!container) return
                  
                  const maxScroll = container.scrollWidth - container.clientWidth
                  const scrollPerPage = maxScroll / (getProgressCount() - 1)
                  const targetScroll = index === getProgressCount() - 1 ? maxScroll : index * scrollPerPage
                  
                  container.scrollTo({
                    left: targetScroll,
                    behavior: 'smooth'
                  })
                }}
                className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                  getCurrentProgressIndex() === index
                    ? 'bg-gray-600'
                    : 'bg-gray-300'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
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