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
  const { user, isLoading } = useAuthUser()
  const itemsRef = useRef(items)
  const lastUserIdRef = useRef(null)
  const lastSyncedRef = useRef('')

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          setItems(normalizeItems(parsed))
        }
      }
    } catch {
      setItems([])
    } finally {
      setIsReady(true)
    }
  }, [])

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
      setIsServerReady(false)
      return
    }

    if (lastUserIdRef.current === user.id) return
    lastUserIdRef.current = user.id

    const syncOnLogin = async () => {
      setIsServerReady(false)
      try {
        const localItems = itemsRef.current
        if (localItems.length > 0) {
          const response = await fetch('/api/cart/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: localItems }),
          })
          if (response.ok) {
            const data = await response.json()
            setItems(normalizeItems(data?.items))
            window.localStorage.removeItem(STORAGE_KEY)
          }
        } else {
          const response = await fetch('/api/cart')
          if (response.ok) {
            const data = await response.json()
            setItems(normalizeItems(data?.items))
          }
        }
      } catch {
        // Keep local cart if sync fails.
      } finally {
        setIsServerReady(true)
      }
    }

    void syncOnLogin()
  }, [isLoading, user])

  useEffect(() => {
    if (!user || !isReady || !isServerReady) return
    const signature = JSON.stringify(
      items
        .map((item) => ({
          key: item.key,
          quantity: item.quantity,
          price: item.price,
          originalPrice: item.originalPrice ?? null,
          selectedColor: item.selectedColor ?? null,
          selectedSize: item.selectedSize ?? null,
        }))
        .sort((a, b) => (a.key > b.key ? 1 : -1))
    )

    if (signature === lastSyncedRef.current) return
    lastSyncedRef.current = signature

    const persistCart = async () => {
      try {
        await fetch('/api/cart/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        })
      } catch {
        // Ignore network errors; we'll retry on next change.
      }
    }

    void persistCart()
  }, [items, isReady, isServerReady, user])

  const addItem = (product, quantity = 1) => {
    if (!product) return
    const key = buildKey(product)
    setItems((prev) => {
      const existing = prev.find((entry) => entry.key === key)
      if (existing) {
        return prev.map((entry) =>
          entry.key === key
            ? { ...entry, quantity: entry.quantity + quantity }
            : entry
        )
      }
      return [
        ...prev,
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
    })
  }

  const updateQuantity = (key, quantity) => {
    setItems((prev) =>
      prev
        .map((entry) =>
          entry.key === key ? { ...entry, quantity } : entry
        )
        .filter((entry) => entry.quantity > 0)
    )
  }

  const removeItem = (key) => {
    setItems((prev) => prev.filter((entry) => entry.key !== key))
  }

  const clearCart = () => setItems([])

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
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      summary,
    }),
    [items, isReady, summary]
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
