import { layoutContent } from '../../data/contentData'

export default function CenterLayout() {
  const { center } = layoutContent
  const { featured, banners } = center
  const { products, boldFashion } = featured

  return (
    <div className='w-full flex flex-col pt-0 transition-all duration-300 equal-height-column px-4'>
      {/* Top Section - Featured Products */}
      <div className='grid grid-cols-2 gap-2 sm:gap-4 mb-4 flex-shrink-0 lg:h-[280px]'>
        {products.map((product) => (
          <div
            key={product.id}
            className={`overflow-hidden shadow-sm h-full flex flex-col`}
            style={{ borderRadius: '12px', backgroundColor: product.colors.bg }}
          >
            <div className='relative flex-1 min-h-0'>
              <div
                className='w-full h-full overflow-hidden'
                style={{
                  borderTopLeftRadius: '3px',
                  borderTopRightRadius: '3px',
                }}
              >
                <img
                  src={`${product.image}?w=${product.imageParams.w}&h=${product.imageParams.h}&fit=${product.imageParams.fit}`}
                  alt={product.name}
                  className='w-full h-full object-cover'
                />
              </div>

              <div className='absolute top-2 sm:top-3 left-2 sm:left-3 flex items-center gap-1 sm:gap-2'>
                {product.colors.colorDots.map((color, i) => (
                  <span
                    key={i}
                    className={`w-2 h-2 sm:w-3 sm:h-3 ${color} rounded-full`}
                  />
                ))}
              </div>

              <button className='absolute top-2 sm:top-3 right-2 sm:right-3 p-1 sm:p-2 bg-white rounded-full shadow-sm'>
                <svg
                  className='w-4 h-4 sm:w-5 sm:h-5 text-gray-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
                  />
                </svg>
              </button>
            </div>

            <div className='p-2 sm:p-3 lg:p-4 flex-shrink-0'>
              <p className='text-[10px] sm:text-xs text-gray-500 mb-1'>
                {product.category}
              </p>
              <div className='flex flex-col sm:grid sm:grid-cols-2 items-start sm:items-end gap-2 sm:gap-1'>
                <h3 className='text-[11px] sm:text-[13px] font-semibold text-gray-900 leading-tight'>
                  {product.name}
                </h3>
                <button className='bg-blue-500 text-white px-3 sm:px-4 py-1 sm:py-2 rounded-full font-medium hover:bg-blue-600 transition-colors self-start sm:justify-self-end text-xs sm:text-sm'>
                  {product.price}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Section */}
      <div className='block md:hidden lg:flex-1 lg:flex'>
        <div
          className='bg-white overflow-hidden shadow-sm relative w-full min-h-[120px] sm:min-h-[140px] lg:aspect-video'
          style={{ borderRadius: '12px' }}
        >
          <div className='w-full aspect-video relative overflow-hidden'>
            <img
              src={`${boldFashion.image}?w=${boldFashion.imageParams.w}&h=${boldFashion.imageParams.h}&fit=${boldFashion.imageParams.fit}`}
              alt={boldFashion.title}
              className='w-full h-full object-cover object-center'
            />
          </div>

          <div className='absolute inset-0 bg-black bg-opacity-30 flex flex-col justify-center px-3 sm:px-6 lg:px-8 aspect-video'>
            <h2 className='text-base sm:text-lg lg:text-[25px] font-bold text-white mb-1 sm:mb-2 lg:mb-3'>
              {boldFashion.title}
            </h2>
            <p className='text-sm sm:text-sm lg:text-[14px] text-white mb-2 sm:mb-4 lg:mb-6'>
              {boldFashion.subtitle}
            </p>
            <button className='self-start bg-white text-black text-sm sm:text-sm lg:text-[14px] px-3 sm:px-3 lg:px-2.5 py-1.5 sm:py-1 lg:py-1 rounded-full font-medium hover:bg-gray-100 transition-colors'>
              {boldFashion.buttonText}
            </button>
            <button className='absolute top-2 sm:top-3 lg:top-4 right-2 sm:right-3 lg:right-4 p-1.5 sm:p-2 bg-white rounded-full shadow-sm'>
              <svg
                className='w-4 h-4 sm:w-5 sm:h-5 text-gray-600'
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

      {/* Tablet only: Two banners grid */}
      <div className='hidden md:block lg:hidden'>
        <div className='grid grid-cols-2 gap-3'>
          {Object.entries(banners).map(([key, banner]) => (
            <div
              key={key}
              className='relative h-[180px] overflow-hidden'
              style={{
                backgroundImage: `url('${banner.backgroundImage}?w=${banner.imageParams.w}&h=${banner.imageParams.h}&fit=${banner.imageParams.fit}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '12px',
              }}
            >
              <div className='relative h-full flex flex-col justify-center px-4'>
                <h2 className='text-lg font-bold text-white mb-1'>
                  {banner.title}
                </h2>
                {banner.subtitle && (
                  <p className='text-white text-sm'>{banner.subtitle}</p>
                )}
                {banner.buttonText && (
                  <button className='bg-white px-3 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50 transition-colors rounded-[20px]'>
                    {banner.buttonText}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
