import dynamic from 'next/dynamic'
import { memo } from 'react'
import HomeHero from '../components/layouts/home/HomeHero'
import HomeLayoutSections from '../components/layouts/home/HomeLayoutSections'
import HomeProductCatalogSection from '../components/layouts/home/HomeProductCatalogSection'

// Lazy load heavier sections with better loading states
const BrowseCategories = dynamic(
  () => import('../components/layouts/BrowseCategories'),
  {
    loading: () => <div className='h-32 animate-pulse bg-gray-100 rounded' />,
  }
)
// Memoized versions to avoid re-render unless props change
const MemoBrowseCategories = memo(BrowseCategories)

export default function HomePage() {
  return (
    <div className='min-h-screen flex'>
      <div className='flex-1 min-w-0'>
        <main className='min-h-screen bg-gray-50 overflow-x-hidden w-full'>
          {/* Use main-container class instead of px-4 to avoid double padding */}
          <div className='main-container py-2 mb-4 md:mb-2'>
            <HomeHero />

            {/* BrowseCategories Section */}
            <div className='mt-6'>
              <MemoBrowseCategories />
            </div>

            {/* Home layout sections: featured strip, hotspot, logo grid */}
            <HomeLayoutSections categorySlug='home' />

            {/* Products Section */}
            <div className='mt-6'>
              <HomeProductCatalogSection categorySlug='home' />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
