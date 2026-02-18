'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuthUser } from '@/lib/auth/useAuthUser'
import { buildKey, normalizeItem } from '@/lib/cart/utils'
import {
  calculateOrderProtectionFee,
  isDigitalProductLike,
  normalizeOrderProtectionConfig,
  ORDER_PROTECTION_DEFAULTS,
} from '@/lib/order-protection/config'

const CartContext = createContext(null)
const STORAGE_KEY = 'ocprimes_cart_items'
const RETRY_DELAYS = [200, 500, 1000]
const BACKGROUND_REFRESH_COOLDOWN_MS = 10000

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
      return
    }
    map.set(key, { ...item, key })
  })
  return Array.from(map.values())
}

const normalizeServerItems = (items) => normalizeItems(items)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [isReady, setIsReady] = useState(false)
  const [isServerReady, setIsServerReady] = useState(false)
  const [cartVersion, setCartVersion] = useState(null)
  const [syncRevision, setSyncRevision] = useState(0)
  const [orderProtectionConfig, setOrderProtectionConfig] = useState(ORDER_PROTECTION_DEFAULTS)
  const { user, isLoading } = useAuthUser()

  const itemsRef = useRef(items)
  const cartVersionRef = useRef(cartVersion)
  const lastUserIdRef = useRef(null)
  const metaRef = useRef(new Map())
  const intentRef = useRef(new Map())
  const pendingKeysRef = useRef(new Set())
  const syncInFlightRef = useRef(false)
  const refreshInFlightRef = useRef(false)
  const lastRefreshAtRef = useRef(0)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    cartVersionRef.current = cartVersion
  }, [cartVersion])

  const notifySyncStateChanged = () => {
    setSyncRevision((value) => value + 1)
  }

  const applyMetaToItems = (baseItems) =>
    baseItems.map((entry) => {
      const meta = metaRef.current.get(entry.key)
      return {
        ...entry,
        isSyncing: Boolean(meta?.isSyncing),
        syncError: meta?.syncError || null,
      }
    })

  const setItemsState = (nextItems) => {
    const normalized = normalizeItems(nextItems)
    const decorated = applyMetaToItems(normalized)
    setItems(decorated)
    itemsRef.current = decorated
  }

  const setMeta = (key, patch) => {
    const existing = metaRef.current.get(key) || { isSyncing: false, syncError: null }
    const next = { ...existing, ...patch }
    metaRef.current.set(key, next)
    setItemsState(itemsRef.current)
    notifySyncStateChanged()
  }

  const clearMetaForMissingItems = () => {
    const activeKeys = new Set((itemsRef.current || []).map((item) => item.key))
    Array.from(metaRef.current.keys()).forEach((key) => {
      if (activeKeys.has(key)) return
      if (pendingKeysRef.current.has(key)) return
      metaRef.current.delete(key)
    })
  }

  const overlayPendingIntents = (baseItems) => {
    const merged = [...baseItems]
    for (const [key, intent] of intentRef.current.entries()) {
      const quantity = Math.max(0, Number(intent?.quantity || 0))
      const idx = merged.findIndex((item) => item.key === key)

      if (quantity <= 0) {
        if (idx >= 0) merged.splice(idx, 1)
        continue
      }

      if (idx >= 0) {
        merged[idx] = {
          ...merged[idx],
          ...intent.item,
          quantity,
          key,
        }
      } else {
        merged.push({
          ...intent.item,
          quantity,
          key,
        })
      }
    }
    return merged
  }

  const applyServerSnapshot = (serverItems) => {
    const normalized = normalizeServerItems(serverItems)
    const withIntents = overlayPendingIntents(normalized)
    setItemsState(withIntents)
    clearMetaForMissingItems()
  }

  const optimisticSetQuantity = (item, quantity) => {
    const key = item.key
    const current = [...(itemsRef.current || [])]
    const next = []
    let found = false

    current.forEach((entry) => {
      if (entry.key !== key) {
        next.push(entry)
        return
      }
      found = true
      if (quantity > 0) {
        next.push({
          ...entry,
          ...item,
          quantity,
          key,
        })
      }
    })

    if (!found && quantity > 0) {
      next.push({
        ...item,
        quantity,
        key,
      })
    }

    setItemsState(next)
  }

  const queueIntent = (item, quantity) => {
    intentRef.current.set(item.key, {
      item,
      quantity: Math.max(0, Number(quantity || 0)),
    })
    pendingKeysRef.current.add(item.key)
    notifySyncStateChanged()
  }

  const markIntentAsSynced = (key, syncedQty) => {
    const currentIntent = intentRef.current.get(key)
    if (!currentIntent) {
      pendingKeysRef.current.delete(key)
      notifySyncStateChanged()
      return
    }

    if (Number(currentIntent.quantity) === Number(syncedQty)) {
      intentRef.current.delete(key)
      pendingKeysRef.current.delete(key)
      const meta = metaRef.current.get(key)
      if (meta) {
        metaRef.current.set(key, { ...meta, isSyncing: false, syncError: null })
      }
      notifySyncStateChanged()
    }
  }

  const failIntent = (key) => {
    pendingKeysRef.current.delete(key)
    const meta = metaRef.current.get(key) || { isSyncing: false, syncError: null }
    metaRef.current.set(key, {
      ...meta,
      isSyncing: false,
      syncError: "Couldn't update cart. Tap to retry.",
    })
    setItemsState(itemsRef.current)
    notifySyncStateChanged()
  }

  const flushQueue = async () => {
    if (!user || !isServerReady) return
    if (syncInFlightRef.current) return

    syncInFlightRef.current = true
    notifySyncStateChanged()

    try {
      while (pendingKeysRef.current.size > 0) {
        const key = pendingKeysRef.current.values().next().value
        if (!key) break

        const intent = intentRef.current.get(key)
        if (!intent?.item) {
          pendingKeysRef.current.delete(key)
          notifySyncStateChanged()
          continue
        }

        const desiredQty = Math.max(0, Number(intent.quantity || 0))
        const payload = {
          id: intent.item.id,
          name: intent.item.name,
          slug: intent.item.slug,
          price: intent.item.price,
          originalPrice: intent.item.originalPrice,
          image: intent.item.image,
          selectedVariationId: intent.item.selectedVariationId,
          selectedVariationLabel: intent.item.selectedVariationLabel,
          selectedColor: intent.item.selectedColor,
          selectedSize: intent.item.selectedSize,
          productType: intent.item.productType,
          isDigital: intent.item.isDigital,
          isProtected: intent.item.isProtected,
          quantity: desiredQty,
        }

        let success = false

        for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt += 1) {
          let response
          try {
            response = await fetch('/api/cart/items', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'If-Match': String(cartVersionRef.current ?? 1),
                'Idempotency-Key': crypto.randomUUID(),
              },
              body: JSON.stringify(payload),
            })
          } catch {
            response = null
          }

          if (!response) {
            if (attempt < RETRY_DELAYS.length) {
              await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]))
              continue
            }
            break
          }

          if (response.status === 409) {
            const data = await response.json().catch(() => null)
            if (data?.cartVersion) {
              setCartVersion(data.cartVersion)
            }
            if (Array.isArray(data?.items)) {
              applyServerSnapshot(data.items)
            }
            if (attempt < RETRY_DELAYS.length) {
              await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]))
              continue
            }
            break
          }

          if (response.status === 429 || response.status >= 500) {
            if (attempt < RETRY_DELAYS.length) {
              await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]))
              continue
            }
            break
          }

          if (!response.ok) {
            break
          }

          const data = await response.json().catch(() => null)
          if (data?.cartVersion) {
            setCartVersion(data.cartVersion)
          }
          if (Array.isArray(data?.items)) {
            applyServerSnapshot(data.items)
          }
          setMeta(key, { isSyncing: false, syncError: null })
          markIntentAsSynced(key, desiredQty)
          success = true
          break
        }

        if (!success) {
          failIntent(key)
        }
      }
    } finally {
      syncInFlightRef.current = false
      notifySyncStateChanged()
    }
  }

  const refreshCartFromServer = async () => {
    if (!user || !isServerReady) return
    if (refreshInFlightRef.current || syncInFlightRef.current) return

    const now = Date.now()
    if (now - lastRefreshAtRef.current < BACKGROUND_REFRESH_COOLDOWN_MS) return

    refreshInFlightRef.current = true
    try {
      const response = await fetch('/api/cart')
      if (!response.ok) return
      const data = await response.json().catch(() => null)
      if (data?.cartVersion !== null && data?.cartVersion !== undefined) {
        setCartVersion(data.cartVersion)
      }
      if (Array.isArray(data?.items)) {
        applyServerSnapshot(data.items)
      }
      lastRefreshAtRef.current = Date.now()
    } finally {
      refreshInFlightRef.current = false
    }
  }

  useEffect(() => {
    let cancelled = false

    const loadOrderProtectionConfig = async () => {
      try {
        const response = await fetch('/api/settings/order-protection', { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json().catch(() => null)
        if (cancelled) return
        setOrderProtectionConfig(normalizeOrderProtectionConfig(data))
      } catch {
        if (!cancelled) {
          setOrderProtectionConfig(ORDER_PROTECTION_DEFAULTS)
        }
      }
    }

    void loadOrderProtectionConfig()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      metaRef.current.clear()
      intentRef.current.clear()
      pendingKeysRef.current.clear()
      syncInFlightRef.current = false
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            setItemsState(parsed)
          } else {
            setItemsState([])
          }
        } else {
          setItemsState([])
        }
      } catch {
        setItemsState([])
      } finally {
        setIsReady(true)
        setIsServerReady(false)
        setCartVersion(null)
        notifySyncStateChanged()
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
            const data = await response.json().catch(() => null)
            setCartVersion(data?.cartVersion ?? 1)
            applyServerSnapshot(data?.items || [])
          } else {
            setItemsState([])
            setCartVersion(1)
          }
        } else {
          const response = await fetch('/api/cart')
          if (response.ok) {
            const data = await response.json().catch(() => null)
            setCartVersion(data?.cartVersion ?? 1)
            applyServerSnapshot(data?.items || [])
          } else {
            setItemsState([])
            setCartVersion(1)
          }
        }
      } catch {
        setItemsState([])
        setCartVersion(1)
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
    if (isLoading) return
    if (!user) {
      lastUserIdRef.current = null
    }
  }, [isLoading, user])

  useEffect(() => {
    if (!user || !isServerReady) return
    if (pendingKeysRef.current.size <= 0) return
    void flushQueue()
  }, [user, isServerReady, syncRevision])

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

  const addItem = (product, quantity = 1) => {
    if (!product) return

    const normalized = normalizeItem({ ...product, quantity: 1 })
    const existing = (itemsRef.current || []).find((entry) => entry.key === normalized.key)
    const nextQuantity = Math.max(0, Number(existing?.quantity || 0) + Number(quantity || 0))

    if (!user) {
      optimisticSetQuantity(normalized, nextQuantity)
      return
    }

    setMeta(normalized.key, { isSyncing: true, syncError: null })
    queueIntent(normalized, nextQuantity)
    optimisticSetQuantity(normalized, nextQuantity)

    if (user && isServerReady) {
      void flushQueue()
    }
  }

  const updateQuantity = (key, quantity) => {
    const existing = (itemsRef.current || []).find((entry) => entry.key === key)
    if (!existing) return

    const desiredQuantity = Math.max(0, Number(quantity || 0))
    const normalized = normalizeItem({
      ...existing,
      quantity: 1,
    })

    if (!user) {
      optimisticSetQuantity(normalized, desiredQuantity)
      return
    }

    setMeta(key, { isSyncing: true, syncError: null })
    queueIntent(normalized, desiredQuantity)
    optimisticSetQuantity(normalized, desiredQuantity)

    if (user && isServerReady) {
      void flushQueue()
    }
  }

  const removeItem = (key) => {
    updateQuantity(key, 0)
  }

  const setItemProtection = (key, enabled) => {
    const existing = (itemsRef.current || []).find((entry) => entry.key === key)
    if (!existing) return
    if (isDigitalProductLike(existing) && enabled) return

    const normalized = normalizeItem({
      ...existing,
      isProtected: Boolean(enabled),
      quantity: 1,
    })

    if (!user) {
      optimisticSetQuantity(normalized, Math.max(1, Number(existing.quantity || 1)))
      return
    }

    setMeta(key, { isSyncing: true, syncError: null })
    queueIntent(normalized, Math.max(1, Number(existing.quantity || 1)))
    optimisticSetQuantity(normalized, Math.max(1, Number(existing.quantity || 1)))

    if (user && isServerReady) {
      void flushQueue()
    }
  }

  const setAllProtection = (enabled) => {
    const snapshot = [...(itemsRef.current || [])]
    const eligibleItems = snapshot.filter((entry) => !isDigitalProductLike(entry))
    if (eligibleItems.length <= 0) return

    if (!user) {
      const next = snapshot.map((entry) => {
        if (isDigitalProductLike(entry)) return entry
        return { ...entry, isProtected: Boolean(enabled) }
      })
      setItemsState(next)
      return
    }

    eligibleItems.forEach((entry) => {
      const key = entry.key
      const meta = metaRef.current.get(key) || { isSyncing: false, syncError: null }
      metaRef.current.set(key, {
        ...meta,
        isSyncing: true,
        syncError: null,
      })
      queueIntent(
        normalizeItem({
          ...entry,
          isProtected: Boolean(enabled),
          quantity: 1,
        }),
        Math.max(1, Number(entry.quantity || 1)),
      )
    })

    const next = snapshot.map((entry) => {
      if (isDigitalProductLike(entry)) return entry
      return { ...entry, isProtected: Boolean(enabled) }
    })
    setItemsState(next)
    notifySyncStateChanged()

    if (isServerReady) {
      void flushQueue()
    }
  }

  const clearCart = () => {
    if (!user) {
      setItemsState([])
      return
    }

    const snapshot = [...(itemsRef.current || [])]
    snapshot.forEach((entry) => {
      const normalized = normalizeItem({ ...entry, quantity: 1 })
      setMeta(normalized.key, { isSyncing: true, syncError: null })
      queueIntent(normalized, 0)
    })

    setItemsState([])

    if (user && isServerReady) {
      void flushQueue()
    }
  }

  const retryItem = (key) => {
    const intent = intentRef.current.get(key)
    const existing = (itemsRef.current || []).find((entry) => entry.key === key)
    const base = intent?.item || (existing ? normalizeItem({ ...existing, quantity: 1 }) : null)
    if (!base) return

    const desired = intent ? Math.max(0, Number(intent.quantity || 0)) : Math.max(1, Number(existing?.quantity || 1))

    setMeta(key, { isSyncing: true, syncError: null })
    queueIntent(base, desired)

    if (user && isServerReady) {
      void flushQueue()
    }
  }

  const summary = useMemo(() => {
    const subtotal = items.reduce((sum, entry) => sum + entry.price * entry.quantity, 0)
    const originalTotal = items.reduce((sum, entry) => {
      const original = entry.originalPrice || entry.price
      return sum + original * entry.quantity
    }, 0)
    const savings = Math.max(0, originalTotal - subtotal)
    const itemCount = items.reduce((sum, entry) => sum + entry.quantity, 0)
    const protectedSubtotal = items.reduce((sum, entry) => {
      if (!entry.isProtected) return sum
      if (isDigitalProductLike(entry)) return sum
      return sum + Number(entry.price || 0) * Number(entry.quantity || 0)
    }, 0)
    const protectedItemCount = items.reduce((sum, entry) => {
      if (!entry.isProtected || isDigitalProductLike(entry)) return sum
      return sum + Number(entry.quantity || 0)
    }, 0)
    const protectedEligibleLineCount = items.reduce((sum, entry) => {
      if (isDigitalProductLike(entry)) return sum
      return sum + 1
    }, 0)
    const protectedSelectedLineCount = items.reduce((sum, entry) => {
      if (isDigitalProductLike(entry)) return sum
      if (!entry.isProtected) return sum
      return sum + 1
    }, 0)
    const protectionFee = calculateOrderProtectionFee(
      protectedSubtotal,
      orderProtectionConfig,
    )

    return {
      subtotal,
      originalTotal,
      savings,
      itemCount,
      protectedSubtotal,
      protectedItemCount,
      protectedEligibleLineCount,
      protectedSelectedLineCount,
      protectionBulkEnabled:
        protectedEligibleLineCount > 0 &&
        protectedSelectedLineCount === protectedEligibleLineCount,
      protectionFee,
      protectionConfig: orderProtectionConfig,
    }
  }, [items, orderProtectionConfig])

  const isUpdating = useMemo(
    () => syncInFlightRef.current || items.some((entry) => entry.isSyncing),
    [items, syncRevision],
  )

  const value = useMemo(
    () => ({
      items,
      isReady,
      isServerReady,
      isUpdating,
      addItem,
      updateQuantity,
      setItemProtection,
      setAllProtection,
      removeItem,
      clearCart,
      retryItem,
      summary,
      cartVersion,
      orderProtectionConfig,
    }),
    [
      items,
      isReady,
      isServerReady,
      isUpdating,
      summary,
      cartVersion,
      orderProtectionConfig,
    ],
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

export function useOptionalCart() {
  return useContext(CartContext)
}
