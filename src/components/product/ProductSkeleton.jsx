const ProductSkeleton = ({ type = 'card' }) => {
  if (type === 'image') {
    return (
      <div className='aspect-square bg-gray-200 animate-pulse rounded-t-lg'>
        <div className='h-full w-full' />
      </div>
    )
  }

  return (
    <div className='bg-white rounded-[5px] overflow-hidden shadow-sm animate-pulse'>
      <div className='aspect-square bg-gray-200'>
        <div className='h-full w-full' />
      </div>
      <div className='p-3 space-y-2'>
        <div className='flex justify-between'>
          <div className='h-4 bg-gray-200 rounded w-1/4'></div>
          <div className='h-4 bg-gray-200 rounded w-1/4'></div>
        </div>
        <div className='h-4 bg-gray-200 rounded w-3/4'></div>
        <div className='h-4 bg-gray-200 rounded w-1/2'></div>
        <div className='flex justify-between items-center'>
          <div className='h-6 bg-gray-200 rounded w-1/3'></div>
          <div className='h-8 w-8 bg-gray-200 rounded-lg'></div>
        </div>
      </div>
    </div>
  )
}

export default ProductSkeleton
