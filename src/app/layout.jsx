// src/app/layout.jsx
import ClientLayout from '../components/ClientLayout'
import './globals.css'
import { SidebarProvider } from '../context/SidebarContext'

export const metadata = {
  title: 'OcPrimes',
}

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <body>
        <SidebarProvider>
          <ClientLayout>{children}</ClientLayout>
        </SidebarProvider>
      </body>
    </html>
  )
}









