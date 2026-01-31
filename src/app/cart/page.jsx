'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useCart } from '../../context/CartContext'
import QuantityControl from '../../components/cart/QuantityControl'

const formatMoney = (value) => `$${value.toFixed(2)}`
const buildProductHref = (item) => {
  const params = new URLSearchParams()
  if (item.selectedVariationId && item.selectedVariationId !== 'default') {
    params.set('variant', item.selectedVariationId)
  }
  if (item.selectedColor && item.selectedColor !== 'default') {
    params.set('color', item.selectedColor)
  }
  if (item.selectedSize && item.selectedSize !== 'default') {
    params.set('size', item.selectedSize)
  }
  const query = params.toString()
  return `/product/${item.slug || item.id}${query ? `?${query}` : ''}`
}

export default function CartPage() {
  const { items, summary, updateQuantity, removeItem, clearCart, retryItem } =
    useCart()
  const asideWrapRef = useRef(null)
  const asideRef = useRef(null)
  const [stickyStyle, setStickyStyle] = useState({})
  const shippingFee = summary.subtotal > 0 && summary.subtotal < 35 ? 6.99 : 0
  const estimatedTotal = summary.subtotal + shippingFee

  useEffect(() => {
    let frameId = 0

    const updateSticky = () => {
      if (!asideWrapRef.current || !asideRef.current) return
      const isDesktop = window.innerWidth >= 1024
      if (!isDesktop) {
        setStickyStyle({})
        return
      }

      const wrapRect = asideWrapRef.current.getBoundingClientRect()
      const asideRect = asideRef.current.getBoundingClientRect()
      const scrollY = window.scrollY
      const topOffset = 112
      const wrapTop = wrapRect.top + scrollY
      const wrapBottom = wrapRect.bottom + scrollY
      const fixedTop = scrollY + topOffset
      const asideHeight = asideRect.height
      const left = asideRect.left
      const width = asideRect.width

      if (fixedTop <= wrapTop) {
        setStickyStyle({})
        return
      }

      if (fixedTop + asideHeight >= wrapBottom) {
        setStickyStyle({
          position: 'absolute',
          top: `${wrapBottom - wrapTop - asideHeight}px`,
          left: '0px',
          width: '100%',
        })
        return
      }

      setStickyStyle({
        position: 'fixed',
        top: `${topOffset}px`,
        left: `${left}px`,
        width: `${width}px`,
      })
    }

    const onScroll = () => {
      if (frameId) return
      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        updateSticky()
      })
    }

    updateSticky()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frameId) window.cancelAnimationFrame(frameId)
    }
  }, [])

  return (
    <div className='min-h-screen bg-slate-50 text-slate-900'>
      <div className='mx-auto w-full max-w-6xl px-4 py-10 sm:px-6'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <h1 className='text-2xl font-semibold text-slate-900'>
            Cart <span className='text-slate-400'>({summary.itemCount} items)</span>
          </h1>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className='rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300'
            >
              Clear cart
            </button>
          )}
        </div>

        <div className='mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]'>
          <div className='space-y-6'>
            <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
              <button className='flex w-full items-center justify-between text-left'>
                <div className='flex items-center gap-3'>
                  <span className='flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600'>
                    🚚
                  </span>
                  <div>
                    <p className='text-sm font-semibold text-slate-900'>Pickup and delivery options</p>
                    <p className='text-xs text-slate-500'>Shipping, arrives by Wed, Jan 21</p>
                  </div>
                </div>
                <span className='text-slate-400'>⌄</span>
              </button>
            </section>

            <section className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
              {items.length === 0 ? (
                <div className='text-center py-10'>
                  <p className='text-sm text-slate-500'>Your cart is empty.</p>
                  <Link
                    href='/'
                    className='mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white'
                  >
                    Continue shopping
                  </Link>
                </div>
              ) : (
                <div className='space-y-6'>
                  {items.map((item) => (
                    <div key={item.key} className='rounded-2xl border border-slate-200/70 p-4'>
                      <div className='flex flex-wrap gap-4'>
                        <div className='relative h-24 w-24 overflow-hidden rounded-xl bg-slate-100'>
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              sizes='96px'
                              className='object-cover'
                            />
                          ) : null}
                        </div>
                        <div className='flex-1 min-w-[220px]'>
                          <div className='flex items-start justify-between gap-3'>
                            <div>
                              <Link
                                href={buildProductHref(item)}
                                className='text-sm font-semibold text-slate-900 hover:underline'
                              >
                                {item.name}
                              </Link>
                              {item.selectedVariationLabel ? (
                                <p className='text-xs text-slate-500'>
                                  Variation: {item.selectedVariationLabel}
                                </p>
                              ) : null}
                              <p className='text-xs text-slate-500'>
                                {item.selectedColor && item.selectedColor !== 'default'
                                  ? `Color: ${item.selectedColor}`
                                  : 'Color: Standard'}
                              </p>
                              <p className='text-xs text-slate-500'>
                                {item.selectedSize && item.selectedSize !== 'default'
                                  ? `Size: ${item.selectedSize}`
                                  : 'Size: Standard'}
                              </p>
                            </div>
                            <div className='text-right'>
                              <p className='text-sm font-semibold text-slate-900'>
                                {formatMoney(item.price)}
                              </p>
                              {item.originalPrice ? (
                                <p className='text-xs text-slate-400 line-through'>
                                  {formatMoney(item.originalPrice)}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <div className='mt-4 flex flex-wrap items-center justify-between gap-3'>
                            <div className='flex items-center gap-2 text-xs text-slate-500'>
                              <button
                                onClick={() => removeItem(item.key)}
                                className='underline decoration-slate-200 hover:text-slate-700'
                              >
                                Remove
                              </button>
                              <button className='underline decoration-slate-200 hover:text-slate-700'>
                                Save for later
                              </button>
                            </div>

                            <div className='flex flex-col items-end gap-2'>
                              <QuantityControl
                                quantity={item.quantity}
                                onIncrement={() =>
                                  updateQuantity(item.key, item.quantity + 1)
                                }
                                onDecrement={() =>
                                  updateQuantity(item.key, item.quantity - 1)
                                }
                                size='sm'
                                isLoading={Boolean(item.isSyncing)}
                              />
                              {item.syncError ? (
                                <button
                                  onClick={() => retryItem(item.key)}
                                  className='text-[11px] text-rose-500 hover:text-rose-600'
                                >
                                  {item.syncError}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside ref={asideWrapRef} className='relative'>
            <div ref={asideRef} className='space-y-4' style={stickyStyle}>
              <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                <button className='w-full rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white'>
                  Continue to checkout
                </button>
                <div className='mt-4 rounded-2xl bg-slate-900 px-4 py-3 text-xs text-white'>
                  Items in your cart have reduced prices. Check out now for extra savings.
                </div>
                <p className='mt-3 text-xs text-slate-500'>
                  For the best shopping experience,{' '}
                  <Link href='/login' className='text-slate-900 font-semibold'>
                    sign in
                  </Link>
                </p>
              </div>

              <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                <div className='flex items-center justify-between text-sm text-slate-600'>
                  <span>Subtotal ({summary.itemCount} items)</span>
                  <span>{formatMoney(summary.subtotal)}</span>
                </div>
                <div className='mt-2 flex items-center justify-between text-sm text-slate-600'>
                  <span>Savings</span>
                  <span className='text-emerald-600'>-{formatMoney(summary.savings)}</span>
                </div>
                <div className='mt-2 flex items-center justify-between text-sm text-slate-600'>
                  <span>Shipping (below $35 order minimum)</span>
                  <span>{formatMoney(shippingFee)}</span>
                </div>
                <div className='mt-2 flex items-center justify-between text-sm text-slate-600'>
                  <span>Taxes</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className='mt-4 flex items-center justify-between text-base font-semibold text-slate-900'>
                  <span>Estimated total</span>
                  <span className='text-emerald-600'>{formatMoney(estimatedTotal)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
