'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

type VendorPageCtx = {
  isVendorPage: boolean
  setIsVendorPage: (v: boolean) => void
}

const VendorPageContext = createContext<VendorPageCtx>({
  isVendorPage: false,
  setIsVendorPage: () => {},
})

export function VendorPageProvider({ children }: { children: ReactNode }) {
  const [isVendorPage, setIsVendorPage] = useState(false)
  return (
    <VendorPageContext.Provider value={{ isVendorPage, setIsVendorPage }}>
      {children}
    </VendorPageContext.Provider>
  )
}

export function useVendorPage() {
  return useContext(VendorPageContext)
}
