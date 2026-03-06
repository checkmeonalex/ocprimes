// src/app/layout.jsx
import ClientLayout from '../components/ClientLayout'
import './globals.css'
import { SidebarProvider } from '../context/SidebarContext'
import { CartProvider } from '../context/CartContext'
import { AlertProvider } from '../context/AlertContext'
import AlertStack from '../components/alerts/AlertStack'
import { WishlistProvider } from '../context/WishlistContext'
import WishlistSaveModal from '../components/wishlist/WishlistSaveModal'
import { UserLocaleProvider } from '../context/UserLocaleContext'
import { Suspense } from 'react'
import { createServerSupabaseClient } from '../lib/supabase/server'
import { getCachedTopCategories } from '../lib/catalog/top-categories-server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'OcPrimes',
}

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
      <body>
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
          </AlertProvider>
        </UserLocaleProvider>
      </body>
    </html>
  )
}
