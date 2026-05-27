import Link from 'next/link'
import ProductGrid from '@/components/product/ProductGrid'
import ProductCardSkeleton from '@/components/ProductCardSkeleton'
import { buildVendorHref } from '@/lib/catalog/vendor'

const PRODUCT_PLACEHOLDER_COUNT = 3

const formatFollowerCount = (value) => {
  const numeric = Math.max(0, Number(value) || 0)
  if (numeric < 1000) return String(numeric)
  if (numeric < 1000000) {
    const compact = numeric / 1000
    return `${compact.toFixed(compact >= 10 ? 0 : 1).replace(/\.0$/, '')}K`
  }
  const compact = numeric / 1000000
  return `${compact.toFixed(compact >= 10 ? 0 : 1).replace(/\.0$/, '')}M`
}

const formatFollowDate = (value) => {
  if (!value) return 'Recently followed'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently followed'
  return `Followed ${date.toLocaleDateString()}`
}

const initialsFromName = (value) => {
  const words = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!words.length) return 'ST'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase()
}

export default function FollowedStoreCard({
  store,
  isUpdating,
  onUnfollow,
  products,
  isLoadingProducts,
  productsError,
  onAddToCart,
}) {
  const brandId = String(store?.brand_id || '')
  const slug = String(store?.brand_slug || '')
  const logoUrl = String(store?.brand_logo_url || '').trim()
  const brandName = String(store?.brand_name || 'Store')
  const brandBadge = String(store?.brand_badge || '').trim()
  const isTrustedBrand = Boolean(store?.brand_is_trusted)
  const trustedBadgeUrl = String(store?.brand_trusted_badge_url || '').trim()
  const safeProducts = Array.isArray(products) ? products : []

  return (
    <article className='rounded-lg border border-slate-200 p-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='min-w-0'>
          <div className='flex items-center gap-3'>
            <div className='h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100'>
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} className='h-full w-full object-cover' />
              ) : (
                <div className='flex h-full w-full items-center justify-center text-sm font-semibold text-slate-700'>
                  {initialsFromName(brandName)}
                </div>
              )}
            </div>
            <div className='min-w-0'>
              <div className='flex min-w-0 items-center gap-1.5'>
                <p className='truncate text-base font-semibold text-slate-900'>{brandName}</p>
                {isTrustedBrand ? (
                  trustedBadgeUrl ? (
                    <img
                      src={trustedBadgeUrl}
                      alt='Verified store'
                      className='h-[18px] w-[18px] shrink-0 object-contain'
                    />
                  ) : (
                    <span
                      className='inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600 ring-1 ring-violet-200'
                      aria-label='Verified store'
                    >
                      <svg
                        viewBox='0 0 16 16'
                        className='h-3.5 w-3.5'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                        aria-hidden='true'
                      >
                        <path
                          d='M8 1.5 9.63 3.15l2.3-.33.32 2.29L14 6.75l-1.75 1.64.32 2.29-2.3-.33L8 12.5l-1.63-1.65-2.3.33-.32-2.29L2 6.75l1.75-1.64-.32-2.29 2.3.33L8 1.5Z'
                          fill='currentColor'
                          fillOpacity='0.16'
                          stroke='currentColor'
                          strokeWidth='1'
                          strokeLinejoin='round'
                        />
                        <path
                          d='m5.6 8.05 1.45 1.45 3.35-3.4'
                          stroke='currentColor'
                          strokeWidth='1.5'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                      </svg>
                    </span>
                  )
                ) : null}
              </div>
              <p className='mt-0.5 text-xs text-slate-500'>
                {slug ? `@${slug}` : '@store'} • {formatFollowDate(store?.followed_at)}
              </p>
              {isTrustedBrand ? (
                <p className='mt-1 text-[11px] font-medium text-violet-700'>
                  {brandBadge || 'Trusted seller'}
                </p>
              ) : null}
              <p className='mt-1 text-xs text-slate-600'>
                {formatFollowerCount(store?.followers)} followers
              </p>
            </div>
          </div>
        </div>
        <div className='flex gap-2'>
          <Link
            href={slug ? buildVendorHref(brandName, slug) : '/products'}
            className='inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'
          >
            Visit
          </Link>
          <button
            type='button'
            onClick={() => onUnfollow(store)}
            disabled={isUpdating}
            className='inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {isUpdating ? 'Removing...' : 'Unfollow'}
          </button>
        </div>
      </div>

      <div className='mt-4'>
        <p className='mb-3 text-sm font-semibold text-slate-900'>Latest picks from {brandName}</p>
        {isLoadingProducts ? (
          <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
            {Array.from({ length: PRODUCT_PLACEHOLDER_COUNT }).map((_, index) => (
              <ProductCardSkeleton key={`${brandId}-loading-product-${index}`} />
            ))}
          </div>
        ) : null}

        {!isLoadingProducts && productsError ? (
          <p className='text-xs text-rose-600'>{productsError}</p>
        ) : null}

        {!isLoadingProducts && !productsError && safeProducts.length ? (
          <ProductGrid
            products={safeProducts}
            onAddToCart={onAddToCart}
            className='grid-cols-2 gap-3 md:grid-cols-3'
          />
        ) : null}

        {!isLoadingProducts && !productsError && !safeProducts.length ? (
          <p className='text-xs text-slate-500'>No products published yet for this store.</p>
        ) : null}
      </div>
    </article>
  )
}
