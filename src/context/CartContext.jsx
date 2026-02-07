'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuthUser } from '@/lib/auth/useAuthUser'
import { buildKey, normalizeItem } from '@/lib/cart/utils'

const CartContext = createContext(null)
const STORAGE_KEY = 'ocprimes_cart_items'
const DEBOUNCE_MS = 0
const RETRY_DELAYS = [200, 500, 1000]

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

const initMeta = (quantity) => ({
  qtyDisplayed: quantity,
  qtyConfirmed: quantity,
  pendingDelta: 0,
  isSyncing: false,
  latestOpId: 0,
  inFlight: false,
  timerId: null,
  syncError: null,
})

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [isReady, setIsReady] = useState(false)
  const [isServerReady, setIsServerReady] = useState(false)
  const [cartVersion, setCartVersion] = useState(null)
  const { user, isLoading } = useAuthUser()
  const itemsRef = useRef(items)
  const lastUserIdRef = useRef(null)
  const pendingSyncRef = useRef(null)
  const cartVersionRef = useRef(cartVersion)
  const metaRef = useRef(new Map())

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    cartVersionRef.current = cartVersion
  }, [cartVersion])

  const setItemsState = (nextItems) => {
    setItems(nextItems)
    itemsRef.current = nextItems
  }

  const ensureMetaForItem = (key, quantity) => {
    const meta = metaRef.current.get(key)
    if (meta) return meta
    const created = initMeta(quantity)
    metaRef.current.set(key, created)
    return created
  }

  const syncMetaFromItems = (nextItems) => {
    const seen = new Set()
    nextItems.forEach((item) => {
      const key = item.key || buildKey(item)
      seen.add(key)
      const meta = ensureMetaForItem(key, item.quantity)
      meta.qtyDisplayed = item.quantity
      meta.qtyConfirmed = item.quantity
      meta.pendingDelta = 0
      meta.isSyncing = false
      meta.syncError = null
    })
    Array.from(metaRef.current.keys()).forEach((key) => {
      if (!seen.has(key)) {
        const meta = metaRef.current.get(key)
        if (meta?.pendingDelta) return
        metaRef.current.delete(key)
      }
    })
  }

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            const normalized = normalizeItems(parsed)
            setItemsState(normalized)
            syncMetaFromItems(normalized)
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
            const normalized = normalizeItems(data?.items)
            setItemsState(normalized)
            syncMetaFromItems(normalized)
            setCartVersion(data?.cartVersion ?? 1)
          } else {
            setItemsState([])
            setCartVersion(1)
          }
        } else {
          const response = await fetch('/api/cart')
          if (response.ok) {
            const data = await response.json()
            const normalized = normalizeItems(data?.items)
            setItemsState(normalized)
            syncMetaFromItems(normalized)
            setCartVersion(data?.cartVersion ?? 1)
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

  const updateItemState = (key, updater) => {
    setItemsState((itemsRef.current || []).reduce((acc, item) => {
      if (item.key !== key) {
        acc.push(item)
        return acc
      }
      const next = updater(item)
      if (!next || next.quantity <= 0) return acc
      acc.push(next)
      return acc
    }, []))
  }

  const addItemToState = (item) => {
    setItemsState([...(itemsRef.current || []), item])
  }

  const applyOptimistic = (key, desiredQty, extra = {}) => {
    updateItemState(key, (item) => ({
      ...item,
      quantity: desiredQty,
      ...extra,
    }))
  }

  const scheduleSync = (key) => {
    const meta = metaRef.current.get(key)
    if (!meta) return
    if (meta.timerId) {
      clearTimeout(meta.timerId)
      meta.timerId = null
    }

    if (DEBOUNCE_MS <= 0) {
      void syncItem(key)
      return
    }

    meta.timerId = setTimeout(() => {
      meta.timerId = null
      void syncItem(key)
    }, DEBOUNCE_MS)
  }

  const applyServerError = (key) => {
    const meta = metaRef.current.get(key)
    if (!meta) return
    // Keep the user's latest optimistic quantity on transient failures.
    // This prevents visible "snap back" when network is unstable.
    meta.isSyncing = false
    meta.syncError = 'Couldn\'t update cart. Tap to retry.'
    applyOptimistic(key, meta.qtyDisplayed, {
      isSyncing: false,
      syncError: meta.syncError,
    })
  }

  const handleResponseUpdate = (key, desiredQty, responseData) => {
    const meta = metaRef.current.get(key)
    if (!meta) return
    meta.qtyConfirmed = desiredQty
    meta.pendingDelta = 0
    meta.isSyncing = false
    meta.syncError = null

    const responseItems = Array.isArray(responseData?.items) ? responseData.items : []
    const updated = responseItems.find((entry) => entry.key === key)
    if (updated) {
      updateItemState(key, (item) => ({
        ...item,
        itemId: updated.itemId,
        quantity: updated.quantity,
        isSyncing: false,
        syncError: null,
      }))
    } else if (desiredQty <= 0) {
      updateItemState(key, () => null)
    } else {
      applyOptimistic(key, desiredQty, { isSyncing: false, syncError: null })
    }
  }

  const syncItem = async (key) => {
    const meta = metaRef.current.get(key)
    if (!meta) return
    if (meta.inFlight) {
      meta.isSyncing = true
      return
    }
    const desiredQty = Math.max(0, meta.qtyConfirmed + meta.pendingDelta)
    if (desiredQty === meta.qtyConfirmed) {
      meta.pendingDelta = 0
      meta.isSyncing = false
      applyOptimistic(key, meta.qtyDisplayed, { isSyncing: false, syncError: null })
      return
    }

    meta.inFlight = true
    meta.isSyncing = true
    meta.syncError = null
    applyOptimistic(key, meta.qtyDisplayed, { isSyncing: true, syncError: null })

    const runAttempt = async (attempt) => {
      const item = (itemsRef.current || []).find((entry) => entry.key === key)
      if (!item) {
        meta.inFlight = false
        meta.isSyncing = false
        return
      }
      meta.latestOpId += 1
      const idempotencyKey = crypto.randomUUID()
      const headers = {
        'Content-Type': 'application/json',
        'If-Match': String(cartVersionRef.current ?? 1),
        'Idempotency-Key': idempotencyKey,
      }

      let response
      try {
        if (item.itemId) {
          response = await fetch(`/api/cart/items/${item.itemId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ quantity: desiredQty }),
          })
        } else {
          response = await fetch('/api/cart/items', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              id: item.id,
              name: item.name,
              slug: item.slug,
              price: item.price,
              originalPrice: item.originalPrice,
              image: item.image,
              selectedVariationId: item.selectedVariationId,
              selectedVariationLabel: item.selectedVariationLabel,
              selectedColor: item.selectedColor,
              selectedSize: item.selectedSize,
              quantity: desiredQty,
            }),
          })
        }
      } catch {
        response = null
      }

      if (!response) {
        if (attempt < RETRY_DELAYS.length) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]))
          return runAttempt(attempt + 1)
        }
        applyServerError(key)
        meta.inFlight = false
        return
      }

      if (response.status === 409) {
        const data = await response.json().catch(() => null)
        if (data?.cartVersion) {
          setCartVersion(data.cartVersion)
        }
        if (Array.isArray(data?.items)) {
          const normalized = normalizeItems(data.items)
          setItemsState(normalized)
          syncMetaFromItems(normalized)
        }
        if (attempt < RETRY_DELAYS.length) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]))
          return runAttempt(attempt + 1)
        }
        applyServerError(key)
        meta.inFlight = false
        return
      }

      if (response.status === 429 || response.status >= 500) {
        if (attempt < RETRY_DELAYS.length) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]))
          return runAttempt(attempt + 1)
        }
        applyServerError(key)
        meta.inFlight = false
        return
      }

      if (!response.ok) {
        applyServerError(key)
        meta.inFlight = false
        return
      }

      const data = await response.json().catch(() => null)
      if (data?.cartVersion) {
        setCartVersion(data.cartVersion)
      }
      handleResponseUpdate(key, desiredQty, data)
      meta.inFlight = false

      if (meta.pendingDelta !== 0) {
        scheduleSync(key)
      }
      return
    }

    await runAttempt(0)
  }

  const addItem = (product, quantity = 1) => {
    if (!product) return
    const normalized = normalizeItem({ ...product, quantity })
    const key = normalized.key
    const existing = (itemsRef.current || []).find((entry) => entry.key === key)
    const meta = ensureMetaForItem(key, existing?.quantity || 0)
    meta.pendingDelta += quantity
    meta.qtyDisplayed = Math.max(0, meta.qtyConfirmed + meta.pendingDelta)
    meta.isSyncing = true
    meta.syncError = null

    if (existing) {
      applyOptimistic(key, meta.qtyDisplayed, { isSyncing: true, syncError: null })
    } else {
      addItemToState({
        ...normalized,
        quantity: meta.qtyDisplayed,
        isSyncing: true,
        syncError: null,
      })
    }

    if (user && isServerReady) {
      scheduleSync(key)
    } else if (user) {
      pendingSyncRef.current = key
    }
  }

  const updateQuantity = (key, quantity) => {
    const meta = ensureMetaForItem(key, 0)
    meta.pendingDelta = quantity - meta.qtyConfirmed
    meta.qtyDisplayed = Math.max(0, quantity)
    meta.isSyncing = true
    meta.syncError = null

    applyOptimistic(key, meta.qtyDisplayed, { isSyncing: true, syncError: null })

    if (user && isServerReady) {
      scheduleSync(key)
    } else if (user) {
      pendingSyncRef.current = key
    }
  }

  const removeItem = (key) => {
    updateQuantity(key, 0)
  }

  const clearCart = () => {
    setItemsState([])
    metaRef.current.clear()
    if (user && isServerReady) {
      void fetch('/api/cart/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [] }),
      })
    }
  }

  const retryItem = (key) => {
    const meta = metaRef.current.get(key)
    if (!meta) return
    meta.syncError = null
    meta.isSyncing = true
    applyOptimistic(key, meta.qtyDisplayed, { isSyncing: true, syncError: null })
    scheduleSync(key)
  }

  useEffect(() => {
    if (!user || !isServerReady) return
    if (pendingSyncRef.current) {
      const queuedKey = pendingSyncRef.current
      pendingSyncRef.current = null
      scheduleSync(queuedKey)
    }
  }, [user, isServerReady])

  const refreshCartFromServer = async () => {
    if (!user) return
    const response = await fetch('/api/cart')
    if (response.ok) {
      const data = await response.json()
      const normalized = normalizeItems(data?.items)
      setItemsState(normalized)
      syncMetaFromItems(normalized)
      setCartVersion(data?.cartVersion ?? cartVersionRef.current ?? 1)
    }
  }

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
      0,
    )
    const originalTotal = items.reduce((sum, entry) => {
      const original = entry.originalPrice || entry.price
      return sum + original * entry.quantity
    }, 0)
    const savings = Math.max(0, originalTotal - subtotal)
    const itemCount = items.reduce((sum, entry) => sum + entry.quantity, 0)

    return { subtotal, originalTotal, savings, itemCount }
  }, [items])

  const isUpdating = useMemo(
    () => items.some((entry) => entry.isSyncing),
    [items],
  )

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
      retryItem,
      summary,
      cartVersion,
    }),
    [items, isReady, isServerReady, isUpdating, summary, cartVersion],
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
