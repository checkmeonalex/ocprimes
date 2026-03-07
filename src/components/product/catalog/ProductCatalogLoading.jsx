import ProductCardSkeleton from '@/components/ProductCardSkeleton'
import Skeleton from '@/components/Skeleton'

const ProductCatalogLoading = ({
  cardCount = 8,
  titleWidthClass = 'w-28',
  showSidebar = false,
}) => {
  const cards = Array.from({ length: cardCount }, (_, index) => index)

  return (
    <div className='w-full bg-[#f8f8f8]'>
      <div className='mx-auto w-full max-w-[1400px] px-3 pb-10 pt-4 sm:px-4 lg:px-6'>
        <Skeleton className={`mb-4 h-9 ${titleWidthClass} rounded-md`} />

        <div className={`mt-6 grid gap-6 ${showSidebar ? 'lg:grid-cols-[260px_1fr]' : 'grid-cols-1'}`}>
          {showSidebar ? (
            <aside className='hidden lg:block' />
          ) : null}

          <section>
            <div className='flex items-center justify-between px-3 pb-2'>
              <div className='flex items-center gap-2'>
                <Skeleton className='h-5 w-20 rounded-md' />
                <Skeleton className='h-5 w-8 rounded-md' />
              </div>
              <div className='hidden items-center gap-2 lg:flex'>
                <Skeleton className='h-4 w-10 rounded-md' />
                <Skeleton className='h-9 w-[160px] rounded-md' />
              </div>
            </div>

            <div className='grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-2 md:grid-cols-3 md:gap-3 xl:grid-cols-4 xl:gap-3'>
              {cards.map((index) => (
                <ProductCardSkeleton key={`catalog-loading-card-${index}`} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default ProductCatalogLoading
