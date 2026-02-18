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
import { normalizeReturnPolicyKey } from '@/lib/cart/return-policy'
import { getSelectionSummary } from '@/lib/cart/selection-summary'
import { buildVendorHref } from '@/lib/cart/vendor-link'

const CartCheckoutExperience = ({
  items,
  summary,
  formatMoney,
  addItem,
  updateQuantity,
  setItemProtection,
  setAllProtection,
  removeItem,
  clearCart,
  retryItem,
  isLoadingCart = false,
  checkoutProgressConfig,
}) => {
  const [relatedOffers, setRelatedOffers] = useState([])
  const [isLoadingRelated, setIsLoadingRelated] = useState(false)
  const [returnPolicyBySlug, setReturnPolicyBySlug] = useState({})
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
    <div className='min-h-screen bg-[#f3f4f6] text-slate-900'>
      <div className='w-full px-0 pb-16 pt-0 lg:mx-auto lg:max-w-7xl lg:px-4 lg:pt-0 xl:px-6'>
        <CartMobileExperience
          items={items}
          formatMoney={formatMoney}
          updateQuantity={updateQuantity}
          removeItem={removeItem}
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
                        retryItem={retryItem}
                        setItemProtection={setItemProtection}
                        orderProtectionConfig={summary.protectionConfig}
                        returnPolicyBySlug={returnPolicyBySlug}
                      />
                    ))}
                  </div>

                  <div className='flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3'>
                    <p className='text-xs text-slate-600'>
                      Buy With Confidence - 100% NO-RISK MONEY BACK GUARANTEE
                    </p>
                    <button type='button' className='text-xs font-semibold text-red-600 hover:text-red-700'>
                      Cancel Order
                    </button>
                  </div>
                </>
              ) : (
                <div className='px-4 py-10 text-center'>
                  <p className='text-sm text-slate-500'>Your cart is empty.</p>
                  <Link
                    href='/'
                    className='mt-4 inline-flex rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black'
                  >
                    Continue shopping
                  </Link>
                </div>
              )}
            </section>

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
