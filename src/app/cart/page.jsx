'use client'

import { useEffect, useState } from 'react'
import CartCheckoutExperience from '@/components/cart/CartCheckoutExperience'
import { useCart } from '@/context/CartContext'
import { useUserI18n } from '@/lib/i18n/useUserI18n'

const defaultCheckoutProgressConfig = {
  freeShippingThreshold: 50,
  cashbackThreshold: 85,
  cashbackPercent: 3,
}

export default function CartPage() {
  const { formatMoney } = useUserI18n()
  const [checkoutProgressConfig, setCheckoutProgressConfig] = useState(
    defaultCheckoutProgressConfig,
  )
  const {
    items,
    summary,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    retryItem,
    isReady,
    isServerReady,
  } = useCart()

  useEffect(() => {
    let cancelled = false

    const loadCheckoutProgressConfig = async () => {
      try {
        const response = await fetch('/api/user/profile', { cache: 'no-store' })
        if (!response.ok) return
        const payload = await response.json().catch(() => null)
        const fromProfile = payload?.profile?.shortcuts?.checkoutProgress
        if (!fromProfile || cancelled) return
        const next = {
          freeShippingThreshold:
            Number(fromProfile.freeShippingThreshold) > 0
              ? Number(fromProfile.freeShippingThreshold)
              : defaultCheckoutProgressConfig.freeShippingThreshold,
          cashbackThreshold:
            Number(fromProfile.cashbackThreshold) > 0
              ? Number(fromProfile.cashbackThreshold)
              : defaultCheckoutProgressConfig.cashbackThreshold,
          cashbackPercent:
            Number(fromProfile.cashbackPercent) >= 0
              ? Number(fromProfile.cashbackPercent)
              : defaultCheckoutProgressConfig.cashbackPercent,
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
      removeItem={removeItem}
      clearCart={clearCart}
      retryItem={retryItem}
      isLoadingCart={!isReady || !isServerReady}
      checkoutProgressConfig={checkoutProgressConfig}
    />
  )
}
