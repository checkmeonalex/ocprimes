'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { MouseEvent } from 'react'
import { BadgePercent, Heart, Star } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
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
  createdAt?: string | null
  price: number
  originalPrice?: number | null
  stock?: number | null
  rating?: number
  reviews?: number
  selectedVariationId?: string | number | null
  selectedColor?: string | null
  selectedSize?: string | null
}

type RelatedProductsSectionProps = {
  title?: string
  subtitle?: string
  items: RelatedProduct[]
  seeAllHref?: string
}

const RelatedProductsSection = ({
  title = 'Just for you',
  subtitle = 'Inspired Choices',
  items,
  seeAllHref,
}: RelatedProductsSectionProps) => {
  const { addItem, items: cartItems, updateQuantity } = useCart()
  const { openSaveModal, isRecentlySaved } = useWishlist()
  const now = Date.now()
  if (!Array.isArray(items) || items.length === 0) return null

  return (
    <section className='border-t border-gray-100'>
      <div className='px-1 pb-1 pt-1 sm:pb-2'>
        <p className='text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 sm:text-xs'>
          {subtitle}
        </p>
        <div className='mt-2 flex items-center gap-4 sm:gap-6'>
          <span className='h-px flex-1 bg-gray-300' />
          <h2 className='shrink-0 text-center font-serif text-[2rem] font-semibold leading-none text-gray-900 sm:text-[2.4rem]'>
            {title}
          </h2>
          <span className='h-px flex-1 bg-gray-300' />
        </div>
      </div>

      <div className='mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
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
          const stockCount = Number(product.stock || 0)
          const showLowStockWarning = stockCount > 0 && stockCount <= 3
          const savingsAmount =
            product.originalPrice && product.originalPrice > product.price
              ? product.originalPrice - product.price
              : 0
          const createdAtTimestamp = new Date(String(product.createdAt || '')).getTime()
          const ageMs = Number.isNaN(createdAtTimestamp) ? Number.POSITIVE_INFINITY : now - createdAtTimestamp
          const isNewProduct = ageMs >= 0 && ageMs <= 12 * 60 * 60 * 1000

          const hasImage = Boolean(product.image)
          const isSaved = isRecentlySaved(product?.id)

          const selection = {
            id: product.id,
            selectedVariationId: product.selectedVariationId,
            selectedColor: product.selectedColor,
            selectedSize: product.selectedSize,
          }
          const cartEntry = findCartEntry(cartItems, selection)
          const quantity = cartEntry?.quantity || 0

          const handleAddToCart = (event?: MouseEvent<HTMLButtonElement>) => {
            event?.preventDefault()
            addItem({
              id: product.id,
              name: product.name,
              slug: product.slug,
              price: product.price,
              originalPrice: product.originalPrice,
              image: product.image,
            })
          }
          const handleIncrement = (event?: MouseEvent<HTMLButtonElement>) => {
            event?.preventDefault()
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
          }

          const handleDecrement = (event?: MouseEvent<HTMLButtonElement>) => {
            event?.preventDefault()
            if (cartEntry?.key) {
              updateQuantity(cartEntry.key, Math.max(0, quantity - 1))
            }
          }

          return (
            <Link
              key={product.slug}
              href={`/product/${product.slug}`}
              className='group min-w-0'
            >
              <div className='relative h-full min-w-0 overflow-hidden bg-white p-2 shadow-sm transition hover:shadow-md sm:p-3'>
                <div className='relative aspect-square overflow-hidden border border-gray-200 bg-gray-100'>
                  {isNewProduct ? (
                    <div className='absolute left-2 top-2 z-10 inline-flex items-center rounded-full bg-yellow-300 px-2.5 py-1 text-[10px] font-semibold text-yellow-900'>
                      <span>New</span>
                    </div>
                  ) : discountPercentage ? (
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
                    aria-pressed={isSaved}
                    className={`absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full shadow-sm backdrop-blur-md transition wishlist-heart-shell ${
                      isSaved ? 'wishlist-heart-shell--active' : ''
                    }`}
                    onClick={(event) => {
                      event.preventDefault()
                      openSaveModal({
                        id: product.id,
                        name: product.name,
                        slug: product.slug,
                        price: product.price,
                        image: product.image,
                      })
                    }}
                  >
                    <Heart size={18} className={isSaved ? 'fill-current wishlist-heart-pop' : ''} />
                  </button>
                </div>

                <div className='mt-2 min-w-0 flex flex-col'>
                  <h3 className='text-sm font-semibold text-gray-900 line-clamp-2 leading-tight'>
                    {product.name}
                  </h3>
                  <div className='mt-1 min-w-0 flex flex-wrap items-baseline gap-1.5'>
                    <span className='text-base font-semibold text-gray-900'>
                      ${formatPrice(product.price)}
                    </span>
                    {product.originalPrice ? (
                      <span className='text-sm text-gray-400 line-through'>
                        ${formatPrice(product.originalPrice)}
                      </span>
                      ) : null}
                  </div>
                  <div className='mt-1 min-h-[18px]'>
                    {savingsAmount > 0 ? (
                      <span className='text-xs font-semibold text-green-600'>
                        Save ${formatPrice(savingsAmount)}
                      </span>
                    ) : null}
                  </div>
                  {showRating ? (
                    <div className='mt-1 min-w-0 flex items-center gap-2 text-xs text-gray-500'>
                      <Star className='h-4 w-4 text-amber-500 fill-amber-500' />
                      <span className='font-semibold text-gray-800'>
                        {rating.toFixed(1)}
                      </span>
                      {reviews > 0 ? <span>({reviews})</span> : null}
                    </div>
                  ) : null}
                  {showLowStockWarning ? (
                    <div className='mt-1'>
                      <span className='flex items-center gap-1 text-xs font-semibold text-orange-600'>
                        <svg
                          width='12'
                          height='12'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                        >
                          <path d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' />
                        </svg>
                        Only {stockCount} left in stock
                      </span>
                    </div>
                  ) : null}
                  <div className='mt-1 flex items-center justify-end gap-2'>
                    {quantity > 0 ? (
                      <div className='shrink-0'>
                        <QuantityControl
                          quantity={quantity}
                          onIncrement={handleIncrement}
                          onDecrement={handleDecrement}
                          size='sm'
                          isLoading={Boolean(cartEntry?.isSyncing)}
                          appearance='solid'
                          stylePreset='card'
                        />
                      </div>
                    ) : (
                      <button
                        type='button'
                        aria-label='Add to cart'
                        onClick={handleAddToCart}
                        className='h-9 w-9 shrink-0 rounded-lg border-2 border-gray-300 bg-white text-gray-600 flex items-center justify-center transition-all duration-200 group/btn hover:border-gray-400 hover:bg-gray-50'
                      >
                        {Boolean(cartEntry?.isSyncing) ? (
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
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {seeAllHref ? (
        <div className='mt-3 flex justify-center'>
          <Link
            href={seeAllHref}
            className='inline-flex items-center justify-center gap-1.5 rounded-full border border-black bg-transparent px-4 py-2 text-sm font-semibold text-black transition hover:bg-black/5'
          >
            <span>See more</span>
            <svg
              viewBox='0 0 20 20'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              className='h-4 w-4'
              aria-hidden='true'
            >
              <path d='M8 6l4 4-4 4' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </Link>
        </div>
      ) : null}
    </section>
  )
}

export default RelatedProductsSection
