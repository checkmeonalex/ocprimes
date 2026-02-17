import Skeleton from '@/components/Skeleton'
import ProductCardSkeleton from '@/components/ProductCardSkeleton'

const CARD_COUNT = 3
const PRODUCT_SKELETON_COUNT = 3

export default function FollowedStoresLoadingSkeleton() {
  return (
    <div className='mt-6 grid gap-5'>
      {Array.from({ length: CARD_COUNT }).map((_, cardIndex) => (
        <div key={`followed-store-skeleton-${cardIndex}`} className='rounded-lg border border-slate-200 p-4'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-center gap-3'>
              <Skeleton className='h-12 w-12 rounded-full' />
              <div className='space-y-2'>
                <Skeleton className='h-4 w-40' />
                <Skeleton className='h-3 w-32' />
                <Skeleton className='h-3 w-24' />
              </div>
            </div>
            <div className='flex gap-2'>
              <Skeleton className='h-9 w-20 rounded-md' />
              <Skeleton className='h-9 w-24 rounded-md' />
            </div>
          </div>
          <div className='mt-4 grid grid-cols-2 gap-3 md:grid-cols-3'>
            {Array.from({ length: PRODUCT_SKELETON_COUNT }).map((_, productIndex) => (
              <ProductCardSkeleton key={`product-skeleton-${cardIndex}-${productIndex}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
