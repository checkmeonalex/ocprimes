'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useUserI18n } from '@/lib/i18n/useUserI18n'

export default function VendorMiniWishlist({ open, onClose }) {
  const { formatMoney } = useUserI18n()
  const ref = useRef(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const fetchedRef = useRef(false)

  const fetchItems = useCallback(async () => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    setLoading(true)
    try {
      const res = await fetch('/api/wishlist/items', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json().catch(() => null)
      const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
      setItems(list)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on first open
  useEffect(() => {
    if (open) {
      fetchedRef.current = false
      fetchItems()
    }
  }, [open, fetchItems])

  // Outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  // Escape
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
            <span className="text-base font-bold text-gray-900">Saved Items</span>
            {items.length > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-900 px-1.5 text-[10px] font-bold text-white">
                {items.length}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-4 px-5 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="h-16 w-16 shrink-0 rounded-xl bg-gray-100" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 rounded bg-gray-100 w-3/4" />
                    <div className="h-3 rounded bg-gray-100 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-7 w-7 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-900">Nothing saved yet</p>
              <p className="text-xs text-gray-500">Tap the heart on any product to save it here</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 px-5 py-2">
              {items.map((item) => {
                const slug = item.product_slug || item.slug || ''
                const name = item.product_name || item.name || 'Product'
                const price = Number(item.product_price || item.price || 0)
                const image = item.product_image || item.image || ''
                const href = slug ? `/product/${slug}` : '#'

                return (
                  <li key={item.id || slug} className="flex gap-3 py-4">
                    {/* Image */}
                    <Link href={href} onClick={onClose}
                      className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100 block">
                      {image ? (
                        <img src={image} alt={name} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="h-full w-full bg-gray-200" />
                      )}
                    </Link>

                    {/* Info */}
                    <div className="flex flex-1 min-w-0 flex-col justify-between">
                      <Link href={href} onClick={onClose}
                        className="text-sm font-medium text-gray-900 line-clamp-2 hover:underline">
                        {name}
                      </Link>
                      {price > 0 && (
                        <span className="mt-1 text-sm font-bold text-gray-900 font-mono">
                          {formatMoney(price)}
                        </span>
                      )}
                    </div>

                    {/* Heart (saved) */}
                    <div className="self-start mt-1 text-red-400">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                      </svg>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-4">
          <Link href="/wishlist" onClick={onClose}
            className="flex w-full items-center justify-center rounded-full border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            View all saved items
          </Link>
        </div>
      </div>
    </>
  )
}
