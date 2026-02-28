'use client'

type DeferredSectionLoaderProps = {
  title: string
  description: string
  className?: string
}

export const DeferredSectionLoader = ({
  title,
  description,
  className = '',
}: DeferredSectionLoaderProps) => {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-4 ${className}`}>
      <div className='animate-pulse space-y-3'>
        <div className='h-4 w-40 rounded bg-gray-200' />
        <div className='h-3 w-56 rounded bg-gray-100' />
        <div className='h-3 w-44 rounded bg-gray-100' />
      </div>
      <div className='mt-3'>
        <p className='text-xs font-semibold text-gray-700'>{title}</p>
        <p className='mt-1 text-xs text-gray-500'>{description}</p>
      </div>
    </div>
  )
}

export const RelatedProductsSkeleton = () => {
  return (
    <section className='mt-1 border-t border-gray-100'>
      <div className='px-1 pb-1 pt-1 sm:pb-2'>
        <p className='text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 sm:text-xs'>
          Inspired Choices
        </p>
        <div className='mt-2 flex items-center gap-4 sm:gap-6'>
          <span className='h-px flex-1 bg-gray-300' />
          <h2 className='shrink-0 text-center font-serif text-[2rem] font-semibold leading-none text-gray-900 sm:text-[2.4rem]'>
            Just for you
          </h2>
          <span className='h-px flex-1 bg-gray-300' />
        </div>
      </div>

      <div className='mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={`related-skeleton-${index}`} className='group min-w-0'>
            <div className='relative h-full min-w-0 overflow-hidden bg-white p-2 shadow-sm sm:p-3'>
              <div className='relative aspect-square overflow-hidden border border-gray-200 bg-gray-100 animate-pulse'>
                <div className='absolute left-2 top-2 z-10 h-6 w-14 rounded-full bg-gray-200' />
                <div className='absolute bottom-2 right-2 h-9 w-9 rounded-full bg-gray-200' />
              </div>

              <div className='mt-2 min-w-0 flex flex-col animate-pulse'>
                <div className='space-y-1'>
                  <div className='h-4 w-[92%] rounded bg-gray-200' />
                  <div className='h-4 w-[70%] rounded bg-gray-200' />
                </div>
                <div className='mt-2 min-w-0 flex items-baseline gap-1.5'>
                  <div className='h-5 w-24 rounded bg-gray-200' />
                  <div className='h-4 w-16 rounded bg-gray-100' />
                </div>
                <div className='mt-2 min-h-[18px]'>
                  <div className='h-3.5 w-24 rounded bg-gray-100' />
                </div>
                <div className='mt-2 flex items-center justify-end'>
                  <div className='h-9 w-9 rounded-lg border-2 border-gray-200 bg-gray-100' />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
