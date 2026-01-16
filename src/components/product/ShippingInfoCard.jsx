const ShippingInfoCard = ({ shippingEstimate }) => {
  return (
    <div className='space-y-3 text-sm text-gray-700'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2 font-semibold text-green-700'>
          <svg
            className='h-5 w-5'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 17h6m-6 0a2 2 0 104 0m-4 0a2 2 0 104 0m-9-5V6a1 1 0 011-1h9a1 1 0 011 1v5m4 0l-2-3h-2v3h4z'
            />
          </svg>
          Free shipping
        </div>
        <span className='text-gray-400'>&rsaquo;</span>
      </div>

      <div className='grid gap-3 sm:grid-cols-2'>
        <div className='rounded-lg bg-gray-50 p-3'>
          <div className='font-semibold text-green-700'>
            Standard: free on all orders
          </div>
          <div className='text-xs text-gray-500'>
            Delivery: arrives in NG as little as {shippingEstimate}
          </div>
          <div className='text-xs text-gray-400 mt-1'>
            Courier company: Speedaf GIG GIG
          </div>
        </div>
        <div className='rounded-lg bg-gray-50 p-3 flex items-center justify-between'>
          <div className='font-semibold text-green-700'>
            Click &amp; Collect: FREE
          </div>
          <span className='w-6 h-6 rounded-full bg-white shadow flex items-center justify-center text-gray-500'>
            &rsaquo;
          </span>
        </div>
      </div>

      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2 text-green-700 font-semibold'>
          <svg
            className='h-5 w-5'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 11c0 2.21-1.79 4-4 4S4 13.21 4 11 5.79 7 8 7s4 1.79 4 4zm8-1v2a8 8 0 01-16 0v-2a8 8 0 0116 0z'
            />
          </svg>
          Safe payments &middot; Secure privacy
        </div>
        <span className='text-gray-400'>&rsaquo;</span>
      </div>

      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2 font-semibold text-green-700'>
          <svg
            className='h-5 w-5'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
          Order guarantee
        </div>
        <span className='text-gray-400'>&rsaquo;</span>
      </div>

      <div className='flex flex-wrap gap-2'>
        {[
          '90-day returns',
          '₦1,600 credit for delay',
          'Return if item damaged',
          '15-day no update',
        ].map((chip) => (
          <span
            key={chip}
            className='text-[11px] px-2 py-1 rounded-full bg-green-700 text-white'
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  )
}

export default ShippingInfoCard
