// src/app/layout.jsx
import ClientLayout from '../components/ClientLayout'
import './globals.css'
import { SidebarProvider } from '../context/SidebarContext'
import { CartProvider } from '../context/CartContext'
import { AlertProvider } from '../context/AlertContext'
import AlertStack from '../components/alerts/AlertStack'
import { WishlistProvider } from '../context/WishlistContext'
import WishlistSaveModal from '../components/wishlist/WishlistSaveModal'

export const metadata = {
  title: 'OcPrimes',
}

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <body>
        <AlertProvider>
          <SidebarProvider>
            <CartProvider>
              <WishlistProvider>
                <ClientLayout>{children}</ClientLayout>
                <WishlistSaveModal />
              </WishlistProvider>
            </CartProvider>
          </SidebarProvider>
          <AlertStack />
        </AlertProvider>
      </body>
    </html>
  )
}






