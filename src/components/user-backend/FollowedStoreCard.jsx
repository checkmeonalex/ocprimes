import Link from 'next/link'
import ProductGrid from '@/components/product/ProductGrid'
import ProductCardSkeleton from '@/components/ProductCardSkeleton'

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
              <p className='truncate text-base font-semibold text-slate-900'>{brandName}</p>
              <p className='mt-0.5 text-xs text-slate-500'>
                {slug ? `@${slug}` : '@store'} • {formatFollowDate(store?.followed_at)}
              </p>
              <p className='mt-1 text-xs text-slate-600'>
                {formatFollowerCount(store?.followers)} followers
              </p>
            </div>
          </div>
        </div>
        <div className='flex gap-2'>
          <Link
            href={slug ? `/vendors/${encodeURIComponent(slug)}` : '/products'}
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
