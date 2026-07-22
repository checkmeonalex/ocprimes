'use client'

import BannerSlider from '@/components/layouts/BannerSlider'

export default function HomeHeroSlider({
  images = [],
  imageTypes = [],
  imagePosters = [],
  mobileImages = [],
  mobileImageTypes = [],
  mobileImagePosters = [],
  links = [],
  autoMs = 5000,
}) {
  return (
    <BannerSlider
      images={images}
      imageTypes={imageTypes}
      imagePosters={imagePosters}
      mobileImages={mobileImages}
      mobileImageTypes={mobileImageTypes}
      mobileImagePosters={mobileImagePosters}
      links={links}
      autoMs={autoMs}
      fitMode='natural'
      showControls
      controlsVariant='rect'
      controlsTop='50%'
      controlsTranslateY='-50%'
      indicatorPosition='top-right'
      indicatorVariant='pill'
      showPlayPause
      hoverToReveal
    />
  )
}
