'use client'

const pulse = 'animate-pulse rounded bg-slate-200/80'

function DesktopRowSkeleton() {
  return (
    <div className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 px-8 py-5'>
      <div className='min-w-0 space-y-3'>
        <div className={`h-4 w-40 ${pulse}`} />
        <div className={`h-3 w-80 max-w-full ${pulse}`} />
        <div className={`h-10 w-full max-w-md rounded-xl bg-slate-100 animate-pulse`} />
      </div>
      <div className='h-10 w-28 animate-pulse rounded-lg bg-slate-100' />
    </div>
  )
}

function MobileCardSkeleton() {
  return (
    <article className='rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
      <div className='space-y-3'>
        <div className={`h-4 w-32 ${pulse}`} />
        <div className={`h-3 w-11/12 ${pulse}`} />
        <div className={`h-10 w-full rounded-lg bg-slate-100 animate-pulse`} />
      </div>
    </article>
  )
}

export default function AccountSecurityLoadingSkeleton() {
  return (
    <div className='w-full space-y-4 pb-28 text-slate-900 lg:space-y-5 lg:pb-32'>
      <section className='lg:hidden'>
        <div className='rounded-[24px] bg-white p-5'>
          <div className='mx-auto h-14 w-14 animate-pulse rounded-xl bg-slate-200' />
          <div className='mx-auto mt-4 h-8 w-32 animate-pulse rounded bg-slate-200' />
          <div className='mx-auto mt-2 h-4 w-56 max-w-full animate-pulse rounded bg-slate-100' />
        </div>
      </section>

      <section className='hidden overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-sm lg:block'>
        <div className='border-b border-slate-200 px-8 py-6'>
          <div className={`h-7 w-52 ${pulse}`} />
          <div className={`mt-2 h-4 w-72 ${pulse}`} />
        </div>

        <div className='divide-y divide-slate-200'>
          {Array.from({ length: 5 }).map((_, index) => (
            <DesktopRowSkeleton key={`account-security-desktop-skeleton-${index}`} />
          ))}
        </div>
      </section>

      <section className='space-y-3 lg:hidden'>
        {Array.from({ length: 5 }).map((_, index) => (
          <MobileCardSkeleton key={`account-security-mobile-skeleton-${index}`} />
        ))}
      </section>
    </div>
  )
}
