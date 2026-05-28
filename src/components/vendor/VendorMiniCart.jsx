'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useOptionalCart } from '@/context/CartContext'
import { useUserI18n } from '@/lib/i18n/useUserI18n'

export default function VendorMiniCart({ open, onClose, isLight = false }) {
  const cart = useOptionalCart()
  const { formatMoney } = useUserI18n()
  const ref = useRef(null)

  const items = cart?.items ?? []
  const subtotal = cart?.summary?.subtotal ?? 0
  const itemCount = cart?.summary?.itemCount ?? 0
  const removeItem = cart?.removeItem
  const updateQuantity = cart?.updateQuantity

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[500] bg-black/40 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={ref}
        className={`fixed right-0 top-0 z-[501] h-full w-full max-w-sm bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-gray-900">Your Cart</span>
            {itemCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-900 px-1.5 text-[10px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </div>
          <button type="button" onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-7 w-7 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-900">Your cart is empty</p>
              <p className="text-xs text-gray-500">Start adding items to your cart</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 px-5 py-2">
              {items.map((item) => (
                <li key={item.key} className="flex gap-3 py-4">
                  {/* Image */}
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="h-full w-full bg-gray-200" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 min-w-0 flex-col justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</p>
                      {item.variant && (
                        <p className="text-xs text-gray-400 mt-0.5">{item.variant}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      {/* Qty */}
                      <div className="flex items-center gap-1 rounded-full border border-gray-200 px-1.5 py-0.5">
                        <button type="button"
                          onClick={() => updateQuantity?.(item.key, item.quantity - 1)}
                          className="flex h-5 w-5 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors text-base leading-none">
                          −
                        </button>
                        <span className="min-w-[16px] text-center text-xs font-semibold text-gray-900">{item.quantity}</span>
                        <button type="button"
                          onClick={() => updateQuantity?.(item.key, item.quantity + 1)}
                          className="flex h-5 w-5 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors text-base leading-none">
                          +
                        </button>
                      </div>

                      {/* Price */}
                      <span className="text-sm font-bold text-gray-900 font-mono">
                        {formatMoney(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>

                  {/* Remove */}
                  <button type="button"
                    onClick={() => removeItem?.(item.key)}
                    className="self-start mt-1 text-gray-300 hover:text-red-400 transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Subtotal</span>
              <span className="text-base font-bold text-gray-900 font-mono">{formatMoney(subtotal)}</span>
            </div>
            <p className="text-[11px] text-gray-400">Shipping and taxes calculated at checkout</p>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/cart" onClick={onClose}
                className="flex items-center justify-center rounded-full border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                View cart
              </Link>
              <Link href="/checkout" onClick={onClose}
                className="flex items-center justify-center rounded-full bg-gray-900 py-2.5 text-sm font-bold text-white hover:bg-gray-700 transition-colors">
                Checkout →
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
