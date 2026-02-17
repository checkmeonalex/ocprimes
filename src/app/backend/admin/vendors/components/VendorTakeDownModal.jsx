export default function VendorTakeDownModal({
  open,
  productName,
  mode,
  reason,
  isSubmitting,
  onModeChange,
  onReasonChange,
  onClose,
  onConfirm,
}) {
  if (!open) return null

  return (
    <div className='fixed inset-0 z-[120] bg-slate-900/50 p-4 sm:p-6'>
      <div className='mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl'>
        <div className='flex items-center justify-between border-b border-slate-100 px-5 py-4'>
          <h3 className='text-base font-semibold text-slate-900'>Take down product</h3>
          <button
            type='button'
            onClick={onClose}
            disabled={isSubmitting}
            className='inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-60'
            aria-label='Close'
          >
            <svg viewBox='0 0 24 24' className='h-4.5 w-4.5' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M6 6l12 12M18 6 6 18' strokeLinecap='round' />
            </svg>
          </button>
        </div>

        <div className='space-y-4 px-5 py-5'>
          <p className='text-sm text-slate-700'>
            <span className='font-semibold text-slate-900'>{productName || 'This product'}</span> will be archived. Choose how to notify the seller.
          </p>

          <div className='space-y-2'>
            <label className='flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 px-3 py-2'>
              <input
                type='radio'
                name='takedown-message-mode'
                checked={mode === 'automatic'}
                onChange={() => onModeChange('automatic')}
                disabled={isSubmitting}
                className='mt-1'
              />
              <span>
                <span className='block text-sm font-semibold text-slate-900'>Automatic message</span>
                <span className='block text-xs text-slate-500'>Use a standard moderation notice.</span>
              </span>
            </label>

            <label className='flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 px-3 py-2'>
              <input
                type='radio'
                name='takedown-message-mode'
                checked={mode === 'custom'}
                onChange={() => onModeChange('custom')}
                disabled={isSubmitting}
                className='mt-1'
              />
              <span>
                <span className='block text-sm font-semibold text-slate-900'>Write custom reason</span>
                <span className='block text-xs text-slate-500'>Send your own explanation to the seller.</span>
              </span>
            </label>
          </div>

          {mode === 'custom' ? (
            <textarea
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder='Write reason for takedown...'
              className='min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800'
              maxLength={600}
              disabled={isSubmitting}
              required
            />
          ) : null}
        </div>

        <div className='flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4'>
          <button
            type='button'
            onClick={onClose}
            disabled={isSubmitting}
            className='h-9 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60'
          >
            Cancel
          </button>
          <button
            type='button'
            onClick={onConfirm}
            disabled={isSubmitting || (mode === 'custom' && !String(reason || '').trim())}
            className='h-9 rounded-full bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60'
          >
            {isSubmitting ? 'Taking down...' : 'Confirm takedown'}
          </button>
        </div>
      </div>
    </div>
  )
}
