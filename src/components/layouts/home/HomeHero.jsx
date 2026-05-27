import HomeHeroSlider from './HomeHeroSlider'
import { getCachedHomePageSettings } from '@/lib/home/settings'

const DEFAULT_HERO_SLIDES = []

const resolveHeroSlides = (urls = []) => {
  if (!Array.isArray(urls)) return DEFAULT_HERO_SLIDES
  return urls
    .slice(0, 5)
    .map((url) => (typeof url === 'string' ? url.trim() : ''))
}

export default async function HomeHero() {
  const settings = await getCachedHomePageSettings()
  const desktopSlots = resolveHeroSlides(settings?.banner_slider_urls)
  const mobileSlots = resolveHeroSlides(settings?.banner_slider_mobile_urls)
  const slides = []
  const mobile = []
  const slideLinks = []
  const rawLinks = Array.isArray(settings?.banner_slider_links) ? settings.banner_slider_links : []

  for (let idx = 0; idx < 5; idx += 1) {
    const desktopUrl = desktopSlots[idx] || ''
    if (!desktopUrl) continue
    slides.push(desktopUrl)
    mobile.push(mobileSlots[idx] || '')
    const nextLink = rawLinks[idx]
    slideLinks.push(
      typeof nextLink === 'string' && nextLink.trim().length > 0 ? nextLink.trim() : '',
    )
  }

  return (
    <section className='w-full px-3 sm:px-4 md:px-5'>
      <div className='relative isolate overflow-hidden rounded-2xl md:rounded-3xl bg-gray-900 h-[44vw] max-h-[460px] min-h-[200px] sm:min-h-[260px]'>
        <HomeHeroSlider images={slides} mobileImages={mobile} links={slideLinks} autoMs={5000} />
      </div>
    </section>
  )
}
