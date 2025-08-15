'use client'

import { SidebarProvider, useSidebar } from '../context/SidebarContext'
import LeftLayout from '../components/layouts/hero/LeftLayout'
import CenterLayout from '../components/layouts/hero/CenterLayout'
import RightLayout from '../components/layouts/hero/RightLayout'
import dynamic from 'next/dynamic'
import { memo } from 'react'

// Lazy load heavier sections
const BrowseCategories = dynamic(() => import('../components/layouts/BrowseCategories'))
const StoriesComponent = dynamic(() => import('../components/layouts/StoriesComponent'))
const ProductCardList = dynamic(() => import('../components/product/ProductCardList'))

// Memoized versions to avoid re-render unless props change
const MemoBrowseCategories = memo(BrowseCategories)
const MemoStoriesComponent = memo(StoriesComponent)
const MemoProductCardList = memo(ProductCardList)

function MainContent() {
  const { isOpen } = useSidebar()

  return (
    <main
      className={`min-h-screen bg-gray-50 transition-[margin] duration-300 ease-in-out
        ${isOpen ? 'lg:ml-64' : 'lg:ml-20'} overflow-x-hidden max-w-screen`}
    >
      <div className="main-container p-2 overflow-x-hidden max-w-full box-border">
        <div
          className={`w-full grid grid-cols-1 gap-4 transition-all duration-300
            lg:grid-cols-[1fr_1.5fr_0.8fr] xl:grid-cols-[1fr_1.2fr_0.7fr]`}
        >
          <LeftLayout />
          <CenterLayout />
          <RightLayout />
        </div>

        {/* BrowseCategories Section */}
        <MemoBrowseCategories sidebarOpen={isOpen} />

        {/* Stories Section */}
        <MemoStoriesComponent sidebarOpen={isOpen} />

        {/* Products Section */}
        <MemoProductCardList sidebarOpen={isOpen} />
      </div>
    </main>
  )
}

export default function HomePage() {
  return (
    <SidebarProvider>
      <MainContent />
    </SidebarProvider>
  )
}
