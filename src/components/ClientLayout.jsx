'use client'
import { useEffect } from 'react'
import Navbar from './Navbar'
import MobileNavbar from './mobile/Navbar'
import Sidebar from './Sidebar'
import { useScreenSize } from '../hooks/useScreenSize'
import { usePathname } from 'next/navigation'
import { useSidebar } from '../context/SidebarContext'

export default function ClientLayout({ children }) {
  const { isMobile } = useScreenSize()
  const pathname = usePathname()
  const { isOpen, openSidebar, closeSidebar, isHovering } = useSidebar()
  const isAuthRoute =
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/signup') ||
    pathname?.startsWith('/admin/login') ||
    pathname?.startsWith('/admin/signup')
  const isBackendAdmin = pathname?.startsWith('/backend/admin')

  useEffect(() => {
    if (isMobile || isAuthRoute || isBackendAdmin) return undefined
    const EDGE_OPEN_PX = 12
    const SAFE_CLOSE_PX = 96

    const handleMove = (event) => {
      const x = event.clientX
      if (x <= EDGE_OPEN_PX) {
        if (!isOpen) openSidebar()
        return
      }
      if (x > SAFE_CLOSE_PX && !isHovering && isOpen) {
        closeSidebar()
      }
    }

    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [
    isMobile,
    isAuthRoute,
    isBackendAdmin,
    isOpen,
    isHovering,
    openSidebar,
    closeSidebar,
  ])

  if (isAuthRoute || isBackendAdmin) {
    return <main className='min-h-screen'>{children}</main>
  }

  return (
    <>
      {isMobile ? <MobileNavbar /> : <Navbar />}
      <div className={`flex pt-32 ${isMobile ? 'mt-5' : ''}`}>
        <Sidebar />
        <main className={`flex-1 transition-all duration-300`}>
          {children}
        </main>
      </div>
    </>
  )
}
