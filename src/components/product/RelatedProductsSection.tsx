'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import type { MouseEvent } from 'react'
import { BadgePercent, Heart, Star } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import QuantityControl from '@/components/cart/QuantityControl'
import { findCartEntry } from '@/lib/cart/cart-match'

const formatPrice = (value: number) => {
  if (!Number.isFinite(value)) return '--'
  return value.toFixed(2)
}

type RelatedProduct = {
  id?: string | number
  slug: string
  name: string
  image: string
  price: number
  originalPrice?: number | null
  rating?: number
  reviews?: number
}

type RelatedProductsSectionProps = {
  title?: string
  items: RelatedProduct[]
  seeAllHref?: string
}

const RelatedProductsSection = ({
  title = 'For You',
  items,
  seeAllHref,
}: RelatedProductsSectionProps) => {
  if (!Array.isArray(items) || items.length === 0) return null
  const { addItem, items: cartItems, updateQuantity } = useCart()
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null)

  return (
    <section className='border-t border-gray-100 px-6 pb-6 pt-5'>
      <div className='flex items-center justify-between'>
        <h2 className='text-base font-semibold text-gray-900'>{title}</h2>
        {seeAllHref ? (
          <Link
            href={seeAllHref}
            className='text-sm font-semibold text-amber-600 hover:text-amber-700 transition'
          >
            See All
          </Link>
        ) : null}
      </div>

      <div className='mt-4 grid gap-0 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
        {items.map((product) => {
          const discountPercentage =
            product.originalPrice && product.originalPrice > product.price
              ? Math.max(
                  1,
                  Math.round(
                    ((product.originalPrice - product.price) /
                      product.originalPrice) *
                      100,
                  ),
                )
              : null
          const rating = Number(product.rating || 0)
          const reviews = Number(product.reviews || 0)
          const showRating = rating > 0

          const hasImage = Boolean(product.image)

          const selection = {
            id: product.id,
            selectedVariationId: product.selectedVariationId,
            selectedColor: product.selectedColor,
            selectedSize: product.selectedSize,
          }
          const cartEntry = findCartEntry(cartItems, selection)
          const quantity = cartEntry?.quantity || 0

          const handleAddToCart = (event: MouseEvent<HTMLButtonElement>) => {
            event.preventDefault()
            if (loadingSlug === product.slug) return
            setLoadingSlug(product.slug)
            addItem({
              id: product.id,
              name: product.name,
              slug: product.slug,
              price: product.price,
              originalPrice: product.originalPrice,
              image: product.image,
            })
            window.setTimeout(() => {
              setLoadingSlug((current) =>
                current === product.slug ? null : current
              )
            }, 700)
          }
          const handleIncrement = (event: MouseEvent<HTMLButtonElement>) => {
            event.preventDefault()
            if (loadingSlug === product.slug) return
            setLoadingSlug(product.slug)
            if (cartEntry?.key) {
              updateQuantity(cartEntry.key, quantity + 1)
            } else {
              addItem({
                id: product.id,
                name: product.name,
                slug: product.slug,
                price: product.price,
                originalPrice: product.originalPrice,
                image: product.image,
              })
            }
            window.setTimeout(() => {
              setLoadingSlug((current) =>
                current === product.slug ? null : current
              )
            }, 700)
          }

          const handleDecrement = (event: MouseEvent<HTMLButtonElement>) => {
            event.preventDefault()
            if (loadingSlug === product.slug) return
            setLoadingSlug(product.slug)
            if (cartEntry?.key) {
              updateQuantity(cartEntry.key, Math.max(0, quantity - 1))
            }
            window.setTimeout(() => {
              setLoadingSlug((current) =>
                current === product.slug ? null : current
              )
            }, 700)
          }

          return (
            <Link
              key={product.slug}
              href={`/product/${product.slug}`}
              className='group'
            >
              <div className='relative h-full bg-white p-3 shadow-sm transition hover:shadow-md'>
                <div className='relative aspect-square overflow-hidden border border-gray-200 bg-gray-100'>
                  {discountPercentage ? (
                    <div className='absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-1 text-[10px] font-semibold text-white'>
                      <BadgePercent className='h-4 w-4' />
                      <span>-{discountPercentage}%</span>
                    </div>
                  ) : null}
                  {hasImage ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes='(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 200px'
                      className='object-cover'
                    />
                  ) : (
                    <div className='flex h-full w-full items-center justify-center text-xs text-gray-400'>
                      No image
                    </div>
                  )}
                  <button
                    type='button'
                    aria-label='Save item'
                    className='absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/40 text-white shadow-sm backdrop-blur-md transition hover:bg-white/55'
                    onClick={(event) => event.preventDefault()}
                  >
                    <Heart size={18} />
                  </button>
                </div>

                <div className='mt-2 space-y-1'>
                  <h3 className='text-sm font-semibold text-gray-900 line-clamp-2 leading-tight'>
                    {product.name}
                  </h3>
                  <div className='flex items-center justify-between gap-3'>
                    <div className='flex items-baseline gap-2'>
                      <span className='text-base font-semibold text-gray-900'>
                        ${formatPrice(product.price)}
                      </span>
                      {product.originalPrice ? (
                        <span className='text-sm text-gray-400 line-through'>
                          ${formatPrice(product.originalPrice)}
                        </span>
                      ) : null}
                    </div>
                    {quantity > 0 ? (
                      <QuantityControl
                        quantity={quantity}
                        onIncrement={handleIncrement}
                        onDecrement={handleDecrement}
                        size='sm'
                        isLoading={Boolean(cartEntry?.isSyncing)}
                      />
                    ) : (
                      <button
                        type='button'
                        aria-label='Add to cart'
                        onClick={handleAddToCart}
                        className={`h-9 w-9 shrink-0 rounded-lg border-2 border-gray-300 bg-white text-gray-600 flex items-center justify-center transition-all duration-200 group/btn ${
                          loadingSlug === product.slug
                            ? 'cursor-wait opacity-70'
                            : 'hover:border-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        {loadingSlug === product.slug ? (
                          <span className='h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600' />
                        ) : (
                          <svg
                            width='22'
                            height='22'
                            viewBox='-3.2 -3.2 38.40 38.40'
                            fill='currentColor'
                            className='group-hover/btn:scale-110 transition-transform duration-200'
                          >
                            <circle cx='10' cy='28' r='2'></circle>
                            <circle cx='24' cy='28' r='2'></circle>
                            <path d='M4.9806,2.8039A1,1,0,0,0,4,2H0V4H3.18L7.0194,23.1961A1,1,0,0,0,8,24H26V22H8.82l-.8-4H26a1,1,0,0,0,.9762-.783L29.2445,7H27.1971l-1.9989,9H7.62Z'></path>
                            <polygon points='18 6 18 2 16 2 16 6 12 6 12 8 16 8 16 12 18 12 18 8 22 8 22 6 18 6'></polygon>
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                  <div className='flex items-center gap-2 text-xs text-gray-500'>
                    {showRating ? (
                      <>
                        <Star className='h-4 w-4 text-amber-500 fill-amber-500' />
                        <span className='font-semibold text-gray-800'>
                          {rating.toFixed(1)}
                        </span>
                        {reviews > 0 ? <span>({reviews})</span> : null}
                      </>
                    ) : (
                      <span className='text-gray-400'>New</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default RelatedProductsSection
