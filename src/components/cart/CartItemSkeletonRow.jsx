'use client'

const CartItemSkeletonRow = () => {
  return (
    <article className='grid animate-pulse grid-cols-1 gap-4 border-b border-slate-200 px-4 py-5 last:border-b-0 sm:grid-cols-[1.7fr_0.6fr_0.5fr_0.1fr] sm:items-center'>
      <div className='flex items-start gap-3'>
        <div className='h-24 w-24 shrink-0 rounded-md bg-slate-200' />
        <div className='min-w-0 flex-1'>
          <div className='mb-2 h-3 w-24 rounded bg-slate-200' />
          <div className='h-4 w-5/6 rounded bg-slate-200' />
          <div className='mt-2 h-3 w-2/3 rounded bg-slate-200' />
        </div>
      </div>

      <div className='flex justify-start sm:justify-center'>
        <div className='h-8 w-24 rounded-full bg-slate-200' />
      </div>

      <div className='sm:text-right'>
        <div className='h-4 w-16 rounded bg-slate-200 sm:ml-auto' />
        <div className='mt-2 h-3 w-12 rounded bg-slate-200 sm:ml-auto' />
      </div>

      <div className='h-8 w-8 rounded-full bg-slate-200 sm:justify-self-end' />
    </article>
  )
}

export default CartItemSkeletonRow
