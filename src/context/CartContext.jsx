'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuthUser } from '@/lib/auth/useAuthUser'

const CartContext = createContext(null)
const STORAGE_KEY = 'ocprimes_cart_items'

const buildKey = (item) => {
  const variation = item.selectedVariationId || 'default'
  const color = item.selectedColor || 'default'
  const size = item.selectedSize || 'default'
  return `${item.id}-${variation}-${color}-${size}`
}

const normalizeItems = (items) => {
  if (!Array.isArray(items)) return []
  const map = new Map()
  items.forEach((item) => {
    if (!item) return
    const key = item.key || buildKey(item)
    const existing = map.get(key)
    if (existing) {
      map.set(key, {
        ...existing,
        quantity: existing.quantity + (item.quantity || 0),
      })
    } else {
      map.set(key, { ...item, key })
    }
  })
  return Array.from(map.values())
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [isReady, setIsReady] = useState(false)
  const [isServerReady, setIsServerReady] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const { user, isLoading } = useAuthUser()
  const itemsRef = useRef(items)
  const lastUserIdRef = useRef(null)
  const pendingSyncRef = useRef(null)
  const syncInFlightRef = useRef(false)
  const refreshInFlightRef = useRef(false)

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            setItems(normalizeItems(parsed))
          } else {
            setItems([])
          }
        } else {
          setItems([])
        }
      } catch {
        setItems([])
      } finally {
        setIsReady(true)
        setIsServerReady(false)
      }
      return
    }

    if (lastUserIdRef.current === user.id) return
    lastUserIdRef.current = user.id

    const loadServerCart = async () => {
      setIsServerReady(false)
      setIsReady(true)
      let localItems = []
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            localItems = normalizeItems(parsed)
          }
        }
      } catch {
        localItems = []
      }

      try {
        if (localItems.length > 0) {
          const response = await fetch('/api/cart/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: localItems }),
          })
          if (response.ok) {
            const data = await response.json()
            setItems(normalizeItems(data?.items))
          } else {
            setItems([])
          }
        } else {
          const response = await fetch('/api/cart')
          if (response.ok) {
            const data = await response.json()
            setItems(normalizeItems(data?.items))
          } else {
            setItems([])
          }
        }
      } catch {
        setItems([])
      } finally {
        try {
          window.localStorage.removeItem(STORAGE_KEY)
        } catch {
          // Ignore storage errors.
        }
        setIsServerReady(true)
      }
    }

    void loadServerCart()
  }, [isLoading, user])

  useEffect(() => {
    if (!isReady || user) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Ignore storage errors.
    }
  }, [items, isReady, user])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      lastUserIdRef.current = null
    }
  }, [isLoading, user])

  const addItemToList = (list, product, quantity) => {
    const key = buildKey(product)
    const existing = list.find((entry) => entry.key === key)
    if (existing) {
      return list.map((entry) =>
        entry.key === key
          ? { ...entry, quantity: entry.quantity + quantity }
          : entry
      )
    }
    return [
      ...list,
      {
        key,
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.image,
        selectedVariationId: product.selectedVariationId,
        selectedVariationLabel: product.selectedVariationLabel,
        selectedColor: product.selectedColor,
        selectedSize: product.selectedSize,
        quantity,
      },
    ]
  }

  const updateQuantityInList = (list, key, quantity) =>
    list
      .map((entry) =>
        entry.key === key ? { ...entry, quantity } : entry
      )
      .filter((entry) => entry.quantity > 0)

  const removeItemFromList = (list, key) => list.filter((entry) => entry.key !== key)

  const syncCartToServer = async (nextItems) => {
    if (syncInFlightRef.current) return
    syncInFlightRef.current = true
    setIsUpdating(true)
    try {
      const response = await fetch('/api/cart/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: nextItems }),
      })
      if (!response.ok) {
        throw new Error('Unable to update cart.')
      }
      const refreshed = await fetch('/api/cart')
      if (refreshed.ok) {
        const data = await refreshed.json()
        setItems(normalizeItems(data?.items))
      } else {
        setItems(nextItems)
      }
    } catch {
      setItems(nextItems)
    } finally {
      syncInFlightRef.current = false
      setIsUpdating(false)
    }
  }

  const refreshCartFromServer = async () => {
    if (refreshInFlightRef.current || !user) return
    refreshInFlightRef.current = true
    try {
      const response = await fetch('/api/cart')
      if (response.ok) {
        const data = await response.json()
        setItems(normalizeItems(data?.items))
      }
    } finally {
      refreshInFlightRef.current = false
    }
  }

  const addItem = (product, quantity = 1) => {
    if (!product) return
    const nextItems = addItemToList(itemsRef.current, product, quantity)
    setItems(nextItems)
    if (user && isServerReady) {
      void syncCartToServer(nextItems)
    } else if (user) {
      pendingSyncRef.current = nextItems
    }
  }

  const updateQuantity = (key, quantity) => {
    const nextItems = updateQuantityInList(itemsRef.current, key, quantity)
    setItems(nextItems)
    if (user && isServerReady) {
      void syncCartToServer(nextItems)
    } else if (user) {
      pendingSyncRef.current = nextItems
    }
  }

  const removeItem = (key) => {
    const nextItems = removeItemFromList(itemsRef.current, key)
    setItems(nextItems)
    if (user && isServerReady) {
      void syncCartToServer(nextItems)
    } else if (user) {
      pendingSyncRef.current = nextItems
    }
  }

  const clearCart = () => {
    setItems([])
    if (user && isServerReady) {
      void syncCartToServer([])
    } else if (user) {
      pendingSyncRef.current = []
    }
  }

  useEffect(() => {
    if (!user || !isServerReady) return
    if (pendingSyncRef.current) {
      const queued = pendingSyncRef.current
      pendingSyncRef.current = null
      void syncCartToServer(queued)
    }
  }, [user, isServerReady])

  useEffect(() => {
    if (!user || !isServerReady) return
    const handleFocus = () => {
      void refreshCartFromServer()
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshCartFromServer()
      }
    }
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [user, isServerReady])

  const summary = useMemo(() => {
    const subtotal = items.reduce(
      (sum, entry) => sum + entry.price * entry.quantity,
      0
    )
    const originalTotal = items.reduce((sum, entry) => {
      const original = entry.originalPrice || entry.price
      return sum + original * entry.quantity
    }, 0)
    const savings = Math.max(0, originalTotal - subtotal)
    const itemCount = items.reduce((sum, entry) => sum + entry.quantity, 0)

    return { subtotal, originalTotal, savings, itemCount }
  }, [items])

  const value = useMemo(
    () => ({
      items,
      isReady,
      isServerReady,
      isUpdating,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      summary,
    }),
    [items, isReady, isServerReady, isUpdating, summary]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
