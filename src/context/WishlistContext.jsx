'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const WishlistContext = createContext(null)

export function WishlistProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState('save')
  const [product, setProduct] = useState(null)
  const [selectedListId, setSelectedListId] = useState('')
  const [recentlySavedProductIds, setRecentlySavedProductIds] = useState({})
  const [wishlistedProductIds, setWishlistedProductIds] = useState({})
  const [isWishlistStatusLoaded, setIsWishlistStatusLoaded] = useState(false)
  const saveTimersRef = useRef(new Map())

  const openSaveModal = useCallback((nextProduct) => {
    setProduct(nextProduct || null)
    setView('save')
    setIsOpen(true)
  }, [])

  const closeSaveModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  const openAddSheet = useCallback((nextProduct, listId) => {
    setProduct(nextProduct || null)
    setSelectedListId(listId || '')
    setView('add')
    setIsOpen(true)
  }, [])

  const markProductSaved = useCallback((productId, durationMs = 6000) => {
    const key = String(productId || '').trim()
    if (!key) return
    setWishlistedProductIds((prev) => ({ ...prev, [key]: true }))
    setRecentlySavedProductIds((prev) => ({ ...prev, [key]: true }))
    const existing = saveTimersRef.current.get(key)
    if (existing) {
      clearTimeout(existing)
    }
    const timeoutId = setTimeout(() => {
      setRecentlySavedProductIds((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      saveTimersRef.current.delete(key)
    }, durationMs)
    saveTimersRef.current.set(key, timeoutId)
  }, [])

  const isRecentlySaved = useCallback(
    (productId) => {
      const key = String(productId || '').trim()
      if (!key) return false
      return Boolean(recentlySavedProductIds[key] || wishlistedProductIds[key])
    },
    [recentlySavedProductIds, wishlistedProductIds],
  )

  const isWishlisted = useCallback(
    (productId) => Boolean(wishlistedProductIds[String(productId || '').trim()]),
    [wishlistedProductIds],
  )

  const refreshWishlistStatus = useCallback(async () => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/backend/admin')) {
      setIsWishlistStatusLoaded(true)
      return
    }
    try {
      const response = await fetch('/api/wishlist/items/status', { method: 'GET' })
      if (!response.ok) {
        if (response.status === 401) {
          setWishlistedProductIds({})
          setIsWishlistStatusLoaded(true)
          return
        }
        throw new Error('Unable to refresh wishlist status.')
      }
      const payload = await response.json().catch(() => null)
      const next = {}
      const ids = Array.isArray(payload?.productIds) ? payload.productIds : []
      ids.forEach((id) => {
        const key = String(id || '').trim()
        if (key) next[key] = true
      })
      setWishlistedProductIds(next)
      setIsWishlistStatusLoaded(true)
    } catch (_error) {
      setIsWishlistStatusLoaded(true)
    }
  }, [])

  useEffect(() => {
    refreshWishlistStatus()
  }, [refreshWishlistStatus])

  useEffect(() => {
    return () => {
      saveTimersRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
      saveTimersRef.current.clear()
    }
  }, [])

  const value = useMemo(
    () => ({
      isOpen,
      view,
      product,
      openSaveModal,
      openAddSheet,
      closeSaveModal,
      selectedListId,
      markProductSaved,
      isRecentlySaved,
      isWishlisted,
      isWishlistStatusLoaded,
      refreshWishlistStatus,
    }),
    [
      isOpen,
      view,
      product,
      openSaveModal,
      openAddSheet,
      closeSaveModal,
      selectedListId,
      markProductSaved,
      isRecentlySaved,
      isWishlisted,
      isWishlistStatusLoaded,
      refreshWishlistStatus,
    ],
  )

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider')
  }
  return context
}
