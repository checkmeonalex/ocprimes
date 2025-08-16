'use client'

import { SidebarProvider } from '../context/SidebarContext'
import LeftLayout from '../components/layouts/hero/LeftLayout'
import CenterLayout from '../components/layouts/hero/CenterLayout'
import RightLayout from '../components/layouts/hero/RightLayout'
import dynamic from 'next/dynamic'
import { memo } from 'react'
import Sidebar from '../components/Sidebar'

// Import navbars so they render before body content
import Navbar from '../components/Navbar'
import MobileNavbar from '../components/mobile/Navbar'

// Lazy load heavier sections with better loading states
const BrowseCategories = dynamic(
  () => import('../components/layouts/BrowseCategories'),
  {
    loading: () => <div className='h-32 animate-pulse bg-gray-100 rounded' />,
  }
)
const StoriesComponent = dynamic(
  () => import('../components/layouts/StoriesComponent'),
  {
    loading: () => <div className='h-24 animate-pulse bg-gray-100 rounded' />,
  }
)
const ProductCardList = dynamic(
  () => import('../components/product/ProductCardList'),
  {
    loading: () => <div className='h-96 animate-pulse bg-gray-100 rounded' />,
  }
)

// Memoized versions to avoid re-render unless props change
const MemoBrowseCategories = memo(BrowseCategories)
const MemoStoriesComponent = memo(StoriesComponent)
const MemoProductCardList = memo(ProductCardList)

function MainContent() {
  return (
    <div className='min-h-screen flex'>
      <Sidebar />
      <div className='flex-1 min-w-0'>
        <main className='lg:pl-16 min-h-screen bg-gray-50 overflow-x-hidden w-full'>
          {/* Use main-container class instead of px-4 to avoid double padding */}
          <div className='main-container py-2 mb-4 md:mb-2'>
            <div
              className={`w-full grid grid-cols-1 gap-4 transition-all duration-300
              lg:grid-cols-[1fr_1.5fr_0.8fr] xl:grid-cols-[1fr_1.2fr_0.7fr]`}
            >
              <div className='min-w-0'>
                <LeftLayout />
              </div>
              <div className='min-w-0'>
                <CenterLayout />
              </div>
              <div className='min-w-0'>
                <RightLayout />
              </div>
            </div>

            {/* BrowseCategories Section */}
            <div className='mt-6'>
              <MemoBrowseCategories />
            </div>

            {/* Stories Section */}
            <div className='mt-6'>
              <MemoStoriesComponent />
            </div>

            {/* Products Section */}
            <div className='mt-6'>
              <MemoProductCardList />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <SidebarProvider>
      {/* Render navbars first so they load before the body */}
      <Navbar />
      <MobileNavbar />

      {/* Main content loads after navbars; heavy sections are dynamically imported */}
      <MainContent />
    </SidebarProvider>
  )
}