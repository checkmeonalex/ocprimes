'use client'
import { useState } from 'react'
import { useSidebar } from '../context/SidebarContext'
import DesktopSidebar from './sidebar/DesktopSidebar'
import MobileSidebar from './sidebar/MobileSidebar'
import SidebarSkeleton from './sidebar/SidebarSkeleton'

const sidebarItems = [
  { name: 'Popular Products', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  {
    name: 'Explore New',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  },
  {
    name: 'Clothing and Shoes',
    icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  },
  {
    name: 'Gifts and Living',
    icon: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7',
  },
  {
    name: 'Inspiration',
    icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  },
]

export default function Sidebar() {
  const {
    isOpen,
    toggleSidebar,
    isHydrated,
    setIsHovering,
    openSidebar,
    closeSidebar,
  } = useSidebar()
  const [selectedItem, setSelectedItem] = useState('Popular Products')

  if (!isHydrated) {
    return <SidebarSkeleton />
  }

  return (
    <>
      <DesktopSidebar
        items={sidebarItems}
        selectedItem={selectedItem}
        onSelect={setSelectedItem}
        isOpen={isOpen}
        onHoverChange={setIsHovering}
        onOpen={openSidebar}
        onClose={closeSidebar}
      />
      <MobileSidebar
        isOpen={isOpen}
        onClose={toggleSidebar}
        items={sidebarItems}
        selectedItem={selectedItem}
        onSelect={setSelectedItem}
      />
    </>
  )
}
