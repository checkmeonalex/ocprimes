'use client'
import React, { useMemo, useState } from 'react'
import { Heart } from 'lucide-react'
import StarRating from './StarRating'
import ColorOptions from './ColorOptions' // Import new component
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { buildSwatchImages, deriveOptionsFromVariations } from './variationUtils.mjs'
import ProductVariantQuickAddModal from './ProductVariantQuickAddModal'
import { useOptionalCart } from '../../context/CartContext'
import QuantityControl from '../cart/QuantityControl'
import { findCartEntry } from '../../lib/cart/cart-match'
import { useWishlist } from '../../context/WishlistContext'
import { useUserI18n } from '@/lib/i18n/useUserI18n'
import { buildVendorHref } from '@/lib/catalog/vendor'
import { useScreenSize } from '@/hooks/useScreenSize'
import ProductCardLoadingState from './ProductCardLoadingState'
import ProductDealCountdown from './ProductDealCountdown'
import OutOfStockNotifyModal from './OutOfStockNotifyModal'
import ProductDeferredImage from './ProductDeferredImage'

const ProductCard = ({
  product,
  onAddToCart,
  className = '',
  wishlistMode = false,
  onRemove,
  showTopAddToCart = false,
  isRemoving = false,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || '')
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [previewImage, setPreviewImage] = useState('')
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false)
  const [showOutOfStockModal, setShowOutOfStockModal] = useState(false)
  const [shouldWrapQuantityRow, setShouldWrapQuantityRow] = useState(false)
  const router = useRouter()
  const { isMobile } = useScreenSize()
  const openInNewTab = !isMobile
  const cart = useOptionalCart()
  const actionRowRef = React.useRef(null)
  const items = cart?.items || []
  const updateQuantity = cart?.updateQuantity || (() => {})
  const { openSaveModal, isRecentlySaved } = useWishlist()
  const { formatMoney } = useUserI18n()
  const isFavorite = isRecentlySaved(product?.id)
  const availableColors = React.useMemo(() => {
    const fromVariations = deriveOptionsFromVariations(product.variations, ['color', 'colour'])
    if (fromVariations.length) return fromVariations
    return Array.isArray(product.colors) ? product.colors : []
  }, [product.colors, product.variations])
  const swatchImages = React.useMemo(
    () => buildSwatchImages(product.variations, product.images, ['color', 'colour']),
    [product.images, product.variations],
  )

  React.useEffect(() => {
    if (!availableColors.length) return
    if (!selectedColor || !availableColors.includes(selectedColor)) {
      setSelectedColor(availableColors[0])
    }
  }, [availableColors, selectedColor])

  const handleAddToCart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (Array.isArray(product?.variations) && product.variations.length > 0) {
      setIsVariantModalOpen(true)
      return
    }
    onAddToCart({ ...product, selectedColor, selectedSize })
  }

  const selectionForCart = useMemo(
    () => ({
      id: product?.id,
      selectedVariationId: product?.selectedVariationId,
      selectedColor,
      selectedSize,
    }),
    [product?.id, product?.selectedVariationId, selectedColor, selectedSize],
  )
  const cartEntry = findCartEntry(items, selectionForCart)
  const quantity = cartEntry?.quantity || 0
  const handleIncrement = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (cartEntry?.key) {
      updateQuantity(cartEntry.key, quantity + 1)
    } else {
      if (Array.isArray(product?.variations) && product.variations.length > 0) {
        setIsVariantModalOpen(true)
        return
      }
      onAddToCart({ ...product, selectedColor, selectedSize })
    }
  }
  const handleDecrement = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (cartEntry?.key) {
      updateQuantity(cartEntry.key, Math.max(0, quantity - 1))
    }
  }

  const priceValue = Number(product?.price) || 0
  const originalPriceValue = Number(product?.originalPrice)
  const hasDiscount =
    Number.isFinite(originalPriceValue) &&
    originalPriceValue > 0 &&
    priceValue > 0 &&
    originalPriceValue > priceValue

  const discountPercentage = hasDiscount
    ? Math.max(
        1,
        Math.round(((originalPriceValue - priceValue) / originalPriceValue) * 100)
      )
    : null
  const dealExpiresAt = String(product?.dealExpiresAt || product?.deal_expires_at || '').trim()
  const stockCount = Math.max(0, Number(product?.stock) || 0)
  const initialStockCount = Math.max(
    stockCount,
    Number(product?.initialStock ?? product?.initial_stock_quantity) || 0,
  )
  const isOutOfStock = stockCount <= 0
  const hasStockDropped = stockCount < initialStockCount

  React.useEffect(() => {
    const node = actionRowRef.current
    if (!node || typeof ResizeObserver === 'undefined') return undefined

    const updateLayout = () => {
      const width = Number(node.getBoundingClientRect?.().width || 0)
      setShouldWrapQuantityRow(width > 0 && width < 154)
    }

    updateLayout()
    const observer = new ResizeObserver(() => updateLayout())
    observer.observe(node)
    return () => observer.disconnect()
  }, [quantity, isOutOfStock, discountPercentage])

  const hasRating = Number(product?.rating) > 0

  const handleMouseEnter = () => {
    if (product.gallery && product.gallery.length > 1) {
      setCurrentImageIndex(1)
    }
  }

  const handleMouseLeave = () => {
    setCurrentImageIndex(0)
  }
  const handlePreviewImage = (url) => {
    if (!url) return
    setPreviewImage(url)
    setCurrentImageIndex(-1)
    setImageLoaded(true)
  }
  const handleClearPreview = () => {
    setPreviewImage('')
    setCurrentImageIndex(0)
  }
  const handleWishlist = (event) => {
    event.preventDefault()
    event.stopPropagation()
    openSaveModal({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image: product.image,
    })
  }

  const handleVendorClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    router.push(buildVendorHref(product.vendor, product.vendorSlug))
  }

  const handleOutOfStockClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setShowOutOfStockModal(true)
  }

  const productImageSrc =
    currentImageIndex === -1
      ? previewImage
      : product.gallery?.[currentImageIndex] || product.image

  if (!product) {
    return <ProductCardLoadingState className={className} />
  }

  return (
    <>
      <Link
        href={`/product/${product.slug}`}
        target={openInNewTab ? '_blank' : undefined}
        rel={openInNewTab ? 'noopener noreferrer' : undefined}
        data-next-navigation='true'
      >
        <div
          className={`relative ${className.includes('bg-') ? '' : 'bg-white'} rounded-none shadow-sm hover:shadow-lg transition-all duration-300 group ${className}`}
          style={{ borderRadius: 0 }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
        {/* Image Container */}
        <div
          className={`relative ${
            product.isPortrait ? 'aspect-[3/4]' : 'aspect-square'
          } overflow-hidden bg-gray-50`}
          style={{ borderRadius: 0 }}
        >
          <div className='relative w-full h-full'>
            <ProductDeferredImage
              src={productImageSrc}
              alt={product.name}
              eager={false}
              isLoadEnabled
              rootMargin='280px 0px'
              sizes='(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw'
              imgClassName={`absolute inset-0 h-full w-full object-cover transition-[transform,opacity] duration-300 ${
                imageLoaded ? 'group-hover:scale-105' : ''
              }`}
              placeholderClassName='absolute inset-0'
              observerClassName='absolute inset-0'
              imgStyle={{ borderRadius: 0 }}
              onReady={() => {
                if (!imageLoaded) {
                  setImageLoaded(true)
                }
              }}
              onError={() => {
                if (!imageLoaded) {
                  setImageLoaded(true)
                }
              }}
            />
          </div>

          {imageLoaded && (
            <>
              {/* Favorite Button */}
              {!wishlistMode && (
                <button
                  onClick={handleWishlist}
                  aria-pressed={isFavorite}
                  className={`absolute top-3 right-3 w-8 h-8 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors z-20 shadow-sm wishlist-heart-shell ${
                    isFavorite ? 'wishlist-heart-shell--active' : ''
                  }`}
                >
                  <Heart
                    size={16}
                    className={isFavorite ? 'fill-current wishlist-heart-pop' : ''}
                  />
                </button>
              )}

              {showTopAddToCart && (
                <button
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    handleAddToCart(event)
                  }}
                  className='absolute top-3 right-3 w-7 h-7 bg-white rounded-full flex items-center justify-center text-black font-extrabold shadow-sm hover:bg-gray-50 transition-colors z-20'
                  aria-label='Add to cart'
                >
                  <svg
                    viewBox='0 0 24 24'
                    className='h-4 w-4 text-black'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='3'
                    strokeLinecap='round'
                  >
                    <path d='M12 5v14M5 12h14' />
                  </svg>
                </button>
              )}

              {/* Color Options - Bottom Right of Image - Adjusted for portrait */}
              {availableColors.length > 0 && (
                <div
                  className={`absolute right-3 z-20 ${
                    product.isPortrait ? 'bottom-3' : 'bottom-3'
                  }`}
                >
                  <ColorOptions
                    colors={availableColors}
                    selectedColor={selectedColor}
                    setSelectedColor={setSelectedColor}
                    swatchImages={swatchImages}
                    onPreviewImage={handlePreviewImage}
                    onClearPreview={handleClearPreview}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {imageLoaded && (
          <div className={`${wishlistMode ? 'p-2.5 sm:p-3' : 'p-3'} rounded-b-[5px] bg-white`}>
            {/* Brand/Name and Trending */}
            <div>
              <div className='flex items-center justify-between mb-1'>
                {product.isTrending && (
                  <div className='bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-1'>
                    <svg
                      width='10'
                      height='10'
                      viewBox='0 0 24 24'
                      fill='currentColor'
                    >
                      <path d='M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z' />
                    </svg>
                    Star Seller
                  </div>
                )}

                <div className='flex items-center gap-1 text-green-600'>
                  <svg
                    width='12'
                    height='12'
                    viewBox='0 0 24 24'
                    fill='currentColor'
                    className='text-green-600'
                  >
                    <path d='M19.152,14a1,1,0,0,0,1-1V9.752a4.019,4.019,0,0,0,.3-.3,4,4,0,0,0,.732-3.456L20.121,1.758A1,1,0,0,0,19.152,1h-16a1,1,0,0,0-.97.757L1.122,5.994A4,4,0,0,0,1.855,9.45a3.838,3.838,0,0,0,.3.3V22a1,1,0,0,0,1,1H14.3a1,1,0,0,0,0-2H4.151V10.9A3.955,3.955,0,0,0,8.063,9.589c.03.035.051.076.082.11A4.04,4.04,0,0,0,11.11,11h.083a4.036,4.036,0,0,0,2.964-1.3c.032-.034.052-.076.082-.11A3.957,3.957,0,0,0,18.152,10.9V13A1,1,0,0,0,19.152,14ZM7.386,3.134l-.292,3.5v0l-.041.5A2.041,2.041,0,0,1,5.031,9A2.029,2.029,0,0,1,3.062,6.479L3.932,3H7.4Zm5.3,5.211A2.009,2.009,0,0,1,11.193,9H11.11A2.028,2.028,0,0,1,9.088,6.807L9.4,3H12.9l.317,3.8A2.013,2.013,0,0,1,12.686,8.345ZM17.272,9a2.042,2.042,0,0,1-2.023-1.86L14.9,3H18.37l.87,3.479A2.029,2.029,0,0,1,17.272,9Zm3.061,8.667L23,18.056l-2.222,1.833L21.472,23,19,21.222,16.528,23l.694-3.111L15,18.056l2.667-.389L19,15Z' />
                  </svg>
                  <button type='button' onClick={handleVendorClick} className='text-xs font-medium text-green-600 hover:underline'>
                    {product.vendor}
                  </button>
                </div>
              </div>

              <h3 className='text-[12px] sm:text-[13px] font-normal text-gray-900 line-clamp-1 leading-tight'>
                {product.name}
              </h3>
            </div>

            {/* Rating */}
            {hasRating ? (
              <div className='flex items-center'>
                <StarRating rating={product.rating} size={14} />
                <span className='ml-2 font-mono text-[10.5px] text-gray-400' style={{ fontFeatureSettings: '"tnum"' }}>
                  {product.reviews > 1000
                    ? `${(product.reviews / 1000).toFixed(1)}k+`
                    : product.reviews}{' '}
                  sold
                </span>
              </div>
            ) : null}

            {/* Almost Sold Out Badge */}
            {(isOutOfStock || (stockCount <= 3 && hasStockDropped)) && (
              <div className='mb-0.5'>
                <span
                  className={`flex items-center gap-1 text-xs font-semibold ${
                    isOutOfStock ? 'text-red-600' : 'text-orange-600'
                  }`}
                >
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
                  <span className='font-mono text-[10px]'>{isOutOfStock ? 'Out of stock' : `Only ${stockCount} left in stock`}</span>
                </span>
              </div>
            )}

            {/* Price and Add to Cart */}
            <div className='space-y-1'>
              <div className='flex flex-col'>
                <div className='flex flex-wrap items-baseline gap-x-2 gap-y-0.5'>
                  <span className='font-mono text-sm font-semibold text-gray-900' style={{ fontFeatureSettings: '"tnum"' }}>
                    {formatMoney(priceValue)}
                  </span>
                  {hasDiscount ? (
                    <span className='font-mono text-xs font-normal text-gray-400 line-through' style={{ fontFeatureSettings: '"tnum"' }}>
                      {formatMoney(originalPriceValue)}
                    </span>
                  ) : null}
                </div>
              </div>

              <ProductDealCountdown
                variant='card'
                expiresAt={dealExpiresAt}
                currentPrice={priceValue}
                originalPrice={originalPriceValue}
                stock={stockCount}
                initialStock={initialStockCount}
              />

              <div
                ref={actionRowRef}
                className={`flex gap-2 pt-0.5 ${
                  quantity > 0 && !isOutOfStock && shouldWrapQuantityRow
                    ? 'flex-wrap items-start'
                    : 'items-center'
                }`}
              >
                {discountPercentage ? (
                  <span
                    className={`font-mono min-w-0 font-normal leading-tight text-green-600 ${
                      quantity > 0 && !isOutOfStock && shouldWrapQuantityRow
                        ? 'w-full text-[10px]'
                        : 'flex-1 whitespace-nowrap text-[10px]'
                    }`}
                    style={{ fontFeatureSettings: '"tnum"' }}
                  >
                    Save {formatMoney(originalPriceValue - priceValue)}
                  </span>
                ) : null}
                {wishlistMode ? (
                  <button
                    type='button'
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      onRemove?.()
                    }}
                    disabled={isRemoving}
                    className='flex min-w-[92px] items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-75'
                  >
                    {isRemoving ? (
                      <span
                        className='h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700'
                        aria-hidden='true'
                      />
                    ) : (
                      <>
                        <span className='hidden sm:inline'>Remove</span>
                        <svg
                          className='h-4 w-4 sm:hidden'
                          viewBox='0 0 24 24'
                          fill='none'
                          xmlns='http://www.w3.org/2000/svg'
                          aria-hidden='true'
                        >
                          <path d='M20.5001 6H3.5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
                          <path d='M9.5 11L10 16' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
                          <path d='M14.5 11L14 16' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
                          <path d='M6.5 6C6.55588 6 6.58382 6 6.60915 5.99936C7.43259 5.97849 8.15902 5.45491 8.43922 4.68032C8.44784 4.65649 8.45667 4.62999 8.47434 4.57697L8.57143 4.28571C8.65431 4.03708 8.69575 3.91276 8.75071 3.8072C8.97001 3.38607 9.37574 3.09364 9.84461 3.01877C9.96213 3 10.0932 3 10.3553 3H13.6447C13.9068 3 14.0379 3 14.1554 3.01877C14.6243 3.09364 15.03 3.38607 15.2493 3.8072C15.3043 3.91276 15.3457 4.03708 15.4286 4.28571L15.5257 4.57697C15.5433 4.62992 15.5522 4.65651 15.5608 4.68032C15.841 5.45491 16.5674 5.97849 17.3909 5.99936C17.4162 6 17.4441 6 17.5 6' stroke='currentColor' strokeWidth='1.5' />
                          <path d='M18.3735 15.3991C18.1965 18.054 18.108 19.3815 17.243 20.1907C16.378 21 15.0476 21 12.3868 21H11.6134C8.9526 21 7.6222 21 6.75719 20.1907C5.89218 19.3815 5.80368 18.054 5.62669 15.3991L5.16675 8.5M18.8334 8.5L18.6334 11.5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
                        </svg>
                      </>
                    )}
                  </button>
                ) : isOutOfStock ? (
                  <button
                    type='button'
                    onClick={handleOutOfStockClick}
                    aria-label='This product is out of stock'
                    className='h-8 w-8 shrink-0 rounded-lg border-2 border-gray-200 bg-gray-100 text-gray-400
                     flex items-center justify-center transition-all duration-200 sm:h-9 sm:w-9'
                  >
                    <svg
                      width='20'
                      height='20'
                      viewBox='-3.2 -3.2 38.40 38.40'
                      fill='currentColor'
                      className='sm:h-[22px] sm:w-[22px]'
                    >
                      <circle cx='10' cy='28' r='2'></circle>
                      <circle cx='24' cy='28' r='2'></circle>
                      <path d='M4.9806,2.8039A1,1,0,0,0,4,2H0V4H3.18L7.0194,23.1961A1,1,0,0,0,8,24H26V22H8.82l-.8-4H26a1,1,0,0,0,.9762-.783L29.2445,7H27.1971l-1.9989,9H7.62Z'></path>
                      <polygon points='18 6 18 2 16 2 16 6 12 6 12 8 16 8 16 12 18 12 18 8 22 8 22 6 18 6'></polygon>
                      <path d='M7 7L25 25' fill='none' stroke='currentColor' strokeWidth='2.1' strokeLinecap='round' />
                    </svg>
                  </button>
                ) : quantity > 0 ? (
                  <div className={shouldWrapQuantityRow ? 'w-full' : 'shrink-0'}>
                    <QuantityControl
                      quantity={quantity}
                      onIncrement={handleIncrement}
                      onDecrement={handleDecrement}
                      size='sm'
                      fullWidth={shouldWrapQuantityRow}
                      isLoading={Boolean(cartEntry?.isSyncing)}
                      appearance='solid'
                      stylePreset='card'
                    />
                  </div>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    className='h-8 w-8 shrink-0 rounded-lg border-2 border-gray-300 bg-white text-gray-600
                     flex items-center justify-center hover:border-gray-400 hover:bg-gray-50
                     transition-all duration-200 group/btn sm:h-9 sm:w-9'
                  >
                    <svg
                      width='20'
                      height='20'
                      viewBox='-3.2 -3.2 38.40 38.40'
                      fill='currentColor'
                      className='transition-transform duration-200 group-hover/btn:scale-110 sm:h-[22px] sm:w-[22px]'
                    >
                      <circle cx='10' cy='28' r='2'></circle>
                      <circle cx='24' cy='28' r='2'></circle>
                      <path d='M4.9806,2.8039A1,1,0,0,0,4,2H0V4H3.18L7.0194,23.1961A1,1,0,0,0,8,24H26V22H8.82l-.8-4H26a1,1,0,0,0,.9762-.783L29.2445,7H27.1971l-1.9989,9H7.62Z'></path>
                      <polygon points='18 6 18 2 16 2 16 6 12 6 12 8 16 8 16 12 18 12 18 8 22 8 22 6 18 6'></polygon>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </Link>
      <ProductVariantQuickAddModal
        open={isVariantModalOpen}
        product={product}
        initialColor={selectedColor}
        initialSize={selectedSize}
        onClose={() => setIsVariantModalOpen(false)}
        onConfirm={(payload) => {
          const quantityFromModal = Math.max(1, Number(payload?.quantity) || 1)
          onAddToCart({
            ...product,
            ...payload,
          }, quantityFromModal)
          setIsVariantModalOpen(false)
        }}
      />
      <OutOfStockNotifyModal
        open={showOutOfStockModal}
        onClose={() => setShowOutOfStockModal(false)}
        productName={product?.name}
        productImage={previewImage || product.gallery?.[currentImageIndex] || product.image || ''}
      />
    </>
  )
}

export default ProductCard
