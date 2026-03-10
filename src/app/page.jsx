import HomeHero from '../components/layouts/home/HomeHero'
import BrowseCategories from '../components/layouts/BrowseCategories'
import HomeSectionSequence from '../components/layouts/home/HomeSectionSequence'
import HomeLayoutSections from '../components/layouts/home/HomeLayoutSections'
import HomeProductCatalogSection from '../components/layouts/home/HomeProductCatalogSection'

export default function HomePage() {
  return (
    <div className='min-h-screen flex'>
      <div className='flex-1 min-w-0'>
        <main className='min-h-screen bg-white overflow-x-hidden w-full'>
          {/* Use main-container class instead of px-4 to avoid double padding */}
          <div className='main-container pt-0 pb-2 mb-4 md:mb-2'>
            <HomeHero />

            <HomeSectionSequence>
              <div className='mt-4'>
                <BrowseCategories />
              </div>

              <HomeLayoutSections />

              <div className='mt-4'>
                <HomeProductCatalogSection />
              </div>
            </HomeSectionSequence>
          </div>
        </main>
      </div>
    </div>
  )
}
