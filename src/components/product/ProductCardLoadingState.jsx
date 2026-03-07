import Skeleton from '@/components/Skeleton'

const ProductCardLoadingState = ({ className = '' }) => {
  return (
    <div className={`relative overflow-hidden rounded-[5px] bg-white shadow-sm ${className}`.trim()}>
      <div className='relative aspect-square overflow-hidden bg-gray-50'>
        <Skeleton className='h-full w-full rounded-none bg-gray-200' />
        <Skeleton className='absolute left-3 top-4 h-4 w-12 rounded-sm bg-gray-100' />
        <Skeleton className='absolute right-3 top-3 h-10 w-10 rounded-full bg-gray-100' />
        <div className='absolute bottom-4 right-3 flex flex-col items-center gap-2'>
          <Skeleton className='h-6 w-6 rounded-full bg-gray-100' />
          <Skeleton className='h-4 w-4 rounded-full bg-gray-200' />
          <Skeleton className='h-4 w-4 rounded-full bg-gray-200' />
          <Skeleton className='h-4 w-4 rounded-full bg-gray-200' />
          <Skeleton className='h-3 w-5 rounded-sm bg-gray-100' />
        </div>
      </div>

      <div className='p-3'>
        <div className='mb-2 flex items-center gap-1.5'>
          <Skeleton className='h-3.5 w-3.5 rounded-sm bg-gray-200' />
          <Skeleton className='h-3 w-14 rounded-sm bg-gray-200' />
        </div>

        <div className='space-y-2'>
          <Skeleton className='h-4 w-[82%] rounded-sm bg-gray-200' />
          <Skeleton className='h-4 w-[68%] rounded-sm bg-gray-200' />
        </div>

        <div className='mt-2 space-y-1'>
          <div className='flex items-baseline gap-2'>
            <Skeleton className='h-7 w-20 rounded-sm bg-gray-200' />
            <Skeleton className='h-4 w-12 rounded-sm bg-gray-200' />
          </div>
          <div className='flex items-center justify-between gap-2 pt-0.5'>
            <Skeleton className='h-4 w-16 rounded-sm bg-gray-200' />
            <Skeleton className='h-10 w-10 rounded-xl bg-gray-100' />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductCardLoadingState
