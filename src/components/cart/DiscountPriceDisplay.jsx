'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'

const toMoneyNumber = (value) => Number(value || 0)

const DiscountPriceDisplay = ({
  price,
  originalPrice,
  formatMoney,
  size = 'regular',
  align = 'right',
  itemName = '',
  itemImage = '',
  itemMeta = '',
  quantity = 1,
}) => {
  const [open, setOpen] = useState(false)

  const details = useMemo(() => {
    const current = toMoneyNumber(price)
    const original = toMoneyNumber(originalPrice)
    const hasDiscount = original > 0 && current > 0 && original > current
    const savings = hasDiscount ? original - current : 0
    const percent = hasDiscount ? Math.round((savings / original) * 100) : 0
    const safeQuantity = Math.max(1, Number(quantity || 1))
    const listTotal = hasDiscount ? original * safeQuantity : current * safeQuantity
    const discountTotal = hasDiscount ? savings * safeQuantity : 0
    const finalTotal = current * safeQuantity
    return {
      current,
      original,
      hasDiscount,
      savings,
      percent,
      safeQuantity,
      listTotal,
      discountTotal,
      finalTotal,
    }
  }, [price, originalPrice, quantity])

  if (!details.hasDiscount) {
    const plainPriceClass = size === 'compact' ? 'text-[20px]' : 'text-[24px]'
    const plainAlignClass = align === 'left' ? 'text-left' : 'text-right'
    return (
      <p className={`${plainPriceClass} ${plainAlignClass} whitespace-nowrap leading-none font-bold text-slate-900`}>
        {formatMoney(details.current)}
      </p>
    )
  }

  const priceSizeClass = size === 'compact' ? 'text-[20px]' : 'text-[26px]'
  const stackAlignClass = align === 'left' ? 'items-start text-left' : 'items-end text-right'

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className={`inline-flex flex-col gap-1.5 whitespace-nowrap ${stackAlignClass}`}
        aria-label='View discount details'
      >
        <span className={`${priceSizeClass} whitespace-nowrap leading-none font-bold text-[#ff4d1f]`}>
          {formatMoney(details.current)}
        </span>
        <span className='inline-flex items-center gap-1.5'>
          <span className='text-xs leading-none text-slate-400 line-through'>
            {formatMoney(details.original)}
          </span>
          <span className='inline-flex items-center gap-0.5 rounded-sm bg-[#fff2ec] px-1.5 py-0.5 text-[11px] font-semibold text-[#ff4d1f]'>
            -{details.percent}%
            <svg viewBox='0 0 20 20' className='h-3.5 w-3.5' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M8 5l5 5-5 5' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </span>
        </span>
      </button>

      {open ? (
        <div className='fixed inset-0 z-[90] md:flex md:items-center md:justify-center md:p-4'>
          <button
            type='button'
            onClick={() => setOpen(false)}
            className='absolute inset-0 bg-black/45'
            aria-label='Close discount details'
          />
          <section className='modal-scroll absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-3xl border-t border-slate-200 bg-white [animation:discount-sheet-up_220ms_ease-out] md:relative md:inset-auto md:max-h-[75vh] md:w-full md:max-w-[520px] md:rounded-none md:border md:border-slate-200 md:[animation:none]'>
            <div className='sticky top-0 z-10 mb-4 border-b border-slate-100 bg-white px-5 py-4 md:px-6 md:py-4'>
              <div className='pr-10 text-left'>
                <h2 className='text-lg font-semibold text-slate-900'>Price details for this item</h2>
                <p className='text-xs text-slate-500'>Clear breakdown of your savings and final total.</p>
              </div>
              <button
                type='button'
                onClick={() => setOpen(false)}
                className='absolute right-5 top-4 inline-flex items-center justify-center text-2xl font-bold leading-none text-slate-600 transition hover:text-slate-900 md:right-6 md:top-4'
                aria-label='Close'
              >
                <span aria-hidden='true'>×</span>
              </button>
            </div>

            <div className='space-y-3 px-5 pb-5 text-left text-sm text-slate-700 md:px-6 md:pb-6'>
              <div className='rounded-2xl border border-slate-200 bg-slate-50/80 p-3'>
                <div className='grid grid-cols-[56px_1fr] items-start gap-3 text-left'>
                  {itemImage ? (
                    <div className='relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white'>
                      <Image
                        src={itemImage}
                        alt={itemName || 'Cart item'}
                        fill
                        sizes='56px'
                        className='object-cover'
                        draggable={false}
                      />
                    </div>
                  ) : null}
                  <div className='min-w-0 text-left' style={{ textAlign: 'left' }}>
                    {itemName ? (
                      <p
                        className='line-clamp-2 text-left text-[15px] font-semibold leading-5 text-slate-900'
                        style={{ textAlign: 'left' }}
                      >
                        {itemName}
                      </p>
                    ) : null}
                    <div className='mt-1 grid grid-cols-[1fr_auto] items-end gap-3'>
                      {itemMeta ? (
                        <p
                          className='line-clamp-1 min-w-0 text-left text-[12px] text-slate-500'
                          style={{ textAlign: 'left' }}
                        >
                          {itemMeta}
                        </p>
                      ) : (
                        <span />
                      )}
                      <p className='whitespace-nowrap text-right text-[15px] font-semibold tabular-nums text-[#ff4d1f]'>
                        {formatMoney(details.current)} x {details.safeQuantity}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className='flex items-center justify-between'>
                <span>List total</span>
                <span className='font-semibold tabular-nums text-slate-400 line-through'>
                  {formatMoney(details.listTotal)}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span>Item discount</span>
                <span className='font-semibold tabular-nums text-[#ff4d1f]'>-{formatMoney(details.discountTotal)}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span>Price after discount</span>
                <span className='font-semibold tabular-nums text-slate-900'>{formatMoney(details.finalTotal)}</span>
              </div>
              <div className='my-1 h-px w-full bg-slate-200' />
              <div className='flex items-center justify-between'>
                <span className='font-semibold text-slate-900'>Current total</span>
                <span className='font-bold tabular-nums text-slate-900'>{formatMoney(details.finalTotal)}</span>
              </div>
              <p className='rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-[12px] text-orange-700'>
                Your discount is automatically applied at checkout.
              </p>
            </div>
          </section>
          <style jsx>{`
            @keyframes discount-sheet-up {
              from {
                transform: translateY(24px);
                opacity: 0.96;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }
            .modal-scroll {
              scrollbar-width: thin;
              scrollbar-color: rgba(148, 163, 184, 0.35) transparent;
            }
            .modal-scroll::-webkit-scrollbar {
              width: 4px;
              height: 4px;
            }
            .modal-scroll::-webkit-scrollbar-track {
              background: transparent;
            }
            .modal-scroll::-webkit-scrollbar-thumb {
              background: rgba(148, 163, 184, 0.35);
              border-radius: 9999px;
            }
          `}</style>
        </div>
      ) : null}
    </>
  )
}

export default DiscountPriceDisplay
