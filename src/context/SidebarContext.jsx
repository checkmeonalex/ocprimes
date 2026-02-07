'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const SidebarContext = createContext()

export function SidebarProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  useEffect(() => {
    setIsOpen(false)
    setIsHydrated(true)
  }, [])

  const toggleSidebar = useCallback(() => setIsOpen((prev) => !prev), [])
  const openSidebar = useCallback(() => setIsOpen(true), [])
  const closeSidebar = useCallback(() => setIsOpen(false), [])

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        toggleSidebar,
        openSidebar,
        closeSidebar,
        isHydrated,
        isHovering,
        setIsHovering,
      }}
    >
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
