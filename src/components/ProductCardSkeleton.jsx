import React from 'react'
import Skeleton from './Skeleton'
import ProductCardLoadingState from './product/ProductCardLoadingState'

const ProductCardSkeleton = ({ type = 'card', className = '' }) => {
  if (type === 'image') {
    return (
      <div className={`w-full h-full ${className}`}>
        <Skeleton className='w-full h-full rounded-none' />
      </div>
    )
  }

  return <ProductCardLoadingState className={className} />
}

export default ProductCardSkeleton
