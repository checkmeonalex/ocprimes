import HomeHeroSlider from './HomeHeroSlider'
import StoriesComponent from '../StoriesComponent'
import { fetchCategoryWithChildren } from '@/lib/catalog/categories'

const DEFAULT_HERO_SLIDES = []

const resolveHeroSlides = (urls = []) => {
  if (!Array.isArray(urls)) return DEFAULT_HERO_SLIDES
  return urls
    .slice(0, 5)
    .map((url) => (typeof url === 'string' ? url.trim() : ''))
}

export default async function HomeHero() {
  const { parent } = await fetchCategoryWithChildren('home')
  const desktopSlots = resolveHeroSlides(parent?.banner_slider_urls)
  const mobileSlots = resolveHeroSlides(parent?.banner_slider_mobile_urls)
  const slides = []
  const mobile = []
  const slideLinks = []
  const rawLinks = Array.isArray(parent?.banner_slider_links) ? parent.banner_slider_links : []

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
    <section className='w-full'>
      <div className='relative isolate overflow-hidden border border-gray-200 mobile-full-bleed'>
        <HomeHeroSlider images={slides} mobileImages={mobile} links={slideLinks} autoMs={5000} />

        <div className='pointer-events-none relative px-4 pb-6 pt-[20vh] sm:px-6 sm:pt-[22vh] lg:px-8 lg:pt-[30vh]'>
          <div className='pointer-events-none absolute inset-x-0 bottom-0 top-[20vh] z-0 bg-gradient-to-b from-transparent via-white/70 to-white sm:top-[22vh] lg:top-[30vh]' />
          <div className='pointer-events-auto relative z-10'>
            <StoriesComponent />
          </div>
        </div>
      </div>
    </section>
  )
}
