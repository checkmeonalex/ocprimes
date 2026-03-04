'use client'
import Navbar from './Navbar'
import MobileNavbar from './mobile/Navbar'
import Sidebar from './Sidebar'
import AdminMobileHeader from './admin/AdminMobileHeader'
import AddToCartSuccessPopup from './cart/AddToCartSuccessPopup'
import UserPresenceHeartbeat from './presence/UserPresenceHeartbeat'
import { useScreenSize } from '../hooks/useScreenSize'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

const NEXT_NAVIGATION_EXEMPT_PREFIXES = ['/cart', '/wishlist', '/UserBackend/wishlist']

const isNextNavigationExemptPath = (pathname = '') =>
  NEXT_NAVIGATION_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )

export default function ClientLayout({ children, initialAuthUser = null }) {
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
      {!isUserBackendRoute && !isCartRoute && !isCheckoutRoute ? (
        <MobileNavbar initialAuthUser={initialAuthUser} />
      ) : null}
      {!isMobile || isCheckoutFlowRoute ? (
        <Navbar initialAuthUser={initialAuthUser} />
      ) : null}
      <div
        className={`flex ${
          isCheckoutFlowRoute
            ? 'pt-0 sm:pt-16'
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
      <AddToCartSuccessPopup />
    </>
  )
}
