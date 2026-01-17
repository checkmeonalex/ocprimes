'use client'
import Navbar from './Navbar'
import MobileNavbar from './mobile/Navbar'
import Sidebar from './Sidebar'
import { useScreenSize } from '../hooks/useScreenSize'
import SmoothScrollProvider from './SmoothScrollProvider'

export default function ClientLayout({ children }) {
  const { isMobile } = useScreenSize()

  return (
    <>
      <SmoothScrollProvider />
      {isMobile ? <MobileNavbar /> : <Navbar />}
      <div className={`flex pt-32 ${isMobile ? 'mt-5' : ''}`}>
        <Sidebar />
        <main className={`flex-1 transition-all duration-300`}>
          {children}
        </main>
      </div>
    </>
  )
}
