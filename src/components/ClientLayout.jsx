'use client'
import Navbar from './Navbar'
import MobileNavbar from './mobile/Navbar'
import Sidebar from './Sidebar'
import AdminMobileHeader from './admin/AdminMobileHeader'
import { useScreenSize } from '../hooks/useScreenSize'
import { usePathname, useSearchParams } from 'next/navigation'

export default function ClientLayout({ children }) {
  const { isMobile } = useScreenSize()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isEmbedPreview = searchParams?.get('embed_preview') === '1'
  const isAuthRoute =
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/signup') ||
    pathname?.startsWith('/admin/login') ||
    pathname?.startsWith('/admin/signup') ||
    pathname?.startsWith('/vendor/login') ||
    pathname?.startsWith('/vendor/signup')
  const isBackendAdmin = pathname?.startsWith('/backend/admin')
  const isUserBackendRoute = pathname?.startsWith('/UserBackend')
  const isCartRoute = pathname?.startsWith('/cart')
  const isCheckoutRoute = pathname?.startsWith('/checkout')
  const isCheckoutFlowRoute = isCartRoute || isCheckoutRoute

  if (isAuthRoute || isBackendAdmin) {
    return (
      <>
        {isBackendAdmin ? <AdminMobileHeader /> : null}
        <main
          className={`min-h-screen ${
            isBackendAdmin ? 'pt-16 lg:pt-0' : ''
          }`}
        >
          {children}
        </main>
      </>
    )
  }

  if (isEmbedPreview) {
    return <main className='min-h-screen'>{children}</main>
  }

  return (
    <>
      {!isUserBackendRoute && !isCartRoute && !isCheckoutRoute ? <MobileNavbar /> : null}
      {!isMobile ? <Navbar /> : null}
      <div
        className={`flex ${
          isCheckoutFlowRoute
            ? 'pt-0 lg:pt-16'
            : isUserBackendRoute
              ? 'pt-0 lg:pt-[106px]'
            : 'pt-24 lg:pt-[106px]'
        }`}
      >
        <Sidebar />
        <main className={`flex-1 transition-all duration-300`}>
          {children}
        </main>
      </div>
    </>
  )
}
