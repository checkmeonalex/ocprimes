'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const SidebarContext = createContext()

export function SidebarProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Only open by default on desktop
    const isMobile = window.innerWidth < 1024
    setIsOpen(!isMobile)
    setIsHydrated(true)
  }, [])

  const toggleSidebar = () => setIsOpen(prev => !prev)

  return (
    <SidebarContext.Provider value={{ isOpen, toggleSidebar, isHydrated }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

