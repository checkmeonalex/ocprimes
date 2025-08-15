import React from 'react'
import ProductCard from './ProductCard'
import MasonryGrid from './MasonryGrid'
import { productsData } from '../data/products'

const ProductCardList = ({ sidebarOpen }) => {
  const handleAddToCart = (productData) => {
    console.log('Adding to cart:', productData)
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
        <MasonryGrid>
          {productsData.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
            />
          ))}
        </MasonryGrid>
      </div>
    </div>
  )
}

export default ProductCardList
