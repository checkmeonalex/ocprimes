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

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'OcPrimes',
}

export default async function RootLayout({ children }) {
  let initialAuthUser = null
  try {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase.auth.getUser()
    initialAuthUser = data?.user ?? null
  } catch {
    initialAuthUser = null
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
                    <ClientLayout initialAuthUser={initialAuthUser}>{children}</ClientLayout>
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

