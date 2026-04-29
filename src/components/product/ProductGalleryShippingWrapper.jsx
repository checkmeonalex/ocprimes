import React from 'react'

const ProductGalleryShippingWrapper = ({ children, shippingSection }) => {
  return (
    <div className='flex flex-col gap-6'>
      <div className='w-full'>
        {children}
      </div>
      <div className='w-full'>
        <h3 className='text-lg font-semibold text-gray-900 mb-3'>Shipping</h3>
        {shippingSection}
      </div>
    </div>
  )
}

export default ProductGalleryShippingWrapper
