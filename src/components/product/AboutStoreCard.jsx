import Link from 'next/link'
import { buildVendorHref } from '@/lib/catalog/vendor'

const AboutStoreCard = ({
  vendor,
  rating,
  followers,
  soldCount,
  itemsCount,
  badge,
  avatarUrl,
}) => {
  const initials = (vendor || 'V').slice(0, 2).toUpperCase()
  const vendorHref = buildVendorHref(vendor)
  const followersLabel =
    typeof followers === 'number' ? followers.toLocaleString() : followers
  const safeFollowers = followersLabel || '0'
  const safeSoldCount = Number.isFinite(Number(soldCount)) ? Number(soldCount).toLocaleString() : String(soldCount || '0')
  const safeRating = Number.isFinite(Number(rating)) ? Number(rating).toFixed(1) : '0.0'

  return (
    <div className='border border-gray-200 rounded-2xl p-4 bg-white'>
      <div className='flex items-center gap-4'>
        <div className='h-14 w-14 rounded-full overflow-hidden border border-gray-200 bg-gradient-to-br from-sky-100 via-blue-100 to-indigo-100 flex items-center justify-center text-sm font-semibold text-gray-700'>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${vendor} avatar`}
              className='h-full w-full object-cover'
            />
          ) : (
            initials
          )}
        </div>

        <div className='flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <Link href={vendorHref} className='text-base font-semibold text-gray-900 hover:underline'>
              {vendor}
            </Link>
            {badge && (
              <span className='inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 border border-violet-200'>
                ★ {badge}
              </span>
            )}
          </div>
          <div className='mt-1 flex flex-wrap items-center gap-4 text-xs text-gray-500'>
            <div className='text-gray-900 font-semibold'>
              {safeFollowers}{' '}
              <span className='font-normal text-gray-500'>Followers</span>
            </div>
            <div className='text-gray-900 font-semibold'>
              {safeSoldCount}{' '}
              <span className='font-normal text-gray-500'>Sold</span>
            </div>
            <div className='text-gray-900 font-semibold'>
              {safeRating} <span className='text-gray-700'>★</span>
            </div>
          </div>
        </div>
      </div>

      <div className='mt-4 grid grid-cols-2 gap-2 text-xs font-semibold'>
        <button className='border border-gray-300 rounded-full py-2 text-gray-800 hover:bg-gray-50 transition'>
          + Follow
        </button>
        <Link
          href={vendorHref}
          className='border border-gray-300 rounded-full py-2 text-gray-800 hover:bg-gray-50 transition inline-flex items-center justify-center'
        >
          Shop all items ({itemsCount})
        </Link>
      </div>
    </div>
  )
}

export default AboutStoreCard
