import Link from 'next/link'
import PaymentMethodBadges from './PaymentMethodBadges'

const ShippingInfoCard = ({ shippingEstimate }) => {
  const normalizedShippingEstimate = String(shippingEstimate || '').trim() || 'Ships in 3-5 business days'

  return (
    <section className='rounded-2xl bg-white py-4 px-3'>
      <h3 className='text-base font-semibold leading-tight text-gray-900'>
        Shop with confidence
      </h3>

      <div className='mt-3 space-y-3'>
        <div className='flex items-start gap-3'>
          <span className='mt-0.5 shrink-0 text-gray-700'>
            <svg className='h-6 w-6' viewBox='0 0 48 48' fill='currentColor' aria-hidden='true'>
              <path d='M37.7,11.1A3,3,0,0,0,35.4,10H34.2l.3-1.7A3.1,3.1,0,0,0,33.9,6a3.2,3.2,0,0,0-2.2-1H7.8a2,2,0,0,0,0,4H30.3l-4,22.9a6.8,6.8,0,0,0-1,2.1H20.7A7,7,0,0,0,7.3,34H6.2l.5-2.9a2,2,0,0,0-1.6-2.3,2,2,0,0,0-2.3,1.6L2,34.7A2.8,2.8,0,0,0,2.7,37a2.8,2.8,0,0,0,2.1,1H7.3a7,7,0,0,0,13.4,0h4.6a7,7,0,0,0,13.4,0h2a3.2,3.2,0,0,0,3.1-2.7L46,22.5ZM14,39a3,3,0,0,1-3-3,3,3,0,0,1,6,0A3,3,0,0,1,14,39ZM33.5,14h1.3l5.9,8H32.1ZM32,39a3,3,0,0,1-3-3,3,3,0,0,1,6,0A3,3,0,0,1,32,39Zm8-5H38.7A7,7,0,0,0,32,29H30.9l.5-3.1h9.9Z' />
              <path d='M4,15H14a2,2,0,0,0,0-4H4a2,2,0,0,0,0,4Z' />
              <path d='M15,19a2,2,0,0,0-2-2H5a2,2,0,0,0,0,4h8A2,2,0,0,0,15,19Z' />
              <path d='M6,23a2,2,0,0,0,0,4h6a2,2,0,0,0,0-4Z' />
            </svg>
          </span>
          <div className='min-w-0 flex-1'>
            <p className='text-sm font-semibold leading-tight text-gray-900'>Fast shipping</p>
            <p className='mt-0.5 text-xs leading-tight text-gray-700'>
              Delivery estimate: {normalizedShippingEstimate}.
            </p>
          </div>
        </div>

        <div className='flex items-start gap-3'>
          <span className='mt-0.5 shrink-0 text-gray-700'>
            <svg className='h-6 w-6' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M12 3 4.5 6v5.5c0 4.5 3 8.5 7.5 9.5 4.5-1 7.5-5 7.5-9.5V6L12 3Z' />
              <path strokeLinecap='round' strokeLinejoin='round' d='m8.5 11.5 2.1 2.1 4.9-4.9' />
            </svg>
          </span>
          <div className='min-w-0 flex-1'>
            <p className='text-sm font-semibold leading-tight text-gray-900'>Return Policy</p>
            <p className='mt-0.5 text-xs leading-tight text-gray-700'>
              30 days to return or exchange
            </p>
            <Link
              href='/returns-policy'
              className='mt-1 inline-flex text-xs font-semibold text-gray-900 underline underline-offset-2 hover:text-black'
            >
              Read return policy
            </Link>
          </div>
        </div>

        <div className='flex items-start gap-3'>
          <span className='mt-0.5 shrink-0 text-gray-700'>
            <svg className='h-6 w-6' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
              <rect x='4.25' y='10' width='15.5' height='10' rx='2.25' />
              <path strokeLinecap='round' strokeLinejoin='round' d='M8 10V8.2a4 4 0 1 1 8 0V10' />
            </svg>
          </span>
          <div className='min-w-0 flex-1'>
            <p className='text-sm font-semibold leading-tight text-gray-900'>Secure payment</p>
            <p className='mt-0.5 text-xs leading-tight text-gray-700'>
              All checkout transactions are encrypted and protected.
            </p>
            <PaymentMethodBadges />
          </div>
        </div>
      </div>
    </section>
  )
}

export default ShippingInfoCard
