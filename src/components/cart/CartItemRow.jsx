'use client'

import Image from 'next/image'
import Link from 'next/link'
import CartQuantitySelect from '@/components/cart/CartQuantitySelect'
import SellerIcon from '@/components/cart/SellerIcon'
import { isReturnPolicyDisabled, normalizeReturnPolicyKey } from '@/lib/cart/return-policy'
import { getSelectionSummary } from '@/lib/cart/selection-summary'
import { buildVendorHref } from '@/lib/cart/vendor-link'

const buildProductHref = (item) => {
  const params = new URLSearchParams()
  if (item.selectedVariationId && item.selectedVariationId !== 'default') {
    params.set('variant', item.selectedVariationId)
  }
  if (item.selectedColor && item.selectedColor !== 'default') {
    params.set('color', item.selectedColor)
  }
  if (item.selectedSize && item.selectedSize !== 'default') {
    params.set('size', item.selectedSize)
  }
  const query = params.toString()
  return `/product/${item.slug || item.id}${query ? `?${query}` : ''}`
}

const CartItemRow = ({
  item,
  formatMoney,
  updateQuantity,
  removeItem,
  retryItem,
  returnPolicyBySlug,
}) => {
  const selectionSummary = getSelectionSummary(item)
  const sourceName = String(item?.sourceName || item?.vendorName || item?.storeName || 'OCPRIMES')
  const slug = String(item?.slug || '').trim()
  const policyKey =
    normalizeReturnPolicyKey(item?.returnPolicy) ||
    normalizeReturnPolicyKey(returnPolicyBySlug?.[slug])
  const isNonReturnable = isReturnPolicyDisabled(policyKey)
  const sourceHref = buildVendorHref({
    slug: item?.sourceSlug || item?.vendorSlug || item?.storeSlug,
    name: sourceName,
  })

  return (
    <article className='grid grid-cols-1 gap-4 border-b border-slate-200 px-4 py-5 last:border-b-0 sm:grid-cols-[1.7fr_0.6fr_0.5fr_0.1fr] sm:items-center'>
      <div className='flex items-start gap-3'>
        <div className='relative h-24 w-24 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100'>
          {item.image ? (
            <Image src={item.image} alt={item.name} fill sizes='96px' className='object-cover' />
          ) : null}
        </div>
        <div className='min-w-0'>
          <div className='mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700'>
            <SellerIcon className='h-4 w-4 text-slate-600' />
            <Link href={sourceHref} className='line-clamp-1 hover:underline'>
              {sourceName}
            </Link>
            <svg
              viewBox='0 0 20 20'
              className='h-3.5 w-3.5 text-slate-500'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              aria-hidden='true'
            >
              <path d='M8 5l5 5-5 5' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </div>
          <Link
            href={buildProductHref(item)}
            className='line-clamp-2 text-[15px] font-semibold leading-5 text-slate-900 hover:underline'
          >
            {item.name}
          </Link>
          <p className='mt-1 line-clamp-1 text-[13px] text-slate-500'>{selectionSummary}</p>
          {isNonReturnable ? (
            <p className='mt-1 inline-flex items-center gap-1.5 text-[12px] text-slate-500'>
              <span
                className='inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-400 text-[9px] font-semibold text-slate-500'
                aria-hidden='true'
              >
                i
              </span>
              This item cannot be returned or exchanged
            </p>
          ) : null}
          {item.syncError ? (
            <button
              type='button'
              onClick={() => retryItem(item.key)}
              className='mt-1 text-xs font-semibold text-rose-600 hover:text-rose-700'
            >
              {item.syncError}
            </button>
          ) : null}
        </div>
      </div>

      <div className='flex items-center justify-start sm:justify-center'>
        <CartQuantitySelect
          quantity={item.quantity}
          onChange={(nextQuantity) => updateQuantity(item.key, nextQuantity)}
          isLoading={Boolean(item.isSyncing)}
        />
      </div>

      <div className='flex items-center justify-between sm:block sm:text-right'>
        <p className='text-sm font-semibold text-slate-900'>{formatMoney(item.price)}</p>
        {item.originalPrice ? (
          <p className='text-xs text-slate-400 line-through'>{formatMoney(item.originalPrice)}</p>
        ) : null}
      </div>

      <button
        type='button'
        onClick={() => removeItem(item.key)}
        className='inline-flex h-8 w-8 items-center justify-center rounded-full text-rose-500 hover:bg-rose-50 hover:text-rose-600 sm:justify-self-end'
        aria-label='Remove item'
      >
        <svg viewBox='-7.29 0 122.88 122.88' className='h-3.5 w-3.5 fill-current' aria-hidden='true'>
          <path d='M77.4,49.1h-5.94v56.09h5.94V49.1L77.4,49.1L77.4,49.1z M6.06,9.06h32.16V6.2c0-0.1,0-0.19,0.01-0.29 c0.13-2.85,2.22-5.25,5.01-5.79C43.97-0.02,44.64,0,45.38,0H63.9c0.25,0,0.49-0.01,0.73,0.02c1.58,0.08,3.02,0.76,4.06,1.81 c1.03,1.03,1.69,2.43,1.79,3.98c0.01,0.18,0.02,0.37,0.02,0.55v2.7H103c0.44,0,0.75,0.01,1.19,0.08c2.21,0.36,3.88,2.13,4.07,4.37 c0.02,0.24,0.03,0.47,0.03,0.71v10.54c0,1.47-1.19,2.66-2.67,2.66H2.67C1.19,27.43,0,26.23,0,24.76V24.7v-9.91 C0,10.64,2.04,9.06,6.06,9.06L6.06,9.06z M58.07,49.1h-5.95v56.09h5.95V49.1L58.07,49.1L58.07,49.1z M38.74,49.1H32.8v56.09h5.95 V49.1L38.74,49.1L38.74,49.1z M10.74,31.57h87.09c0.36,0.02,0.66,0.04,1.03,0.1c1.25,0.21,2.4,0.81,3.27,1.66 c1.01,1,1.67,2.34,1.7,3.83c0,0.31-0.03,0.63-0.06,0.95l-7.33,78.66c-0.1,1.03-0.27,1.95-0.79,2.92c-1.01,1.88-2.88,3.19-5.2,3.19 H18.4c-0.55,0-1.05,0-1.59-0.08c-0.22-0.03-0.43-0.08-0.64-0.14c-0.31-0.09-0.62-0.21-0.91-0.35c-0.27-0.13-0.52-0.27-0.78-0.45 c-1.51-1.04-2.51-2.78-2.69-4.72L4.5,37.88c-0.02-0.25-0.04-0.52-0.04-0.77c0.05-1.48,0.7-2.8,1.7-3.79 c0.88-0.86,2.06-1.47,3.33-1.67C9.9,31.59,10.34,31.57,10.74,31.57L10.74,31.57z M97.75,36.9H10.6c-0.57,0-0.84,0.1-0.79,0.7 l7.27,79.05h0l0,0.01c0.03,0.38,0.2,0.69,0.45,0.83l0,0l0.08,0.03l0.06,0.01l0.08,0h72.69c0.6,0,0.67-0.84,0.71-1.28l7.34-78.71 C98.53,37.04,98.23,36.9,97.75,36.9L97.75,36.9z' />
        </svg>
      </button>
    </article>
  )
}

export default CartItemRow
