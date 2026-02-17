'use client'

import { useEffect, useState } from 'react'

const initialForm = {
  brand_name: '',
}

export default function CreateVendorBrandModal({
  open,
  vendorEmail,
  isSaving,
  error,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    if (!open) return
    setForm(initialForm)
  }, [open])

  if (!open) return null

  const handleSubmit = (event) => {
    event.preventDefault()
    if (isSaving) return
    onSubmit({ brand_name: form.brand_name.trim() })
  }

  return (
    <div className='fixed inset-0 z-[95] bg-slate-900/45 p-3 sm:p-6'>
      <div className='mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl'>
        <div className='flex items-center justify-between border-b border-slate-100 px-5 py-4'>
          <h2 className='text-lg font-semibold text-slate-900'>Add Brand to Seller</h2>
          <button
            type='button'
            onClick={onClose}
            className='inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100'
            aria-label='Close'
          >
            <svg viewBox='0 0 24 24' className='h-4.5 w-4.5' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M6 6l12 12M18 6 6 18' strokeLinecap='round' />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4 px-5 py-5'>
          <p className='text-sm text-slate-600'>Seller: <span className='font-semibold text-slate-800'>{vendorEmail || '--'}</span></p>

          <label className='block space-y-1.5'>
            <span className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-400'>Brand name</span>
            <input
              type='text'
              value={form.brand_name}
              onChange={(event) => setForm((prev) => ({ ...prev, brand_name: event.target.value }))}
              className='h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400'
              placeholder='Brand name'
              required
            />
          </label>

          {error ? <p className='text-sm text-rose-500'>{error}</p> : null}

          <div className='flex items-center justify-end gap-2 pt-1'>
            <button
              type='button'
              onClick={onClose}
              disabled={isSaving}
              className='h-10 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={isSaving}
              className='h-10 rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70'
            >
              {isSaving ? 'Saving...' : 'Create brand'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
