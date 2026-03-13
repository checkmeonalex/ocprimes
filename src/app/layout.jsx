// src/app/layout.jsx
import ClientLayout from '../components/ClientLayout'
import './globals.css'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import { SidebarProvider } from '../context/SidebarContext'
import { CartProvider } from '../context/CartContext'
import { AlertProvider } from '../context/AlertContext'
import AlertStack from '../components/alerts/AlertStack'
import { WishlistProvider } from '../context/WishlistContext'
import WishlistSaveModal from '../components/wishlist/WishlistSaveModal'
import { UserLocaleProvider } from '../context/UserLocaleContext'
import { Suspense } from 'react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { createServerSupabaseClient } from '../lib/supabase/server'
import { getCachedTopCategories } from '../lib/catalog/top-categories-server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'OcPrimes',
}

const outfit = localFont({
  src: './fonts/outfit-variable.woff2',
  variable: '--font-outfit',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
})

export default async function RootLayout({ children }) {
  let initialAuthUser = null
  let initialTopCategories = []
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

  return (
    <html lang='en'>
      <body className={outfit.variable}>
        <UserLocaleProvider>
          <AlertProvider>
            <SidebarProvider>
              <CartProvider>
                <WishlistProvider>
                  <Suspense fallback={<main className='min-h-screen'>{children}</main>}>
                    <ClientLayout
                      initialAuthUser={initialAuthUser}
                      initialTopCategories={initialTopCategories}
                    >
                      {children}
                    </ClientLayout>
                  </Suspense>
                  <WishlistSaveModal />
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
