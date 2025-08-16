'use client'
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { layoutContent } from '../../data/contentData'

export default function LeftLayout() {
  const [currentFavoriteIndex, setCurrentFavoriteIndex] = useState(0)
  const { left } = layoutContent
  const { banners, boldFashion, availableNow, favorites } = left
  const favoriteItems = favorites.items

  const nextFavorite = () => {
    setCurrentFavoriteIndex((prev) =>
      prev === favoriteItems.length - 1 ? 0 : prev + 1
    )
  }

  const prevFavorite = () => {
    setCurrentFavoriteIndex((prev) =>
      prev === 0 ? favoriteItems.length - 1 : prev - 1
    )
  }

  return (
    <div className='px-4 flex flex-col justify-start pt-0 transition-all duration-300 equal-height-column'>
      <div className='w-full space-y-3 md:space-y-0 h-full lg:flex lg:flex-col'>
        {/* Mobile/Desktop: Top two banners, Tablet: Bold Fashion section */}
        <div className='block md:hidden lg:block lg:flex-1'>
          <div className='flex flex-col space-y-3 h-full lg:justify-between'>
            {/* Top Discount Banner */}
            <div
              className='relative lg:flex-1 overflow-hidden'
              style={{
                backgroundImage: `url('${banners.discount.backgroundImage}?w=${banners.discount.imageParams.w}&h=${banners.discount.imageParams.h}&fit=${banners.discount.imageParams.fit}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '12px',
                minHeight: banners.discount.minHeight,
                height: banners.discount.height,
                maxHeight: banners.discount.maxHeight,
              }}
            >
              <div className='relative h-full flex items-center px-4'>
                <div className='text-left'>
                  <h2 className='text-lg font-bold text-white mb-1'>
                    {banners.discount.title}
                  </h2>
                  <button
                    className='bg-white px-3 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50 transition-colors'
                    style={{ borderRadius: '20px' }}
                  >
                    {banners.discount.buttonText}
                  </button>
                </div>
              </div>
            </div>

            {/* Winter's Weekend Banner */}
            <div
              className='relative lg:flex-1 overflow-hidden'
              style={{
                backgroundImage: `url('${banners.winter.backgroundImage}?w=${banners.winter.imageParams.w}&h=${banners.winter.imageParams.h}&fit=${banners.winter.imageParams.fit}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '12px',
                minHeight: '182px',
                height: '200px',
                maxHeight: '250px',
              }}
            >
              <div className='relative h-full flex flex-col justify-center px-4'>
                <h3 className='text-xl font-bold text-white mb-0'>
                  {banners.winter.title}
                </h3>
                <p className='text-white text-sm'>{banners.winter.subtitle}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tablet only: Bold Fashion section - Inside glass container */}
        <div className='hidden md:block lg:hidden'>
          <div
            className='relative flex-1 bg-white/20 backdrop-blur-lg p-2 sm:p-3 shadow-lg border border-gray-200 ring-1 ring-gray-200'
            style={{ borderRadius: '28px' }}
          >
            <div
              className='bg-white overflow-hidden shadow-sm relative min-h-[180px]'
              style={{ borderRadius: '20px' }}
            >
              <div className='w-full h-full relative overflow-hidden'>
                <img
                  src='https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=300&fit=crop'
                  alt='Bold Fashion Model'
                  className='w-full h-[180px] object-cover object-center'
                />
              </div>

              <div className='absolute inset-0 bg-black bg-opacity-30 flex flex-col justify-center px-6'>
                <h2 className='text-lg font-bold text-white mb-2'>
                  {boldFashion.title}
                </h2>
                <p className='text-sm text-white mb-4'>
                  {boldFashion.subtitle}
                </p>
                <button className='self-start bg-white text-black text-sm px-3 py-1 rounded-full font-medium hover:bg-gray-100 transition-colors'>
                  {boldFashion.buttonText}
                </button>

                <button className='absolute top-3 right-3 p-2 bg-white rounded-full shadow-sm'>
                  <svg
                    className='w-5 h-5 text-gray-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M7 17l9.2-9.2M17 17V7H7'
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom section - Flexible height on desktop */}
        <div className='grid grid-cols-[auto_1fr] gap-2 sm:gap-3 lg:flex-1 lg:items-end lg:mt-3'>
          {/* Available Now Card - Fixed width, responsive */}
          <div
            className='relative overflow-hidden w-32 sm:w-40 lg:w-44 h-[160px] sm:h-[180px] lg:h-[200px] flex-shrink-0'
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=200&h=250&fit=crop')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: '15px',
            }}
          >
            <button className='absolute top-2 right-2 w-5 h-5 sm:w-6 sm:h-6 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors'>
              <Heart className='w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-600' />
            </button>
            <div className='absolute bottom-2 sm:bottom-3 left-2 sm:left-4'>
              <button
                className='bg-white/20 backdrop-blur-md border border-white/30 px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-medium text-white hover:bg-white/30 transition-colors shadow-md'
                style={{ borderRadius: '20px' }}
              >
                {availableNow.buttonText}
              </button>
            </div>
          </div>

          {/* Outer Glass Container Card - Takes remaining space */}
          <div
            className='relative min-w-0 bg-white/20 backdrop-blur-lg p-2 sm:p-3 shadow-lg border border-gray-200 ring-1 ring-gray-200 overflow-hidden lg:h-[200px]'
            style={{ borderRadius: '28px' }}
          >
            {/* Improved Favorites Section inside the glass card */}
            <div className='space-y-2 h-full flex flex-col'>
              {/* Favorites Tab - Enhanced with better functionality */}
              <div
                className='bg-pink-100 px-2 sm:px-3 py-1.5 sm:py-2 flex-shrink-0'
                style={{ borderRadius: '20px' }}
              >
                <div className='flex items-center justify-between min-w-0'>
                  <div className='flex items-center gap-2 min-w-0'>
                    <h4 className='text-xs sm:text-sm font-semibold text-gray-800 truncate'>
                      Favourites
                    </h4>
                    <span className='text-[10px] text-gray-500 bg-white px-1.5 py-0.5 rounded-full flex-shrink-0'>
                      {currentFavoriteIndex + 1}/{favoriteItems.length}
                    </span>
                  </div>
                  <div className='flex gap-1 flex-shrink-0'>
                    <button
                      onClick={prevFavorite}
                      disabled={favoriteItems.length <= 1}
                      className='w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                      <ChevronLeft className='w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-600' />
                    </button>
                    <button
                      onClick={nextFavorite}
                      disabled={favoriteItems.length <= 1}
                      className='w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                      <ChevronRight className='w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-600' />
                    </button>
                  </div>
                </div>
              </div>

              {/* Images card - Horizontal scrollable grid - Flexible height */}
              <div
                className='bg-pink-50 p-2 sm:p-3 flex-1 flex flex-col'
                style={{ borderRadius: '20px' }}
              >
                {/* Horizontal scrollable container */}
                <div className='overflow-x-auto scrollbar-hide flex-1'>
                  <div className='flex gap-2 pb-1 h-full items-center'>
                    {favoriteItems.map((item, index) => (
                      <button
                        key={item.id}
                        onClick={() => setCurrentFavoriteIndex(index)}
                        className={`relative transition-all duration-200 hover:scale-105 flex-shrink-0 ${
                          index === currentFavoriteIndex
                            ? 'ring-2 ring-pink-400'
                            : ''
                        }`}
                      >
                        <div
                          className='w-14 h-16 sm:w-16 sm:h-18 lg:w-16 lg:h-18 transition-opacity duration-300'
                          style={{
                            backgroundImage: `url('https://images.unsplash.com/photo-${
                              item.id === 1
                                ? '1441986300917'
                                : item.id === 2
                                ? '1445205170230'
                                : item.id === 3
                                ? '1512436991641'
                                : '1515886657613'
                            }-64674bd600d8?w=80&h=90&fit=crop')`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            borderRadius: '12px',
                          }}
                        >
                          <div className='w-full h-full bg-black bg-opacity-10 rounded-xl flex flex-col justify-between p-1'>
                            {/* Active indicator */}
                            {index === currentFavoriteIndex && (
                              <div className='self-center w-2 h-2 bg-white rounded-full shadow-lg'></div>
                            )}

                            {/* Item title */}
                            <span className='text-[7px] sm:text-[8px] text-white font-medium bg-black bg-opacity-50 px-1 rounded text-center'>
                              {item.title}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile only: See All button */}
                <div className='flex justify-center mt-2 lg:hidden flex-shrink-0'>
                  <button
                    onClick={() => setCurrentFavoriteIndex(0)}
                    className='text-[9px] sm:text-[10px] text-gray-600 hover:text-gray-800 transition-colors font-medium bg-white px-2 py-1 rounded-full shadow-sm'
                  >
                    See All
                  </button>
                </div>

                {/* Dots indicator - more compact */}
                <div className='flex justify-center gap-1 mt-2 flex-shrink-0'>
                  {favoriteItems.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentFavoriteIndex(index)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        index === currentFavoriteIndex
                          ? 'bg-pink-400'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
