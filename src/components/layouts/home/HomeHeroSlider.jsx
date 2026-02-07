'use client'

import BannerSlider from '@/components/layout/BannerSlider'

export default function HomeHeroSlider({
  images = [],
  mobileImages = [],
  links = [],
  autoMs = 5000,
}) {
  return (
    <div className='absolute inset-0 z-0'>
      <BannerSlider
        images={images}
        mobileImages={mobileImages}
        links={links}
        autoMs={autoMs}
        enforceAspect={false}
        heightClass='h-full'
        className='h-full'
        showControls
        controlsVariant='rect'
        controlsTop='10%'
        controlsTranslateY='0%'
        indicatorPosition='top-right'
        indicatorVariant='pill'
        showPlayPause
      />
    </div>
  )
}
