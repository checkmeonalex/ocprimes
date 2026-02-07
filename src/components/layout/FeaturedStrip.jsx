'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import useHorizontalScroll from '@/components/shared/useHorizontalScroll.mjs'
import { useWishlist } from '@/context/WishlistContext'
import SectionHeading from './SectionHeading'

const formatPrice = (value) => {
  if (!Number.isFinite(value)) return '--'
  return value.toFixed(2)
}

const resolveProductImage = (product) => {
  if (!product || typeof product !== 'object') return ''
  if (typeof product.image === 'string' && product.image.trim()) return product.image.trim()
  if (typeof product.image_url === 'string' && product.image_url.trim()) return product.image_url.trim()
  const firstImage = Array.isArray(product.images) ? product.images[0] : null
  if (typeof firstImage === 'string' && firstImage.trim()) return firstImage.trim()
  if (firstImage && typeof firstImage === 'object' && typeof firstImage.url === 'string') {
    return firstImage.url.trim()
  }
  return ''
}

const normalizeMatchValue = (value) => String(value || '').trim().toLowerCase()

const matchesByIdOrSlug = (items, target) => {
  if (!target || !Array.isArray(items)) return false
  const needle = normalizeMatchValue(target)
  return items.some((item) => {
    if (item == null) return false
    if (typeof item === 'string' || typeof item === 'number') {
      return normalizeMatchValue(item) === needle
    }
    return (
      item?.id === target ||
      normalizeMatchValue(item?.id) === needle ||
      normalizeMatchValue(item?.slug) === needle ||
      normalizeMatchValue(item?.name) === needle
    )
  })
}

const DesktopProductCard = ({ product }) => {
  const { openSaveModal, isRecentlySaved } = useWishlist()
  const imageSrc = resolveProductImage(product)
  const isSaved = isRecentlySaved(product?.id)
  const handleWishlist = (event) => {
    event.preventDefault()
    event.stopPropagation()
    openSaveModal({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image: imageSrc,
    })
  }

  return (
    <Link
      href={`/product/${product.slug}`}
      className='group w-[190px] flex-none'
    >
      <div className='flex h-[280px] flex-col overflow-hidden rounded-xl border border-gray-200/70 bg-white transition hover:shadow-md'>
        <div className='relative h-[170px] w-full overflow-hidden rounded-t-xl bg-gray-50'>
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={product.name}
              className='h-full w-full object-cover transition duration-300 group-hover:scale-105'
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
            onClick={handleWishlist}
            className={`absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full shadow-sm backdrop-blur-md transition wishlist-heart-shell ${
              isSaved ? 'wishlist-heart-shell--active' : ''
            }`}
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='18'
              height='18'
              viewBox='0 0 24 24'
              fill={isSaved ? 'currentColor' : 'none'}
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className={isSaved ? 'wishlist-heart-pop' : ''}
              aria-hidden='true'
            >
              <path d='M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'></path>
            </svg>
          </button>
        </div>
        <div className='flex-1 p-3'>
          <div className='text-xs font-semibold text-gray-900 line-clamp-2'>
            {product.name}
          </div>
          <div className='mt-2 flex items-baseline gap-2'>
            <span className='text-sm font-semibold text-gray-900'>
              ${formatPrice(product.price)}
            </span>
            {product.originalPrice ? (
              <span className='text-xs text-gray-400 line-through'>
                ${formatPrice(product.originalPrice)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  )
}

const MobileProductCard = ({ product, onAddToCart }) => {
  const { openSaveModal, isRecentlySaved } = useWishlist()
  const imageSrc = resolveProductImage(product)
  const isSaved = isRecentlySaved(product?.id)
  const handleAdd = () => {
    if (typeof onAddToCart === 'function') {
      onAddToCart(product)
    }
  }
  const handleWishlist = (event) => {
    event.preventDefault()
    event.stopPropagation()
    openSaveModal({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image: imageSrc,
    })
  }

  return (
    <div className='w-[260px] flex-none rounded-xl border border-gray-200/70 bg-white p-2 transition hover:border-orange-400/80 focus-within:border-orange-400/80'>
      <div className='flex items-start gap-3'>
        <Link
          href={`/product/${product.slug}`}
          className='relative h-[90px] w-[90px] flex-shrink-0 overflow-hidden rounded-lg border border-gray-200/70 bg-gray-50'
        >
          {imageSrc ? (
            <img src={imageSrc} alt={product.name} className='h-full w-full object-cover' />
          ) : (
            <div className='flex h-full w-full items-center justify-center text-[10px] text-gray-400'>
              No image
            </div>
          )}
          <button
            type='button'
            aria-label='Save item'
            aria-pressed={isSaved}
            onClick={handleWishlist}
            className={`absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full shadow-sm backdrop-blur-md transition wishlist-heart-shell ${
              isSaved ? 'wishlist-heart-shell--active' : ''
            }`}
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill={isSaved ? 'currentColor' : 'none'}
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className={isSaved ? 'wishlist-heart-pop' : ''}
              aria-hidden='true'
            >
              <path d='M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'></path>
            </svg>
          </button>
        </Link>
        <div className='flex-1'>
          <Link
            href={`/product/${product.slug}`}
            className='text-xs font-semibold text-gray-900 line-clamp-2'
          >
            {product.name}
          </Link>
          <div className='mt-1 flex items-baseline gap-2'>
            <span className='text-sm font-semibold text-gray-900'>
              ${formatPrice(product.price)}
            </span>
            {product.originalPrice ? (
              <span className='text-xs text-gray-400 line-through'>
                ${formatPrice(product.originalPrice)}
              </span>
            ) : null}
          </div>
          <button
            type='button'
            onClick={handleAdd}
            className='mt-2 w-full rounded-full bg-yellow-400 px-3 py-2 text-sm font-semibold text-gray-900 transition hover:bg-yellow-300'
          >
            Add to cart
          </button>
        </div>
      </div>
    </div>
  )
}

const FeaturedStrip = ({
  imageUrl,
  imageAlt = 'Featured',
  products = [],
  tagId,
  categoryId,
  onAddToCart,
  titleMain,
  className = '',
}) => {
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return []
    if (tagId) {
      const matched = products.filter((product) => matchesByIdOrSlug(product.tags, tagId))
      if (matched.length) return matched
      // Keep strip visible even when configured tag currently has no in-batch matches.
      return products
    }
    if (categoryId) {
      const matched = products.filter((product) =>
        matchesByIdOrSlug(product.categories, categoryId),
      )
      if (matched.length) return matched
      // Keep strip visible even when configured category currently has no in-batch matches.
      return products
    }
    // No filter configured: show the newest products so uploaded strip still renders.
    return products
  }, [products, tagId, categoryId])

  const productsWithImage = filteredProducts.filter((product) => Boolean(resolveProductImage(product)))
  const displayProducts = productsWithImage.slice(0, 15)
  const mobileProducts = displayProducts
  const { scrollRef, canScrollLeft, canScrollRight, scrollByAmount } =
    useHorizontalScroll({ step: 220 })

  const hasImage = Boolean(imageUrl)
  const hasProducts = displayProducts.length > 0
  if (!hasImage && !hasProducts) return null

  return (
    <section className={`mb-10 w-full max-w-full overflow-hidden px-3 md:px-4 ${className}`}>
      <SectionHeading title={titleMain} />
      <div className='flex flex-col gap-2 md:flex-row md:gap-2'>
        {hasImage ? (
          <div className='relative overflow-hidden rounded-lg border border-gray-300/80 bg-white aspect-[16/9] md:h-[280px] md:w-auto md:flex-shrink-0'>
            <img src={imageUrl} alt={imageAlt} className='h-full w-full object-cover' />
          </div>
        ) : null}
        <div className='flex-1 min-w-0'>
          <div className='hidden md:block'>
            <div className='relative'>
              {hasProducts ? (
                <>
                  <div
                    ref={scrollRef}
                    className='featured-scroll flex items-stretch gap-2 overflow-x-auto pb-2 pr-1'
                  >
                    {displayProducts.map((product) => (
                      <DesktopProductCard key={product.id} product={product} />
                    ))}
                  </div>
                  {canScrollLeft && (
                    <button
                      type='button'
                      onClick={() => scrollByAmount(-1)}
                      className='absolute left-2 top-1/2 -translate-y-1/2 h-14 w-9 rounded-2xl bg-white text-gray-700 shadow-md hover:bg-white flex items-center justify-center border border-gray-200/70'
                      aria-label='Scroll products left'
                    >
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        viewBox='0 0 1024 1024'
                        className='h-7 w-7'
                        fill='none'
                      >
                        <path
                          d='M664 200 L344 512 L664 824'
                          stroke='currentColor'
                          strokeWidth='44'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                      </svg>
                    </button>
                  )}
                  {canScrollRight && (
                    <button
                      type='button'
                      onClick={() => scrollByAmount(1)}
                      className='absolute right-2 top-1/2 -translate-y-1/2 h-14 w-9 rounded-2xl bg-white text-gray-700 shadow-md hover:bg-white flex items-center justify-center border border-gray-200/70'
                      aria-label='Scroll products right'
                    >
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        viewBox='0 0 1024 1024'
                        className='h-7 w-7'
                        fill='none'
                      >
                        <path
                          d='M360 200 L680 512 L360 824'
                          stroke='currentColor'
                          strokeWidth='44'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                      </svg>
                    </button>
                  )}
                </>
              ) : (
                <div className='flex h-[280px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-sm text-gray-500'>
                  No products available yet
                </div>
              )}
            </div>
          </div>
          {mobileProducts.length ? (
            <div className='md:hidden'>
              <div className='featured-scroll flex gap-3 overflow-x-auto pb-2 pr-1'>
                {mobileProducts.map((product) => (
                  <MobileProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={onAddToCart}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className='md:hidden'>
              <div className='flex h-28 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-sm text-gray-500'>
                No products available yet
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default FeaturedStrip
