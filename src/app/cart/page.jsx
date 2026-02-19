'use client'

import { useEffect, useState } from 'react'
import CartCheckoutExperience from '@/components/cart/CartCheckoutExperience'
import { useCart } from '@/context/CartContext'
import { useUserI18n } from '@/lib/i18n/useUserI18n'

const defaultCheckoutProgressConfig = {
  enabled: true,
  standardFreeShippingThreshold: 50,
  expressFreeShippingThreshold: 100,
}

export default function CartPage() {
  const { formatMoney } = useUserI18n()
  const [checkoutProgressConfig, setCheckoutProgressConfig] = useState(
    defaultCheckoutProgressConfig,
  )
  const {
    items,
    savedItems,
    summary,
    addItem,
    updateQuantity,
    setItemProtection,
    setAllProtection,
    removeItem,
    saveForLater,
    moveToCart,
    removeSavedItem,
    clearCart,
    retryItem,
    isReady,
    isServerReady,
  } = useCart()

  useEffect(() => {
    let cancelled = false

    const loadCheckoutProgressConfig = async () => {
      try {
        const response = await fetch('/api/settings/cart-shipping-progress', { cache: 'no-store' })
        if (!response.ok) return
        const payload = await response.json().catch(() => null)
        if (!payload || cancelled) return
        const next = {
          enabled: payload?.enabled !== false,
          standardFreeShippingThreshold:
            Number(payload?.standardFreeShippingThreshold) >= 0
              ? Number(payload.standardFreeShippingThreshold)
              : defaultCheckoutProgressConfig.standardFreeShippingThreshold,
          expressFreeShippingThreshold:
            Number(payload?.expressFreeShippingThreshold) >= 0
              ? Number(payload.expressFreeShippingThreshold)
              : defaultCheckoutProgressConfig.expressFreeShippingThreshold,
        }
        setCheckoutProgressConfig(next)
      } catch {
        // keep defaults when profile settings are unavailable
      }
    }

    void loadCheckoutProgressConfig()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <CartCheckoutExperience
      items={items}
      summary={summary}
      formatMoney={formatMoney}
      addItem={addItem}
      updateQuantity={updateQuantity}
      setItemProtection={setItemProtection}
      setAllProtection={setAllProtection}
      removeItem={removeItem}
      savedItems={savedItems}
      saveForLater={saveForLater}
      moveToCart={moveToCart}
      removeSavedItem={removeSavedItem}
      clearCart={clearCart}
      retryItem={retryItem}
      isLoadingCart={!isReady || !isServerReady}
      checkoutProgressConfig={checkoutProgressConfig}
    />
  )
}
