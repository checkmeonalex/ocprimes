// src/app/layout.jsx
import ClientLayout from '../components/ClientLayout'
import './globals.css'
import localFont from 'next/font/local'
import { Instrument_Serif, Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SidebarProvider } from '../context/SidebarContext'
import { CartProvider } from '../context/CartContext'
import { AlertProvider } from '../context/AlertContext'
import AlertStack from '../components/alerts/AlertStack'
import { WishlistProvider } from '../context/WishlistContext'
import WishlistSaveModal from '../components/wishlist/WishlistSaveModal'
import { UserLocaleProvider } from '../context/UserLocaleContext'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { createServerSupabaseClient } from '../lib/supabase/server'
import { getCachedTopCategories } from '../lib/catalog/top-categories-server'
import { cookies } from 'next/headers'
import { ADMIN_THEME_COOKIE } from '../context/AdminThemeContext'
import { BRAND_NAME, BRAND_SEARCH_DESCRIPTION, BRAND_TAGLINE } from '../lib/brand'
import { SITE_URL } from '../lib/seo'
import PwaRegistration from '../components/pwa/PwaRegistration'
import { VendorPageProvider } from '../context/VendorPageContext'

export const dynamic = 'force-dynamic'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND_NAME} | ${BRAND_TAGLINE}`,
    template: `%s | ${BRAND_NAME}`,
  },
  description: BRAND_SEARCH_DESCRIPTION,
  applicationName: BRAND_NAME,
  manifest: '/manifest.webmanifest',
  alternates: {
    canonical: '/',
  },
  formatDetection: {
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
      { url: '/apple-icon.png', type: 'image/png', sizes: '180x180' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: BRAND_NAME,
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    title: `${BRAND_NAME} | ${BRAND_TAGLINE}`,
    description: BRAND_SEARCH_DESCRIPTION,
    siteName: BRAND_NAME,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND_NAME} | ${BRAND_TAGLINE}`,
    description: BRAND_SEARCH_DESCRIPTION,
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#2f2019',
}

const outfit = localFont({
  src: './fonts/outfit-variable.woff2',
  variable: '--font-outfit',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
})

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

export default async function RootLayout({ children }) {
  let initialAuthUser = null
  let initialTopCategories = []
  let initialAdminTheme = 'light'

  try {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase.auth.getUser()
    initialAuthUser = data?.user ?? null
  } catch {
    initialAuthUser = null
  }
  try {
    initialTopCategories = await getCachedTopCategories()
  } catch {
    initialTopCategories = []
  }
  try {
    const cookieStore = await cookies()
    const themeCookie = cookieStore.get(ADMIN_THEME_COOKIE)
    if (themeCookie?.value === 'dark') initialAdminTheme = 'dark'
  } catch {}

  return (
    <html lang='en' className={`${outfit.variable} ${instrumentSerif.variable} ${geist.variable} ${geistMono.variable}`}>
      <body>
        <PwaRegistration />
        <UserLocaleProvider>
          <AlertProvider>
            <SidebarProvider>
              <CartProvider>
                <WishlistProvider>
                  <VendorPageProvider>
                    <ClientLayout
                      initialAuthUser={initialAuthUser}
                      initialTopCategories={initialTopCategories}
                      initialAdminTheme={initialAdminTheme}
                    >
                      {children}
                    </ClientLayout>
                    <WishlistSaveModal />
                  </VendorPageProvider>
                </WishlistProvider>
              </CartProvider>
            </SidebarProvider>
            <AlertStack />
            <Analytics />
            <SpeedInsights />
          </AlertProvider>
        </UserLocaleProvider>
      </body>
    </html>
  )
}
