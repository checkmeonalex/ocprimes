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
  const handleAddToCart = (productData, quantity = 1) => {
    addItem(productData, Math.max(1, Number(quantity) || 1))
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
    <div className='w-full bg-white'>
   <div className='max-w-7xl mx-auto px-3'>

        {/* Header */}
        <div className='mb-5'>
          <h1 className='mb-1.5 text-xl font-semibold text-gray-900 sm:text-2xl'>{title}</h1>
          <p className='text-sm text-gray-600'>
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
