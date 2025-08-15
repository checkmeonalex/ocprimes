import { layoutContent } from '../../data/contentData'

export default function RightLayout() {
  const { right } = layoutContent
  const { summerHome, tweens } = right

  return (
    <div className='flex flex-col justify-start pt-0 transition-all duration-300 equal-height-container'>
      <div className='w-full grid grid-cols-2 gap-3 lg:flex lg:flex-col lg:space-y-3 lg:gap-0 h-full'>
        {/* Summer Home Trends Banner */}
        <div
          className='relative overflow-hidden lg:flex-1 lg:aspect-auto aspect-[3/4]'
          style={{
            backgroundImage: `url('${summerHome.backgroundImage}?w=${summerHome.imageParams.w}&h=${summerHome.imageParams.h}&fit=${summerHome.imageParams.fit}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '12px',
          }}
        >
          <div className='relative h-full flex flex-col justify-center px-2 sm:px-4'>
            <h2 className='text-sm sm:text-lg font-bold text-blue-900 mb-1'>
              {summerHome.title}
            </h2>
            <h3 className='text-sm sm:text-lg font-bold text-blue-900 mb-2'>
              {summerHome.subtitle}
            </h3>
            <button className='self-start bg-transparent border-b border-blue-900 text-blue-900 text-xs sm:text-sm font-medium hover:bg-blue-50 transition-colors pb-1'>
              {summerHome.buttonText}
            </button>
          </div>
        </div>

        {/* New for Tweens Banner */}
        <div
          className='relative overflow-hidden lg:flex-1 lg:aspect-auto'
          style={{
            aspectRatio: '3/4',
          }}
        >
          <div
            style={{
              backgroundImage: `url('${tweens.backgroundImage}?w=${tweens.imageParams.w}&h=${tweens.imageParams.h}&fit=${tweens.imageParams.fit}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: '12px',
            }}
            className='w-full h-full'
          >
            <div className='relative h-full flex flex-col justify-start px-2 sm:px-4 pt-3 sm:pt-6'>
              <h2 className='text-sm sm:text-lg font-bold text-white mb-1'>
                {tweens.title}
              </h2>
              <h3 className='text-sm sm:text-lg font-bold text-white mb-2 sm:mb-4'>
                {tweens.subtitle}
              </h3>
              <button className='self-start bg-transparent border-b border-white text-white text-xs sm:text-sm font-medium hover:bg-white/10 transition-colors pb-1 mb-3 sm:mb-6'>
                {tweens.buttonText}
              </button>

              {/* Weekend Academy Logo at bottom */}
              <div className='absolute bottom-3 sm:bottom-6 left-2 sm:left-4'>
                <div className='text-white'>
                  <h4 className='text-sm sm:text-base font-bold'>
                    {tweens.brand.line1}
                  </h4>
                  <h4 className='text-sm sm:text-base font-bold'>
                    {tweens.brand.line2}
                  </h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
