'use client'

const formatAddressLines = (address) => {
  if (!address) return []
  return [
    address.line1,
    address.line2,
    [address.city, address.state].filter(Boolean).join(', '),
    [address.postalCode, address.country].filter(Boolean).join(', '),
  ].filter(Boolean)
}

const ShippingAddressCard = ({ address, isSelected, onSelect, onEdit }) => {
  const lines = formatAddressLines(address)
  const label = address?.label || 'Address'

  return (
    <div
      className={`w-full rounded-md border p-4 text-left transition ${
        isSelected
          ? 'border-blue-500 bg-blue-50/30 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className='relative'>
        <button type='button' onClick={onSelect} className='w-full pr-10 text-left'>
          <div className='flex items-start justify-between gap-2'>
            <div>
              <p className='text-sm font-semibold text-slate-900'>{label}</p>
              <div className='mt-2 space-y-1'>
                {lines.length > 0 ? (
                  lines.map((line) => (
                    <p key={`${label}-${line}`} className='text-xs text-slate-600'>
                      {line}
                    </p>
                  ))
                ) : (
                  <p className='text-xs text-slate-500'>Address details not set.</p>
                )}
              </div>
            </div>
            <svg
              viewBox='0 0 20 20'
              className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              aria-hidden='true'
            >
              <path d='M4.5 10.5l3.2 3.2 7.8-7.8' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </div>
        </button>
        <button
          type='button'
          onClick={onEdit}
          className='absolute right-0 top-0 inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700'
          aria-label='Edit address'
        >
          <svg
            viewBox='0 0 20 20'
            className='h-5 w-5'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.8'
            aria-hidden='true'
          >
            <path
              d='M3.5 13.5v3h3L15.6 7.4a1.2 1.2 0 0 0 0-1.7L14.3 4.4a1.2 1.2 0 0 0-1.7 0L3.5 13.5Z'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <path d='m11.5 5.5 3 3' strokeLinecap='round' strokeLinejoin='round' />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default ShippingAddressCard
