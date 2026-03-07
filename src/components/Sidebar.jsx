'use client'
import { useSidebar } from '../context/SidebarContext'
import MobileSidebar from './sidebar/MobileSidebar'

export default function Sidebar() {
  const { isOpen, closeSidebar, openCategories, isHydrated } = useSidebar()

  if (!isHydrated) {
    return null
  }

  return (
    <>
      <MobileSidebar
        isOpen={isOpen}
        onClose={closeSidebar}
        onOpenCategories={() => {
          closeSidebar()
          openCategories()
        }}
      />
    </>
  )
}
