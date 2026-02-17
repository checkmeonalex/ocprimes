'use client'

const toDateLabel = (value) => {
  const date = new Date(value || '')
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function VendorsTable({ items, onOpenBrand }) {
  if (!items.length) {
    return (
      <div className='px-5 py-14 text-center text-sm text-slate-500'>
        No brands yet. Use <span className='font-semibold text-slate-700'>+ Add Brand Account</span> to create one.
      </div>
    )
  }

  return (
    <div className='overflow-x-auto'>
      <div className='min-w-[980px]'>
        <div className='grid grid-cols-[240px_220px_240px_140px_120px_80px] gap-4 border-y border-slate-100 px-5 py-3 text-[11px] uppercase tracking-[0.14em] text-slate-400'>
          <span>Brand</span>
          <span>Slug</span>
          <span>Owner Email</span>
          <span>Created</span>
          <span>Status</span>
          <span>Action</span>
        </div>

        <div className='divide-y divide-slate-100'>
          {items.map((item) => {
            const isLinked = Boolean(String(item?.owner_user_id || '').trim())
            return (
              <div
                key={item.id}
                className='grid grid-cols-[240px_220px_240px_140px_120px_80px] items-center gap-4 px-5 py-4 text-sm hover:bg-slate-50/80'
              >
                <p className='truncate font-semibold text-slate-800'>{item.brand_name || '--'}</p>
                <p className='truncate text-slate-600'>{item.brand_slug || '--'}</p>
                <p className='truncate text-slate-600'>{item.owner_email || '--'}</p>
                <p className='text-slate-500'>{toDateLabel(item.created_at)}</p>

                <span
                  className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isLinked
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border border-amber-200 bg-amber-50 text-amber-700'
                  }`}
                >
                  {isLinked ? 'Linked' : 'No owner'}
                </span>

                <button
                  type='button'
                  onClick={() => onOpenBrand?.(item)}
                  disabled={!isLinked}
                  className='inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 disabled:opacity-40'
                  aria-label='Brand actions'
                >
                  <svg viewBox='0 0 24 24' className='h-4 w-4' fill='currentColor'>
                    <circle cx='6' cy='12' r='1.7' />
                    <circle cx='12' cy='12' r='1.7' />
                    <circle cx='18' cy='12' r='1.7' />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
