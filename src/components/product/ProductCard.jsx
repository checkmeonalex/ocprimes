'use client'
import React, { useMemo, useState } from 'react'
import { Heart } from 'lucide-react'
import StarRating from './StarRating'
import Image from 'next/image'
import ColorOptions from './ColorOptions' // Import new component
import ProductCardSkeleton from '../ProductCardSkeleton'
import Link from 'next/link'
import { buildSwatchImages, deriveOptionsFromVariations } from './variationUtils.mjs'
import { useCart } from '../../context/CartContext'
import QuantityControl from '../cart/QuantityControl'
import { findCartEntry } from '../../lib/cart/cart-match'

const ProductCard = ({ product, onAddToCart }) => {
  const [isFavorite, setIsFavorite] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || '')
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [previewImage, setPreviewImage] = useState('')
  const { items, updateQuantity } = useCart()
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

  // Handle image load once
  const handleImageLoad = () => {
    if (!imageLoaded) {
      setImageLoaded(true)
    }
  }

  const handleAddToCart = (e) => {
    e.preventDefault()
    e.stopPropagation()
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

  // Calculate discount percentage
  const discountPercentage =
    product.originalPrice && product.price < product.originalPrice
      ? Math.max(
          1,
          Math.round(
            ((product.originalPrice - product.price) / product.originalPrice) * 100
          )
        )
      : null

  // Determine aspect ratio class based on image type
  const imageContainerClass = product.isPortrait
    ? 'aspect-[3/4]' // Portrait aspect ratio (3:4)
    : 'aspect-square' // Square aspect ratio (1:1)

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

  if (!product) {
    return <ProductCardSkeleton />
  }

  return (
    <Link href={`/product/${product.slug}`}>
      <div
        className='relative bg-white rounded-[5px] overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group'
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {!imageLoaded && (
          <div className='absolute inset-0 z-10 pointer-events-none'>
            <ProductCardSkeleton />
          </div>
        )}
        {/* Image Container */}
        <div
          className={`relative ${
            product.isPortrait ? 'aspect-[3/4]' : 'aspect-square'
          } bg-gray-50 overflow-hidden`}
        >
          <div className='relative w-full h-full'>
            {!imageLoaded && (
              <div className='absolute inset-0'>
                <ProductCardSkeleton type='image' />
              </div>
            )}
            <Image
              src={
                currentImageIndex === -1
                  ? previewImage
                  : product.gallery?.[currentImageIndex] || product.image
              }
              alt={product.name}
              fill
              sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
              className={`object-cover transition-all duration-300 ${
                imageLoaded
                  ? 'opacity-100 group-hover:scale-105'
                  : 'opacity-0'
              }`}
              onLoad={handleImageLoad}
              onError={() => setImageLoaded(true)}
            />
          </div>

          {imageLoaded && (
            <>
              {/* Favorite Button */}
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className='absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors z-20 shadow-sm'
              >
                <Heart
                  size={16}
                  className={
                    isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'
                  }
                />
              </button>

              {/* Vendor Name - Top Left Overlay */}
              <div className='absolute top-3 left-3 z-20'>
                <span
                  className='text-black font-light tracking-wide drop-shadow-lg'
                  style={{
                    fontFamily: product.vendorFont || 'serif',
                    fontSize: '15px',
                  }}
                >
                  {product.vendor}
                </span>
              </div>

              {/* Color Options - Bottom Right of Image - Adjusted for portrait */}
              {availableColors.length > 0 && (
                <div
                  className={`absolute z-20 ${
                    product.isPortrait ? 'bottom-4 right-3' : 'bottom-3 right-3'
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
          <div className='p-3'>
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
                  <span className='text-xs font-medium text-green-600'>
                    {product.vendor}
                  </span>
                </div>
              </div>

              <h3 className='text-sm font-semibold text-gray-900 line-clamp-2 leading-tight'>
                {product.name}
              </h3>
            </div>

            {/* Rating */}
            <div className='flex items-center'>
              <StarRating rating={product.rating} size={14} />
              <span className='text-xs text-gray-500 ml-2'>
                {product.reviews > 1000
                  ? `${(product.reviews / 1000).toFixed(1)}k+`
                  : product.reviews}{' '}
                sold
              </span>
            </div>

            {/* Almost Sold Out Badge */}
            {product.stock <= 3 && (
              <div className='mb-0.5'>
                <span className='text-orange-600 text-xs font-semibold flex items-center gap-1'>
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
                  Only {product.stock} left in stock
                </span>
              </div>
            )}

            {/* Price and Add to Cart */}
            <div className='flex items-center justify-between'>
              <div className='flex flex-col'>
                <div className='flex items-center gap-2'>
                  <span className='text-lg font-bold text-gray-900'>
                    ${product.price}
                  </span>
                  {product.originalPrice && (
                    <span className='text-sm text-gray-400 line-through'>
                      ${product.originalPrice}
                    </span>
                  )}
                </div>
                {discountPercentage && (
                  <span className='text-xs text-green-600 font-semibold'>
                    Save ${(product.originalPrice - product.price).toFixed(2)}
                  </span>
                )}
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
                  onClick={handleAddToCart}
                  className='w-9 h-9 rounded-lg border-2 border-gray-300 bg-white text-gray-600
                   flex items-center justify-center hover:border-gray-400 hover:bg-gray-50
                   transition-all duration-200 group/btn'
                >
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
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}

export default ProductCard
