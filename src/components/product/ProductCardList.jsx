'use client'
import React from 'react'
import ProductMasonry from './ProductMasonry'
import { productsData } from '../data/products'
import { useCart } from '../../context/CartContext'

const ProductCardList = ({ sidebarOpen }) => {
  const { addItem } = useCart()
  const handleAddToCart = (productData) => {
    addItem(productData, 1)
  }

  if (!productsData || !Array.isArray(productsData)) {
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
          products={productsData}
          onAddToCart={handleAddToCart}
        />
      </div>
    </div>
  )
}

export default ProductCardList
