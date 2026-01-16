import React from 'react'
import Skeleton from './Skeleton'

const ProductCardSkeleton = ({ type = 'card', className = '' }) => {
  if (type === 'image') {
    return (
      <div className={`w-full h-full ${className}`}>
        <Skeleton className='w-full h-full rounded-none' />
      </div>
    )
  }

  return (
    <div
      className={`bg-white rounded-[5px] overflow-hidden shadow-sm ${className}`}
    >
      <Skeleton className='w-full aspect-square rounded-none' />
      <div className='p-3 space-y-2'>
        <div className='flex justify-between'>
          <Skeleton className='h-4 w-1/4' />
          <Skeleton className='h-4 w-1/4' />
        </div>
        <Skeleton className='h-4 w-3/4' />
        <Skeleton className='h-4 w-1/2' />
        <div className='flex justify-between items-center'>
          <Skeleton className='h-6 w-1/3' />
          <Skeleton className='h-8 w-8 rounded-lg' />
        </div>
      </div>
    </div>
  )
}

export default ProductCardSkeleton
