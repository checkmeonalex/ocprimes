import Skeleton from '@/components/Skeleton'

export default function VendorModerationSkeleton() {
  return (
    <div className='mt-6 space-y-6'>
      <section className='mobile-full-bleed rounded-none border border-x-0 border-slate-200 bg-white p-5 sm:rounded-2xl sm:border-x'>
        <div className='flex items-center gap-4'>
          <Skeleton className='h-14 w-14 rounded-full' />
          <div className='space-y-2'>
            <Skeleton className='h-4 w-44' />
            <Skeleton className='h-3 w-56' />
            <Skeleton className='h-3 w-40' />
          </div>
        </div>
      </section>

      <section className='mobile-full-bleed rounded-none border border-x-0 border-slate-200 bg-white p-5 sm:rounded-2xl sm:border-x'>
        <div className='mb-4 flex gap-2'>
          <Skeleton className='h-9 w-32 rounded-full' />
          <Skeleton className='h-9 w-32 rounded-full' />
          <Skeleton className='h-9 w-32 rounded-full' />
        </div>
        <div className='space-y-3'>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`vendor-skeleton-row-${index}`} className='rounded-xl border border-slate-200 px-4 py-3'>
              <Skeleton className='h-4 w-52' />
              <Skeleton className='mt-2 h-3 w-72' />
              <div className='mt-3 flex gap-2'>
                <Skeleton className='h-9 w-28 rounded-lg' />
                <Skeleton className='h-9 w-36 rounded-lg' />
                <Skeleton className='h-9 w-20 rounded-lg' />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
