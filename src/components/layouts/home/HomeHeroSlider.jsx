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
        transitionMode='fade'
        fadeDurationMs={1500}
        fadeScaleActive={1}
        fadeScaleInactive={1.04}
        enforceAspect={false}
        heightClass='h-full'
        className='h-full'
        showControls
        controlsVariant='rect'
        controlsTop='50%'
        controlsTranslateY='-50%'
        indicatorPosition='top-right'
        indicatorVariant='pill'
        showPlayPause
      />
    </div>
  )
}
