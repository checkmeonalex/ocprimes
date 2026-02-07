'use client'
import React from 'react'
import ProductMasonry from './ProductMasonry'
import { getSeedProducts, mergeSeedAndDbProducts } from '../../lib/catalog/seed-products'
import { useCart } from '../../context/CartContext'
import normalizeProduct from './catalog/normalizeProduct.mjs'

const ProductCardList = ({
  sidebarOpen,
  products,
  title = 'Fashion Collection',
  subtitle = 'Discover our latest trends and bestsellers',
  useSeedFallback = true,
}) => {
  const { addItem } = useCart()
  const handleAddToCart = (productData) => {
    addItem(productData, 1)
  }

  const seedProducts = useSeedFallback ? getSeedProducts() : []
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
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>{title}</h1>
          <p className='text-gray-600'>
            {subtitle}
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
