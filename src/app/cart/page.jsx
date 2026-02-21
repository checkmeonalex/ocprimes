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
  const [reorderNotice, setReorderNotice] = useState(null)
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.sessionStorage.getItem('oc_reorder_notice')
    if (!raw) return

    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        const nextMissingItems = Array.isArray(parsed.missingItems) ? parsed.missingItems : []
        setReorderNotice({
          status: parsed.status === 'warning' ? 'warning' : 'success',
          message: String(parsed.message || ''),
          missingItems: nextMissingItems,
        })
      }
    } catch {
      // ignore invalid payload
    } finally {
      window.sessionStorage.removeItem('oc_reorder_notice')
    }
  }, [])

  return (
    <>
      {reorderNotice ? (
        <div className='fixed inset-x-3 top-16 z-50 sm:top-20 lg:left-1/2 lg:w-[640px] lg:-translate-x-1/2'>
          <div
            className={`rounded-lg border px-3 py-2 shadow-sm ${
              reorderNotice.status === 'warning'
                ? 'border-amber-200 bg-amber-50'
                : 'border-emerald-200 bg-emerald-50'
            }`}
          >
            <div className='flex items-start justify-between gap-2'>
              <p
                className={`text-xs font-medium ${
                  reorderNotice.status === 'warning' ? 'text-amber-800' : 'text-emerald-800'
                }`}
              >
                {reorderNotice.message}
              </p>
              <button
                type='button'
                onClick={() => setReorderNotice(null)}
                className='inline-flex h-5 w-5 items-center justify-center text-slate-500'
                aria-label='Dismiss reorder notice'
              >
                <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2'>
                  <path d='m5 5 10 10M15 5 5 15' strokeLinecap='round' />
                </svg>
              </button>
            </div>

            {reorderNotice.missingItems.length > 0 ? (
              <div className='mt-2 space-y-1'>
                {reorderNotice.missingItems.map((entry, index) => (
                  <p
                    key={`${entry?.productId || entry?.name || 'item'}-${index}`}
                    className='text-[11px] text-amber-800'
                  >
                    {entry?.reason === 'Limited stock'
                      ? `We do not have ${entry?.requestedQuantity || 0} of ${entry?.name || 'this product'}${
                          entry?.attributeSummary ? ` (${entry.attributeSummary})` : ''
                        }. We only have ${entry?.availableQuantity || 0}. Added ${entry?.addedQuantity || 0} to cart.`
                      : `${entry?.name || 'This product'}${
                          entry?.attributeSummary ? ` (${entry.attributeSummary})` : ''
                        } is not available and was not added.`}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

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
    </>
  )
}
