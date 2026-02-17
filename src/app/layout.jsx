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

export const metadata = {
  title: 'OcPrimes',
}

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <body>
        <UserLocaleProvider>
          <AlertProvider>
            <SidebarProvider>
              <CartProvider>
                <WishlistProvider>
                  <Suspense fallback={<main className='min-h-screen'>{children}</main>}>
                    <ClientLayout>{children}</ClientLayout>
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



