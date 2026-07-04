'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

type VendorPageCtx = {
  isVendorPage: boolean
  setIsVendorPage: (v: boolean) => void
  isMainNavVisible: boolean
  setIsMainNavVisible: (v: boolean) => void
}

const VendorPageContext = createContext<VendorPageCtx>({
  isVendorPage: false,
  setIsVendorPage: () => {},
  isMainNavVisible: true,
  setIsMainNavVisible: () => {},
})

export function VendorPageProvider({ children }: { children: ReactNode }) {
  const [isVendorPage, setIsVendorPage] = useState(false)
  const [isMainNavVisible, setIsMainNavVisible] = useState(true)
  return (
    <VendorPageContext.Provider
      value={{ isVendorPage, setIsVendorPage, isMainNavVisible, setIsMainNavVisible }}
    >
      {children}
    </VendorPageContext.Provider>
  )
}

export function useVendorPage() {
  return useContext(VendorPageContext)
}
