'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import CartMobileExperience from '@/components/cart/CartMobileExperience'
import CartItemRow from '@/components/cart/CartItemRow'
import CartItemSkeletonRow from '@/components/cart/CartItemSkeletonRow'
import CartCheckoutProgressBar from '@/components/cart/CartCheckoutProgressBar'
import CartSummaryPanel from '@/components/cart/CartSummaryPanel'
import SellerIcon from '@/components/cart/SellerIcon'
import emptyCartImage from '@/components/cart/empty-cart.webp'
import { normalizeReturnPolicyKey } from '@/lib/cart/return-policy'
import { getSelectionSummary } from '@/lib/cart/selection-summary'
import { buildVendorHref } from '@/lib/cart/vendor-link'

const toSet = (keys) => {
  const next = new Set()
  keys.forEach((key) => {
    if (key) next.add(key)
  })
  return next
}

const CartCheckoutExperience = ({
  items,
  summary,
  formatMoney,
  addItem,
  updateQuantity,
  setItemProtection,
  setAllProtection,
  removeItem,
  savedItems = [],
  saveForLater,
  moveToCart,
  removeSavedItem,
  clearCart,
  retryItem,
  isLoadingCart = false,
  checkoutProgressConfig,
}) => {
  const [relatedOffers, setRelatedOffers] = useState([])
  const [isLoadingRelated, setIsLoadingRelated] = useState(false)
  const [returnPolicyBySlug, setReturnPolicyBySlug] = useState({})
  const [selectedKeys, setSelectedKeys] = useState(new Set())
  const relatedSeedRef = useRef('')

  useEffect(() => {
    let cancelled = false

    const loadRelatedOffers = async () => {
      const compactCartItems = items.map((entry) => ({
        id: String(entry.id || ''),
        slug: String(entry.slug || ''),
        name: String(entry.name || ''),
      }))

      const relatedSeed = compactCartItems
        .map((entry) => `${entry.id}:${entry.slug}`)
        .sort()
        .join('|')

      if (relatedSeed === relatedSeedRef.current) {
        return
      }
      relatedSeedRef.current = relatedSeed

      if (!Array.isArray(compactCartItems) || compactCartItems.length === 0) {
        setRelatedOffers([])
        return
      }

      setIsLoadingRelated(true)

      try {
        const cartIds = new Set(compactCartItems.map((entry) => String(entry.id)))
        const cartSlugs = Array.from(
          new Set(
            compactCartItems
              .map((entry) => String(entry.slug || '').trim())
              .filter(Boolean),
          ),
        ).slice(0, 3)

        const productDetails = await Promise.all(
          cartSlugs.map(async (slug) => {
            const response = await fetch(`/api/products/${encodeURIComponent(slug)}`)
            if (!response.ok) return null
            const payload = await response.json().catch(() => null)
            return payload?.item || null
          }),
        )

        const categorySlugs = Array.from(
          new Set(
            productDetails
              .flatMap((product) => (Array.isArray(product?.categories) ? product.categories : []))
              .map((category) => String(category?.slug || '').trim())
              .filter(Boolean),
          ),
        ).slice(0, 2)

        let candidateProducts = []

        if (categorySlugs.length > 0) {
          const categoryPayloads = await Promise.all(
            categorySlugs.map(async (slug) => {
              const response = await fetch(
                `/api/products?category=${encodeURIComponent(slug)}&page=1&per_page=30`,
              )
              if (!response.ok) return []
              const payload = await response.json().catch(() => null)
              return Array.isArray(payload?.items) ? payload.items : []
            }),
          )
          candidateProducts = categoryPayloads.flat()
        } else {
          const fallbackTerm = String(compactCartItems[0]?.name || '')
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .join(' ')

          if (fallbackTerm) {
            const fallbackResponse = await fetch(
              `/api/products?search=${encodeURIComponent(fallbackTerm)}&page=1&per_page=30`,
            )
            if (fallbackResponse.ok) {
              const payload = await fallbackResponse.json().catch(() => null)
              candidateProducts = Array.isArray(payload?.items) ? payload.items : []
            }
          }
        }

        const seenIds = new Set()
        const normalized = candidateProducts
          .map((product) => {
            const id = String(product?.id || '')
            if (!id || seenIds.has(id) || cartIds.has(id)) return null
            seenIds.add(id)

            const basePrice = Number(product?.price) || 0
            const discountPrice = Number(product?.discount_price) || 0
            const hasDiscount = discountPrice > 0 && discountPrice < basePrice
            const discountAmount = hasDiscount ? basePrice - discountPrice : 0
            if (discountAmount < 5) return null

            const imageUrl = product?.image_url || product?.images?.[0]?.url || null

            return {
              id,
              slug: product?.slug || id,
              name: product?.name || 'Untitled product',
              image: imageUrl,
              price: discountPrice,
              originalPrice: basePrice,
              discountAmount,
              sourceName: String(product?.brands?.[0]?.name || 'OCPRIMES'),
              sourceSlug: String(product?.brands?.[0]?.slug || '').trim() || null,
            }
          })
          .filter(Boolean)
          .sort((a, b) => b.discountAmount - a.discountAmount)
          .slice(0, 6)

        if (!cancelled) {
          setRelatedOffers(normalized)
        }
      } catch {
        if (!cancelled) {
          setRelatedOffers([])
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRelated(false)
        }
      }
    }

    void loadRelatedOffers()

    return () => {
      cancelled = true
    }
  }, [items])

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

  const selectedCount = selectedKeys.size
  const isAllSelected = items.length > 0 && selectedCount === items.length

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
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  useEffect(() => {
    let cancelled = false

    const hydrateReturnPolicies = async () => {
      const nextFromItems = {}
      const missingSlugs = []

      items.forEach((item) => {
        const slug = String(item?.slug || '').trim()
        if (!slug) return
        const key = normalizeReturnPolicyKey(item?.returnPolicy)
        if (key) {
          nextFromItems[slug] = key
          return
        }
        missingSlugs.push(slug)
      })

      if (!cancelled && Object.keys(nextFromItems).length > 0) {
        setReturnPolicyBySlug((prev) => ({ ...prev, ...nextFromItems }))
      }

      const uniqueMissing = Array.from(new Set(missingSlugs)).filter(
        (slug) => !nextFromItems[slug],
      )
      if (uniqueMissing.length <= 0) return

      const fetched = await Promise.all(
        uniqueMissing.map(async (slug) => {
          try {
            const response = await fetch(`/api/products/${encodeURIComponent(slug)}`)
            if (!response.ok) return [slug, '']
            const payload = await response.json().catch(() => null)
            return [slug, normalizeReturnPolicyKey(payload?.item?.returnPolicy)]
          } catch {
            return [slug, '']
          }
        }),
      )

      if (cancelled) return
      const nextFetched = {}
      fetched.forEach(([slug, key]) => {
        if (!slug || !key) return
        nextFetched[slug] = key
      })
      if (Object.keys(nextFetched).length > 0) {
        setReturnPolicyBySlug((prev) => ({ ...prev, ...nextFetched }))
      }
    }

    void hydrateReturnPolicies()

    return () => {
      cancelled = true
    }
  }, [items])

  return (
    <div className='min-h-screen bg-white text-slate-900 lg:bg-[#f3f4f6]'>
      <div className='w-full px-0 pb-16 pt-0 lg:mx-auto lg:max-w-7xl lg:px-4 lg:pt-0 xl:px-6'>
        <CartMobileExperience
          items={items}
          savedItems={savedItems}
          formatMoney={formatMoney}
          updateQuantity={updateQuantity}
          removeItem={removeItem}
          saveForLater={saveForLater}
          moveToCart={moveToCart}
          removeSavedItem={removeSavedItem}
          retryItem={retryItem}
          clearCart={clearCart}
          isLoadingCart={isLoadingCart}
          checkoutProgressConfig={checkoutProgressConfig}
          subtotal={summary.subtotal}
          setItemProtection={setItemProtection}
          orderProtectionConfig={summary.protectionConfig}
          returnPolicyBySlug={returnPolicyBySlug}
        />

        <div className='mt-3 hidden lg:block'>
          <CartCheckoutProgressBar
            subtotal={summary.subtotal}
            formatMoney={formatMoney}
            config={checkoutProgressConfig}
          />

          <div className='mt-4 grid gap-5 lg:grid-cols-[1.65fr_0.95fr]'>
            <main className='space-y-4 overflow-visible'>
            <section
              className='rounded-xl border border-slate-200 bg-white overflow-visible'
              style={{ overflowY: 'visible', maxHeight: 'none' }}
            >
              <div className='flex items-center justify-between px-4 py-3'>
                <h1 className='text-base font-semibold text-slate-900'>Shopping Cart</h1>
                {items.length > 0 ? (
                  <button
                    type='button'
                    onClick={clearCart}
                    className='text-xs font-semibold text-slate-500 hover:text-slate-700'
                  >
                    Clear
                  </button>
                ) : null}
              </div>

              {isLoadingCart ? (
                <>
                  <div className='hidden border-y border-slate-200 px-4 py-2 text-[11px] uppercase tracking-wide text-slate-500 sm:grid sm:grid-cols-[1.7fr_0.6fr_0.5fr_0.1fr]'>
                    <span>Product</span>
                    <span className='text-center'>Quantity</span>
                    <span className='text-right'>Price</span>
                    <span />
                  </div>
                  <div className='overflow-visible' style={{ overflowY: 'visible', maxHeight: 'none' }}>
                    <CartItemSkeletonRow />
                    <CartItemSkeletonRow />
                    <CartItemSkeletonRow />
                  </div>
                </>
              ) : items.length > 0 ? (
                <>
                  <div className='border-y border-slate-200 bg-slate-50/70 px-4 py-2'>
                    <div className='flex items-center gap-2 text-xs'>
                      <button
                        type='button'
                        onClick={toggleAll}
                        className='inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-1 text-slate-700'
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
                        Select all ({items.length})
                      </button>
                      <span className='rounded-full border border-slate-900 bg-slate-900 px-2 py-1 text-white'>
                        Selected ({selectedCount})
                      </span>
                    </div>
                  </div>

                  <div className='hidden border-y border-slate-200 px-4 py-2 text-[11px] uppercase tracking-wide text-slate-500 sm:grid sm:grid-cols-[1.7fr_0.6fr_0.5fr_0.1fr]'>
                    <span>Product</span>
                    <span className='text-center'>Quantity</span>
                    <span className='text-right'>Price</span>
                    <span />
                  </div>

                  <div className='overflow-visible' style={{ overflowY: 'visible', maxHeight: 'none' }}>
                    {items.map((item) => (
                      <CartItemRow
                        key={item.key}
                        item={item}
                        formatMoney={formatMoney}
                        updateQuantity={updateQuantity}
                        removeItem={removeItem}
                        onSaveForLater={saveForLater}
                        retryItem={retryItem}
                        setItemProtection={setItemProtection}
                        orderProtectionConfig={summary.protectionConfig}
                        returnPolicyBySlug={returnPolicyBySlug}
                        showSelection
                        isSelected={selectedKeys.has(item.key)}
                        onToggleSelect={toggleItem}
                      />
                    ))}
                  </div>

                </>
              ) : (
                <div className='flex min-h-[240px] flex-col items-center justify-center px-4 py-6 text-center'>
                  <Image
                    src={emptyCartImage}
                    alt='Empty cart stroller'
                    className='mb-0 h-[14rem] w-[20rem] object-cover object-center'
                    draggable={false}
                  />
                  <Link
                    href='/'
                    className='mt-0 inline-flex rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black'
                  >
                    Continue shopping
                  </Link>
                </div>
              )}
            </section>

            {savedItems.length > 0 ? (
              <section className='rounded-xl border border-slate-200 bg-white'>
                <div className='border-b border-slate-200 px-4 py-3'>
                  <h2 className='text-sm font-semibold text-slate-900'>
                    Saved for later ({savedItems.length})
                  </h2>
                </div>
                <div>
                  {savedItems.map((item) => (
                    <article
                      key={`saved-${item.key}`}
                      className='grid grid-cols-1 gap-3 border-b border-slate-200 px-4 py-3 last:border-b-0 sm:grid-cols-[1.6fr_0.4fr_0.6fr] sm:items-center'
                    >
                      <div className='flex items-center gap-3'>
                        <div className='relative h-16 w-16 overflow-hidden rounded-md border border-slate-200 bg-slate-100'>
                          {item.image ? (
                            <Image src={item.image} alt={item.name} fill sizes='64px' className='object-cover' />
                          ) : null}
                        </div>
                        <div className='min-w-0'>
                          <p className='line-clamp-2 text-sm font-semibold text-slate-900'>{item.name}</p>
                          <p className='line-clamp-1 text-xs text-slate-500'>{getSelectionSummary(item)}</p>
                        </div>
                      </div>
                      <p className='text-sm font-semibold text-slate-900 sm:text-right'>
                        {formatMoney(item.price)}
                      </p>
                      <div className='flex items-center gap-3 sm:justify-end'>
                        <button
                          type='button'
                          onClick={() => moveToCart(item.key)}
                          className='text-xs font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900'
                        >
                          Move to cart
                        </button>
                        <button
                          type='button'
                          onClick={() => removeSavedItem(item.key)}
                          className='inline-flex h-7 w-7 items-center justify-center rounded-full text-rose-500 hover:bg-rose-50 hover:text-rose-600'
                          aria-label='Remove saved item'
                        >
                          <svg viewBox='-7.29 0 122.88 122.88' className='h-3.5 w-3.5 fill-current' aria-hidden='true'>
                            <path d='M77.4,49.1h-5.94v56.09h5.94V49.1L77.4,49.1L77.4,49.1z M6.06,9.06h32.16V6.2c0-0.1,0-0.19,0.01-0.29 c0.13-2.85,2.22-5.25,5.01-5.79C43.97-0.02,44.64,0,45.38,0H63.9c0.25,0,0.49-0.01,0.73,0.02c1.58,0.08,3.02,0.76,4.06,1.81 c1.03,1.03,1.69,2.43,1.79,3.98c0.01,0.18,0.02,0.37,0.02,0.55v2.7H103c0.44,0,0.75,0.01,1.19,0.08c2.21,0.36,3.88,2.13,4.07,4.37 c0.02,0.24,0.03,0.47,0.03,0.71v10.54c0,1.47-1.19,2.66-2.67,2.66H2.67C1.19,27.43,0,26.23,0,24.76V24.7v-9.91 C0,10.64,2.04,9.06,6.06,9.06L6.06,9.06z M58.07,49.1h-5.95v56.09h5.95V49.1L58.07,49.1L58.07,49.1z M38.74,49.1H32.8v56.09h5.95 V49.1L38.74,49.1L38.74,49.1z M10.74,31.57h87.09c0.36,0.02,0.66,0.04,1.03,0.1c1.25,0.21,2.4,0.81,3.27,1.66 c1.01,1,1.67,2.34,1.7,3.83c0,0.31-0.03,0.63-0.06,0.95l-7.33,78.66c-0.1,1.03-0.27,1.95-0.79,2.92c-1.01,1.88-2.88,3.19-5.2,3.19 H18.4c-0.55,0-1.05,0-1.59-0.08c-0.22-0.03-0.43-0.08-0.64-0.14c-0.31-0.09-0.62-0.21-0.91-0.35c-0.27-0.13-0.52-0.27-0.78-0.45 c-1.51-1.04-2.51-2.78-2.69-4.72L4.5,37.88c-0.02-0.25-0.04-0.52-0.04-0.77c0.05-1.48,0.7-2.8,1.7-3.79 c0.88-0.86,2.06-1.47,3.33-1.67C9.9,31.59,10.34,31.57,10.74,31.57L10.74,31.57z M97.75,36.9H10.6c-0.57,0-0.84,0.1-0.79,0.7 l7.27,79.05h0l0,0.01c0.03,0.38,0.2,0.69,0.45,0.83l0,0l0.08,0.03l0.06,0.01l0.08,0h72.69c0.6,0,0.67-0.84,0.71-1.28l7.34-78.71 C98.53,37.04,98.23,36.9,97.75,36.9L97.75,36.9z' />
                          </svg>
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {relatedOffers.length > 0 ? (
              <section className='rounded-xl border border-slate-200 bg-white'>
                <div className='border-b border-slate-200 px-4 py-3'>
                  <h2 className='text-sm font-semibold text-slate-900'>
                    You may also be Interested in these exclusive offers.
                  </h2>
                </div>

                <div>
                  {relatedOffers.map((item) => (
                    <article
                      key={`offer-${item.id}`}
                      className='grid grid-cols-1 gap-3 border-b border-slate-200 px-4 py-3 last:border-b-0 sm:grid-cols-[1.7fr_0.5fr_0.5fr] sm:items-center'
                    >
                      <div className='flex items-center gap-3'>
                        <div className='relative h-14 w-14 overflow-hidden rounded-md border border-slate-200 bg-slate-100'>
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              sizes='56px'
                              className='object-cover'
                            />
                          ) : null}
                        </div>
                        <div>
                          <div className='mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700'>
                            <SellerIcon className='h-4 w-4 text-slate-600' />
                            <Link
                              href={buildVendorHref({
                                slug: item?.sourceSlug,
                                name: item?.sourceName,
                              })}
                              className='line-clamp-1 hover:underline'
                            >
                              {item.sourceName}
                            </Link>
                            <svg
                              viewBox='0 0 20 20'
                              className='h-3.5 w-3.5 text-slate-500'
                              fill='none'
                              stroke='currentColor'
                              strokeWidth='2'
                              aria-hidden='true'
                            >
                              <path d='M8 5l5 5-5 5' strokeLinecap='round' strokeLinejoin='round' />
                            </svg>
                          </div>
                          <p className='text-sm font-semibold text-slate-900'>{item.name}</p>
                          <p className='line-clamp-1 text-[11px] text-slate-500'>
                            {getSelectionSummary(item)}
                          </p>
                        </div>
                      </div>

                      <div className='sm:text-right'>
                        <p className='text-sm font-semibold text-slate-900'>{formatMoney(item.price)}</p>
                        {item.originalPrice ? (
                          <p className='text-xs text-slate-400 line-through'>{formatMoney(item.originalPrice)}</p>
                        ) : null}
                      </div>

                      <div className='sm:text-right'>
                        <button
                          type='button'
                          onClick={() => addItem(item, 1)}
                          className='rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400'
                        >
                          Add to Cart
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
            </main>

            <aside>
              <div>
                <CartSummaryPanel
                  summary={summary}
                  formatMoney={formatMoney}
                  setAllProtection={setAllProtection}
                  selectedKeys={selectedKeys}
                  selectedItems={items.filter((item) => selectedKeys.has(item.key))}
                />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartCheckoutExperience
