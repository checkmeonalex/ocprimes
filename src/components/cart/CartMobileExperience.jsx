'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import QuantityControl from '@/components/cart/QuantityControl'
import CartCheckoutProgressBar from '@/components/cart/CartCheckoutProgressBar'
import CartItemSkeletonRow from '@/components/cart/CartItemSkeletonRow'
import SellerIcon from '@/components/cart/SellerIcon'
import { isReturnPolicyDisabled, normalizeReturnPolicyKey } from '@/lib/cart/return-policy'
import { getSelectionSummary } from '@/lib/cart/selection-summary'
import { buildVendorHref } from '@/lib/cart/vendor-link'

const toSet = (keys) => {
  const next = new Set()
  keys.forEach((key) => {
    if (key) next.add(key)
  })
  return next
}

const CartMobileExperience = ({
  items,
  formatMoney,
  updateQuantity,
  removeItem,
  retryItem,
  clearCart,
  isLoadingCart = false,
  checkoutProgressConfig,
  subtotal = 0,
  returnPolicyBySlug,
}) => {
  const router = useRouter()
  const [selectedKeys, setSelectedKeys] = useState(new Set())
  const checkoutAnchorRef = useRef(null)
  const [isCheckoutFloating, setIsCheckoutFloating] = useState(true)

  useEffect(() => {
    const itemKeys = items.map((item) => item.key).filter(Boolean)
    setSelectedKeys((prev) => {
      if (prev.size === 0) return toSet(itemKeys)
      const next = new Set()
      itemKeys.forEach((key) => {
        if (prev.has(key)) next.add(key)
      })
      if (next.size === 0 && itemKeys.length > 0) return toSet(itemKeys)
      return next
    })
  }, [items])

  const selectedItems = useMemo(
    () => items.filter((item) => selectedKeys.has(item.key)),
    [items, selectedKeys],
  )

  const selectedCount = selectedItems.length
  const allCount = items.length
  const isAllSelected = allCount > 0 && selectedCount === allCount

  const selectedSubtotal = selectedItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  )
  const selectedOriginalTotal = selectedItems.reduce((sum, item) => {
    const original = item.originalPrice || item.price
    return sum + Number(original || 0) * Number(item.quantity || 0)
  }, 0)
  const selectedSavings = Math.max(0, selectedOriginalTotal - selectedSubtotal)
  const freeShippingThreshold = Math.max(
    1,
    Number(checkoutProgressConfig?.freeShippingThreshold || 50),
  )
  const deliveryFee = selectedSubtotal > 0 && selectedSubtotal < freeShippingThreshold ? 5 : 0
  const selectedTotal = selectedSubtotal + deliveryFee

  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedKeys(new Set())
      return
    }
    setSelectedKeys(toSet(items.map((item) => item.key)))
  }

  const toggleItem = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  useEffect(() => {
    if (isLoadingCart || items.length <= 0) return
    if (!checkoutAnchorRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        setIsCheckoutFloating(!entry.isIntersecting)
      },
      { threshold: 0.05 },
    )

    observer.observe(checkoutAnchorRef.current)
    return () => observer.disconnect()
  }, [isLoadingCart, items.length])

  const checkoutCard = (
    <div className='mx-auto w-full max-w-7xl rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur'>
      <div className='mb-2 flex items-center justify-between text-sm font-semibold text-slate-900'>
        <span>Total ({selectedCount})</span>
        <span>{formatMoney(selectedTotal)}</span>
      </div>
      {selectedSavings > 0 ? (
        <p className='mb-2 text-[11px] font-semibold text-emerald-700'>
          You save {formatMoney(selectedSavings)}
        </p>
      ) : null}
      <button
        type='button'
        onClick={() => router.push('/checkout/shipping')}
        disabled={selectedCount <= 0}
        className='w-full rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50'
      >
        Checkout ({selectedCount})
      </button>
    </div>
  )

  return (
    <section className='space-y-2 lg:hidden'>
      <div className='flex items-center justify-between border border-slate-200 bg-white px-3 py-3'>
          <button
            type='button'
            onClick={() => router.back()}
            className='inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100'
            aria-label='Go back'
          >
            <svg viewBox='0 0 20 20' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M12.5 4.5L7 10l5.5 5.5' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </button>

          <h2 className='text-base font-semibold text-slate-900'>
            Cart <span className='text-slate-500'>({allCount})</span>
          </h2>

          {allCount > 0 ? (
            <button
              type='button'
              onClick={clearCart}
              className='text-xs font-semibold text-slate-500 hover:text-slate-700'
            >
              Clear
            </button>
          ) : (
            <span className='w-9' />
          )}
        </div>

      <CartCheckoutProgressBar
        subtotal={subtotal}
        formatMoney={formatMoney}
        config={checkoutProgressConfig}
      />

      <div className='rounded-xl border border-slate-200 bg-white px-3 py-2'>
        <div className='flex items-center gap-2 text-xs'>
            <button
              type='button'
              onClick={toggleAll}
              className='inline-flex items-center gap-1 rounded-full border border-slate-300 px-2 py-1 text-slate-700'
            >
              <span
                className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                  isAllSelected
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-transparent'
                }`}
              >
                <svg viewBox='0 0 20 20' className='h-3 w-3' fill='none' stroke='currentColor' strokeWidth='2'>
                  <path d='M4.5 10.5l3.2 3.2 7.8-7.8' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
              </span>
              All ({allCount})
            </button>
            <span className='rounded-full border border-slate-900 bg-slate-900 px-2 py-1 text-white'>
              Selected ({selectedCount})
            </span>
        </div>
      </div>

      <div className='border border-slate-200 bg-white'>
        {isLoadingCart ? (
          <div>
            <CartItemSkeletonRow />
            <CartItemSkeletonRow />
          </div>
        ) : items.length <= 0 ? (
          <div className='px-4 py-10 text-center'>
            <p className='text-sm text-slate-500'>Your cart is empty.</p>
            <Link
              href='/'
              className='mt-4 inline-flex rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white'
            >
              Continue shopping
            </Link>
          </div>
        ) : (
          <div>
            {items.map((item) => {
              const selected = selectedKeys.has(item.key)
              const sourceName = String(
                item?.sourceName || item?.vendorName || item?.storeName || 'OCPRIMES',
              )
              const slug = String(item?.slug || '').trim()
              const policyKey =
                normalizeReturnPolicyKey(item?.returnPolicy) ||
                normalizeReturnPolicyKey(returnPolicyBySlug?.[slug])
              const isNonReturnable = isReturnPolicyDisabled(policyKey)
              const sourceHref = buildVendorHref({
                slug: item?.sourceSlug || item?.vendorSlug || item?.storeSlug,
                name: sourceName,
              })
              return (
                <article key={item.key} className='border-b border-slate-200 px-3 py-3 last:border-b-0'>
                  <div className='grid grid-cols-[auto_1fr] gap-2'>
                    <button
                      type='button'
                      onClick={() => toggleItem(item.key)}
                      aria-label={selected ? 'Deselect item' : 'Select item'}
                      className={`mt-10 inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                        selected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-300 bg-white text-transparent'
                      }`}
                    >
                      <svg viewBox='0 0 20 20' className='h-3.5 w-3.5' fill='none' stroke='currentColor' strokeWidth='2'>
                        <path d='M4.5 10.5l3.2 3.2 7.8-7.8' strokeLinecap='round' strokeLinejoin='round' />
                      </svg>
                    </button>

                    <div className='grid grid-cols-[88px_1fr] gap-3'>
                      <div className='relative h-[88px] w-[88px] overflow-hidden rounded-md border border-slate-200 bg-slate-100'>
                        {item.image ? (
                          <Image src={item.image} alt={item.name} fill sizes='88px' className='object-cover' />
                        ) : null}
                      </div>

                      <div className='min-w-0'>
                        <div className='flex items-start justify-between gap-2'>
                          <div className='min-w-0'>
                            <div className='mb-0.5 flex items-center gap-1 text-xs font-semibold text-slate-700'>
                              <SellerIcon className='h-3.5 w-3.5 text-slate-600' />
                              <Link href={sourceHref} className='line-clamp-1 hover:underline'>
                                {sourceName}
                              </Link>
                            </div>
                            <h3 className='line-clamp-2 text-sm font-semibold text-slate-900'>{item.name}</h3>
                            <p className='line-clamp-1 text-xs text-slate-500'>{getSelectionSummary(item)}</p>
                            {isNonReturnable ? (
                              <p className='mt-1 inline-flex items-center gap-1.5 text-[11px] text-slate-500'>
                                <span
                                  className='inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-400 text-[9px] font-semibold text-slate-500'
                                  aria-hidden='true'
                                >
                                  i
                                </span>
                                This item cannot be returned or exchanged
                              </p>
                            ) : null}
                          </div>
                          <button
                            type='button'
                            onClick={() => removeItem(item.key)}
                            className='inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-rose-500 hover:bg-rose-50 hover:text-rose-600'
                            aria-label='Remove item'
                          >
                            <svg viewBox='-7.29 0 122.88 122.88' className='h-3.5 w-3.5 fill-current' aria-hidden='true'>
                              <path d='M77.4,49.1h-5.94v56.09h5.94V49.1L77.4,49.1L77.4,49.1z M6.06,9.06h32.16V6.2c0-0.1,0-0.19,0.01-0.29 c0.13-2.85,2.22-5.25,5.01-5.79C43.97-0.02,44.64,0,45.38,0H63.9c0.25,0,0.49-0.01,0.73,0.02c1.58,0.08,3.02,0.76,4.06,1.81 c1.03,1.03,1.69,2.43,1.79,3.98c0.01,0.18,0.02,0.37,0.02,0.55v2.7H103c0.44,0,0.75,0.01,1.19,0.08c2.21,0.36,3.88,2.13,4.07,4.37 c0.02,0.24,0.03,0.47,0.03,0.71v10.54c0,1.47-1.19,2.66-2.67,2.66H2.67C1.19,27.43,0,26.23,0,24.76V24.7v-9.91 C0,10.64,2.04,9.06,6.06,9.06L6.06,9.06z M58.07,49.1h-5.95v56.09h5.95V49.1L58.07,49.1L58.07,49.1z M38.74,49.1H32.8v56.09h5.95 V49.1L38.74,49.1L38.74,49.1z M10.74,31.57h87.09c0.36,0.02,0.66,0.04,1.03,0.1c1.25,0.21,2.4,0.81,3.27,1.66 c1.01,1,1.67,2.34,1.7,3.83c0,0.31-0.03,0.63-0.06,0.95l-7.33,78.66c-0.1,1.03-0.27,1.95-0.79,2.92c-1.01,1.88-2.88,3.19-5.2,3.19 H18.4c-0.55,0-1.05,0-1.59-0.08c-0.22-0.03-0.43-0.08-0.64-0.14c-0.31-0.09-0.62-0.21-0.91-0.35c-0.27-0.13-0.52-0.27-0.78-0.45 c-1.51-1.04-2.51-2.78-2.69-4.72L4.5,37.88c-0.02-0.25-0.04-0.52-0.04-0.77c0.05-1.48,0.7-2.8,1.7-3.79 c0.88-0.86,2.06-1.47,3.33-1.67C9.9,31.59,10.34,31.57,10.74,31.57L10.74,31.57z M97.75,36.9H10.6c-0.57,0-0.84,0.1-0.79,0.7 l7.27,79.05h0l0,0.01c0.03,0.38,0.2,0.69,0.45,0.83l0,0l0.08,0.03l0.06,0.01l0.08,0h72.69c0.6,0,0.67-0.84,0.71-1.28l7.34-78.71 C98.53,37.04,98.23,36.9,97.75,36.9L97.75,36.9z' />
                            </svg>
                          </button>
                        </div>

                        <div className='mt-2 flex items-end justify-between gap-2'>
                          <div>
                            <p className='text-base font-semibold text-orange-600'>{formatMoney(item.price)}</p>
                            {item.originalPrice ? (
                              <p className='text-xs text-slate-400 line-through'>
                                {formatMoney(item.originalPrice)}
                              </p>
                            ) : null}
                          </div>

                          <QuantityControl
                            quantity={item.quantity}
                            onIncrement={() => updateQuantity(item.key, item.quantity + 1)}
                            onDecrement={() => updateQuantity(item.key, Math.max(0, item.quantity - 1))}
                            size='sm'
                            stylePreset='card'
                            appearance='solid'
                            isLoading={Boolean(item.isSyncing)}
                          />
                        </div>

                        {item.syncError ? (
                          <button
                            type='button'
                            onClick={() => retryItem(item.key)}
                            className='mt-1 text-[11px] font-semibold text-rose-600'
                          >
                            {item.syncError}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {!isLoadingCart && items.length > 0 ? (
        <>
          <div ref={checkoutAnchorRef} className='h-px w-full' />
          {!isCheckoutFloating ? <div className='mt-2'>{checkoutCard}</div> : null}
          {isCheckoutFloating ? (
            <div className='fixed inset-x-0 bottom-0 z-30'>{checkoutCard}</div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

export default CartMobileExperience
