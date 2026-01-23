'use client'
import React from 'react'
import ProductMasonry from './ProductMasonry'
import { getSeedProducts, mergeSeedAndDbProducts } from '../../lib/catalog/seed-products'
import { useCart } from '../../context/CartContext'

const normalizeProduct = (item) => {
  const images = Array.isArray(item?.images) ? item.images : []
  const imageUrls = images
    .map((image) => (typeof image === 'string' ? image : image?.url))
    .filter(Boolean)
  const basePrice = Number(item?.price) || 0
  const discountPrice = Number(item?.discount_price) || 0
  const hasDiscount = discountPrice > 0 && discountPrice < basePrice
  const price = hasDiscount ? discountPrice : basePrice
  const originalPrice =
    hasDiscount && basePrice ? basePrice : Number(item?.originalPrice) || null

  return {
    id: item?.id,
    name: item?.name || 'Untitled product',
    slug: item?.slug || '',
    category:
      item?.category ||
      (Array.isArray(item?.categories) ? item.categories[0]?.name : '') ||
      'Uncategorized',
    vendor:
      item?.vendor ||
      (Array.isArray(item?.brands) ? item.brands[0]?.name : '') ||
      'OCPRIMES',
    vendorFont: item?.vendorFont || 'Georgia, serif',
    shortDescription: item?.short_description || item?.shortDescription || '',
    fullDescription: item?.description || item?.fullDescription || '',
    price,
    originalPrice,
    rating: Number(item?.rating) || 0,
    reviews: Number(item?.reviews) || 0,
    colors: Array.isArray(item?.colors) ? item.colors : [],
    sizes: Array.isArray(item?.sizes) ? item.sizes : [],
    isTrending: Boolean(item?.isTrending),
    isPortrait: Boolean(item?.isPortrait),
    image: item?.image_url || item?.image || imageUrls[0] || '',
    gallery: imageUrls.length ? imageUrls : item?.gallery || [],
    stock: Number.isFinite(Number(item?.stock_quantity))
      ? Number(item.stock_quantity)
      : Number(item?.stock) || 0,
  }
}

const ProductCardList = ({ sidebarOpen, products }) => {
  const { addItem } = useCart()
  const handleAddToCart = (productData) => {
    addItem(productData, 1)
  }

  const seedProducts = getSeedProducts()
  const hasSeedProducts = Array.isArray(products)
    ? products.some((item) => String(item?.id || '').startsWith('seed-'))
    : false
  const source =
    Array.isArray(products) && products.length
      ? hasSeedProducts
        ? products
        : mergeSeedAndDbProducts(seedProducts, products, { dbFirst: true })
      : seedProducts
  const normalized = Array.isArray(source) ? source.map(normalizeProduct) : []

  if (!normalized.length) {
    return <div>No products available</div>
  }

  return (
    <div className='min-h-screen bg-gray-50'>
   <div className='max-w-7xl mx-auto px-3'>

        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>
            Fashion Collection
          </h1>
          <p className='text-gray-600'>
            Discover our latest trends and bestsellers
          </p>
        </div>

        {/* Masonry Product Grid */}
        <ProductMasonry
          products={normalized}
          onAddToCart={handleAddToCart}
        />
      </div>
    </div>
  )
}

export default ProductCardList
