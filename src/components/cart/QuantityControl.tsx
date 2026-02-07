'use client'

import glassStyles from '@/styles/glass/glass.module.css'

type QuantityControlProps = {
  quantity: number
  onIncrement: () => void
  onDecrement: () => void
  onSetQuantity?: (quantity: number) => void
  size?: 'sm' | 'md'
  fullWidth?: boolean
  isLoading?: boolean
  appearance?: 'glass' | 'solid'
  controlType?: 'stepper' | 'select'
  maxQuantity?: number
  stylePreset?: 'default' | 'card'
}

const sizeStyles = {
  sm: {
    wrapper: 'h-8 text-xs px-2 gap-2',
    button: 'h-6 w-6',
    label: 'text-xs',
    select: 'h-7 text-xs pl-9 pr-8',
    tag: 'left-2 text-[10px]',
    chevron: 'right-2 h-3.5 w-3.5',
  },
  md: {
    wrapper: 'h-11 text-sm px-3 gap-3',
    button: 'h-8 w-8',
    label: 'text-sm',
    select: 'h-9 text-sm pl-10 pr-9',
    tag: 'left-3 text-xs',
    chevron: 'right-3 h-4 w-4',
  },
}

const QuantityControl = ({
  quantity,
  onIncrement,
  onDecrement,
  onSetQuantity,
  size = 'sm',
  fullWidth = false,
  isLoading = false,
  appearance = 'glass',
  controlType = 'stepper',
  maxQuantity = 10,
  stylePreset = 'default',
}: QuantityControlProps) => {
  const sizeClass = sizeStyles[size]
  const isSolid = appearance === 'solid'
  const isSelect = controlType === 'select'
  const wrapperClass = isSolid
    ? 'bg-white border border-gray-200 text-gray-900 shadow-sm'
    : `${glassStyles.liquidGlass}`
  const buttonClass = isSolid
    ? 'border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
    : `${glassStyles.liquidGlassButton} ${glassStyles.liquidGlassText}`
  const labelClass = isSolid
    ? 'text-gray-900'
    : `${glassStyles.liquidGlassText}`
  const spinnerClass = isSolid
    ? 'border-gray-300 border-t-gray-600'
    : `${glassStyles.liquidGlassSpinner}`
  const shouldShowSpinner = isLoading && size !== 'md'
  const safeMax = Math.max(1, Math.min(99, Number(maxQuantity) || 1))
  const selectedQuantity = Math.max(1, Number(quantity) || 1)
  const optionsMax = Math.max(selectedQuantity, safeMax)
  const quantityOptions = Array.from({ length: optionsMax }, (_, index) => index + 1)

  if (isSelect) {
    return (
      <div className={fullWidth ? 'w-full' : 'inline-flex'}>
        <div className='relative flex-1 px-1.5'>
          <span
            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-500 ${sizeClass.tag}`}
          >
            Qty
          </span>
          <select
            aria-label='Select quantity'
            value={selectedQuantity}
            disabled={isLoading}
            onChange={(event) => {
              const next = Number(event.target.value)
              if (!Number.isFinite(next) || next < 1) return
              if (onSetQuantity) {
                onSetQuantity(next)
              }
            }}
            className={`w-full appearance-none rounded-full border border-gray-200 bg-white/95 font-semibold text-gray-900 shadow-sm outline-none transition focus:border-gray-300 focus:ring-2 focus:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-70 ${sizeClass.select}`}
          >
            {quantityOptions.map((qty) => (
              <option key={qty} value={qty} className='bg-white text-gray-900'>
                {qty}
              </option>
            ))}
          </select>
          <svg
            viewBox='0 0 20 20'
            aria-hidden='true'
            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-500 ${sizeClass.chevron}`}
            fill='none'
            stroke='currentColor'
            strokeWidth='1.8'
          >
            <path d='M6 8l4 4 4-4' strokeLinecap='round' strokeLinejoin='round' />
          </svg>
        </div>
      </div>
    )
  }

  const isCardPreset = stylePreset === 'card'

  if (isCardPreset) {
    return (
      <div
        className={`inline-flex items-center rounded-md border border-gray-300 bg-white shadow-sm ${
          fullWidth ? 'w-full' : ''
        }`}
      >
        <button
          type='button'
          aria-label='Decrease quantity'
          onClick={onDecrement}
          className='flex h-6 w-6 items-center justify-center text-sm font-semibold text-gray-700 transition hover:bg-gray-100'
        >
          −
        </button>
        <span className='flex h-6 min-w-8 items-center justify-center border-x border-gray-300 px-2 text-xs font-semibold text-gray-900'>
          {shouldShowSpinner ? (
            <span className='inline-flex items-center justify-center'>
              <span className='h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600' />
            </span>
          ) : (
            quantity
          )}
        </span>
        <button
          type='button'
          aria-label='Increase quantity'
          onClick={onIncrement}
          className='flex h-6 w-6 items-center justify-center text-sm font-semibold text-gray-700 transition hover:bg-gray-100'
        >
          +
        </button>
      </div>
    )
  }

  return (
    <div
      className={`inline-flex items-center justify-between rounded-full font-semibold ${sizeClass.wrapper} ${wrapperClass} ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      <button
        type='button'
        aria-label='Decrease quantity'
        onClick={onDecrement}
        className={`rounded-full transition ${sizeClass.button} ${buttonClass}`}
      >
        −
      </button>
      <span className={`flex-1 text-center ${sizeClass.label} ${labelClass}`}>
        {shouldShowSpinner ? (
          <span className='inline-flex items-center justify-center'>
            <span className={`h-3 w-3 animate-spin rounded-full border-2 ${spinnerClass}`} />
          </span>
        ) : (
          quantity
        )}
      </span>
      <button
        type='button'
        aria-label='Increase quantity'
        onClick={onIncrement}
        className={`rounded-full transition ${sizeClass.button} ${buttonClass}`}
      >
        +
      </button>
    </div>
  )
}

export default QuantityControl
