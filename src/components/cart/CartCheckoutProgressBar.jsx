'use client'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const toMoney = (value) => {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, number)
}

export default function CartCheckoutProgressBar({
  subtotal = 0,
  formatMoney,
  config,
}) {
  if (config && config.enabled === false) {
    return null
  }
  const freeShippingThreshold = toMoney(config?.freeShippingThreshold || 50)
  const cashbackThreshold = Math.max(
    freeShippingThreshold + 1,
    toMoney(config?.cashbackThreshold || 85),
  )
  const cashbackPercent = clamp(Number(config?.cashbackPercent || 3), 0, 100)
  const total = toMoney(subtotal)

  const remainingForCashback = Math.max(0, cashbackThreshold - total)
  const progressPercent = clamp((total / cashbackThreshold) * 100, 0, 100)
  const freeShippingMarkerPercent = clamp(
    (freeShippingThreshold / cashbackThreshold) * 100,
    0,
    100,
  )
  const progressLabel =
    remainingForCashback > 0
      ? `Great! You have free shipping, only ${formatMoney(
          remainingForCashback,
        )} away from getting ${cashbackPercent}% extra cashback`
      : `Amazing! You unlocked free shipping and ${cashbackPercent}% extra cashback`

  return (
    <section className='rounded-xl border border-slate-200 bg-white px-4 py-3'>
      <p className='text-center text-[12px] font-semibold text-slate-800'>
        {progressLabel}
      </p>

      <div className='mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-700'>
        <span>{formatMoney(0)}</span>
        <span>{formatMoney(cashbackThreshold)}</span>
      </div>

      <div className='relative mt-1.5 h-2 rounded-full bg-slate-200'>
        <div
          className='h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500'
          style={{ width: `${progressPercent}%` }}
        />
        <span
          className='pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white bg-indigo-500 shadow'
          style={{ left: `calc(${progressPercent}% - 7px)` }}
          aria-hidden='true'
        />
      </div>

      <div className='relative mt-2 h-4 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500'>
        <span
          className='absolute -translate-x-1/2'
          style={{ left: `${freeShippingMarkerPercent}%` }}
        >
          Free shipping
        </span>
        <span className='absolute right-0'>{cashbackPercent}% cashback</span>
      </div>
    </section>
  )
}
