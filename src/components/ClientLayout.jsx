'use client'
import Navbar from './Navbar'
import MobileNavbar from './mobile/Navbar'
import ScrollHistoryRestoration from './ScrollHistoryRestoration'
import Sidebar from './Sidebar'
import Footer from './Footer'
import AdminMobileHeader from './admin/AdminMobileHeader'
import AddToCartSuccessPopup from './cart/AddToCartSuccessPopup'
import ProductNavigationOverlay from './product/ProductNavigationOverlay'
import UserPresenceHeartbeat from './presence/UserPresenceHeartbeat'
import { useScreenSize } from '../hooks/useScreenSize'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useVendorPage } from '../context/VendorPageContext'

const NEXT_NAVIGATION_EXEMPT_PREFIXES = ['/cart', '/wishlist', '/UserBackend/wishlist', '/account/wishlist']

const isNextNavigationExemptPath = (pathname = '') =>
  NEXT_NAVIGATION_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )

export default function ClientLayout({
  children,
  initialAuthUser = null,
  initialTopCategories = [],
}) {
  const { isMobile } = useScreenSize()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isVendorPage } = useVendorPage()
  const isEmbedPreview = searchParams?.get('embed_preview') === '1'
  const isAuthRoute =
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/signup') ||
    pathname?.startsWith('/sellersignup') ||
    pathname?.startsWith('/forgot-password') ||
    pathname?.startsWith('/reset-password') ||
    pathname?.startsWith('/admin/login') ||
    pathname?.startsWith('/admin/signup') ||
    pathname?.startsWith('/vendor/login') ||
    pathname?.startsWith('/vendor/signup')
  const isBackendAdmin = pathname?.startsWith('/backend/admin') || pathname?.startsWith('/admin/')
  const isUserBackendRoute = pathname?.startsWith('/UserBackend') || pathname === '/account' || pathname?.startsWith('/account/')
  const isCartRoute = pathname?.startsWith('/cart')
  const isCheckoutRoute = pathname?.startsWith('/checkout')
  const isProductRoute = pathname?.startsWith('/product/')
  const isCheckoutFlowRoute = isCartRoute || isCheckoutRoute
  const showStorefrontFooter =
    !isUserBackendRoute &&
    !isCartRoute &&
    !isCheckoutRoute &&
    !isAuthRoute &&
    !isBackendAdmin &&
    !isEmbedPreview

  useEffect(() => {
    const handleDocumentClickCapture = (event) => {
      if (event.defaultPrevented) return
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target
      if (!(target instanceof Element)) return

      const anchor = target.closest('a')
      if (!anchor) return
      if (anchor.dataset.nextNavigation === 'true') return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return

      const rawHref = anchor.getAttribute('href')
      if (!rawHref) return
      if (
        rawHref.startsWith('#') ||
        rawHref.startsWith('mailto:') ||
        rawHref.startsWith('tel:') ||
        rawHref.startsWith('javascript:')
      ) {
        return
      }

      let url
      try {
        url = new URL(anchor.href, window.location.href)
      } catch {
        return
      }

      if (url.origin !== window.location.origin) return
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search &&
        url.hash
      ) {
        return
      }
      if (isNextNavigationExemptPath(url.pathname)) return

      event.preventDefault()
      window.location.assign(url.toString())
    }

    document.addEventListener('click', handleDocumentClickCapture, true)
    return () => {
      document.removeEventListener('click', handleDocumentClickCapture, true)
    }
  }, [])

  if (isAuthRoute || isBackendAdmin) {
    return (
      <>
        <UserPresenceHeartbeat />
        {isBackendAdmin ? <AdminMobileHeader /> : null}
        <main
          className={`min-h-screen ${
            isBackendAdmin ? 'pt-16 lg:pt-0' : ''
          }`}
        >
          {children}
        </main>
        <AddToCartSuccessPopup />
      </>
    )
  }

  if (isEmbedPreview) {
    return (
      <>
        <UserPresenceHeartbeat />
        <main className='min-h-screen'>{children}</main>
        <AddToCartSuccessPopup />
      </>
    )
  }

  return (
    <>
      <UserPresenceHeartbeat />
      <ScrollHistoryRestoration />

      {/* Main Alxora navbar — hidden on vendor store pages */}
      {!isVendorPage && !isUserBackendRoute && !isCartRoute && !isCheckoutRoute ? (
        <MobileNavbar
          initialAuthUser={initialAuthUser}
          initialTopCategories={initialTopCategories}
        />
      ) : null}
      {!isVendorPage && (!isMobile || isCheckoutFlowRoute) ? (
        <Navbar
          initialAuthUser={initialAuthUser}
          initialTopCategories={initialTopCategories}
        />
      ) : null}

      <div
        className={`flex ${
          isCheckoutFlowRoute
            ? 'pt-0 sm:pt-16'
            : isUserBackendRoute
              ? 'pt-0 lg:pt-[106px]'
            : isVendorPage
              ? 'pt-0'
            : isProductRoute
              ? 'pt-0 lg:pt-14 xl:pt-16'
              : 'pt-24 lg:pt-[106px]'
        }`}
      >
        <Sidebar />
        <main className='min-h-[calc(100vh-6rem)] flex-1 transition-all duration-300 lg:min-h-[calc(100vh-6.625rem)]'>
          {children}
        </main>
      </div>
      <ProductNavigationOverlay />
      {showStorefrontFooter ? <Footer showBackToTop={!isProductRoute} /> : null}
      <AddToCartSuccessPopup />
    </>
  )
}
