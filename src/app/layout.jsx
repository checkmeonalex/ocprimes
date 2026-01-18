// src/app/layout.jsx
import ClientLayout from '../components/ClientLayout'
import './globals.css'
import { SidebarProvider } from '../context/SidebarContext'
import { CartProvider } from '../context/CartContext'

export const metadata = {
  title: 'OcPrimes',
}

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <body>
        <SidebarProvider>
          <CartProvider>
            <ClientLayout>{children}</ClientLayout>
          </CartProvider>
        </SidebarProvider>
      </body>
    </html>
  )
}








