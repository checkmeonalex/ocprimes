'use client'

import styles from '@/styles/glass/glass.module.css'

type QuantityControlProps = {
  quantity: number
  onIncrement: () => void
  onDecrement: () => void
  size?: 'sm' | 'md'
  fullWidth?: boolean
  isLoading?: boolean
}

const sizeStyles = {
  sm: {
    wrapper: 'h-8 text-xs px-2 gap-2',
    button: 'h-6 w-6',
    label: 'text-xs',
  },
  md: {
    wrapper: 'h-11 text-sm px-3 gap-3',
    button: 'h-8 w-8',
    label: 'text-sm',
  },
}

const QuantityControl = ({
  quantity,
  onIncrement,
  onDecrement,
  size = 'sm',
  fullWidth = false,
  isLoading = false,
}: QuantityControlProps) => {
  const styles = sizeStyles[size]
  return (
    <div
      className={`inline-flex items-center justify-between rounded-full font-semibold ${styles.wrapper} ${styles.liquidGlass} ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      <button
        type='button'
        aria-label='Decrease quantity'
        onClick={onDecrement}
        className={`rounded-full transition ${styles.button} ${styles.liquidGlassButton} ${styles.liquidGlassText}`}
      >
        −
      </button>
      <span className={`flex-1 text-center ${styles.label} ${styles.liquidGlassText}`}>
        {isLoading ? (
          <span className='inline-flex items-center justify-center'>
            <span className={`h-3 w-3 animate-spin rounded-full border-2 ${styles.liquidGlassSpinner}`} />
          </span>
        ) : size === 'md' ? (
          `${quantity} added`
        ) : (
          quantity
        )}
      </span>
      <button
        type='button'
        aria-label='Increase quantity'
        onClick={onIncrement}
        className={`rounded-full transition ${styles.button} ${styles.liquidGlassButton} ${styles.liquidGlassText}`}
      >
        +
      </button>
    </div>
  )
}

export default QuantityControl
