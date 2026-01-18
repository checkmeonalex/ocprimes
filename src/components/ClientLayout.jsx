'use client'
import Navbar from './Navbar'
import MobileNavbar from './mobile/Navbar'
import Sidebar from './Sidebar'
import { useScreenSize } from '../hooks/useScreenSize'
import { usePathname } from 'next/navigation'

export default function ClientLayout({ children }) {
  const { isMobile } = useScreenSize()
  const pathname = usePathname()
  const isAuthRoute =
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/signup') ||
    pathname?.startsWith('/admin/login') ||
    pathname?.startsWith('/admin/signup')
  const isBackendAdmin = pathname?.startsWith('/backend/admin')

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
