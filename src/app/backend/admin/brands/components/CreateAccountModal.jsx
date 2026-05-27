'use client'

import { useEffect, useState } from 'react'

const initialState = {
  full_name: '',
  email: '',
  password: '',
  brand_name: '',
}

export default function CreateAccountModal({
  open,
  role,
  isSaving,
  error,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(initialState)

  useEffect(() => {
    if (!open) return
    setForm(initialState)
  }, [open, role])

  if (!open) return null

  const isVendor = role === 'vendor'
  const title = isVendor ? 'Add Vendor' : 'Add Customer'
  const submitLabel = isSaving ? 'Saving...' : isVendor ? 'Create vendor' : 'Create customer'

  const handleSubmit = (event) => {
    event.preventDefault()
    if (isSaving) return
    onSubmit({
      role,
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      password: form.password,
      brand_name: form.brand_name.trim(),
    })
  }

  return (
    <div className='fixed inset-0 z-[90] bg-slate-900/45 p-3 sm:p-6'>
      <div className='mx-auto w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl'>
        <div className='flex items-center justify-between border-b border-slate-100 px-5 py-4'>
          <h2 className='text-lg font-semibold text-slate-900'>{title}</h2>
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
          <label className='block space-y-1.5'>
            <span className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-400'>Full name</span>
            <input
              type='text'
              value={form.full_name}
              onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
              className='h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400'
              placeholder='Jane Cooper'
              required
            />
          </label>

          <label className='block space-y-1.5'>
            <span className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-400'>Email</span>
            <input
              type='email'
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className='h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400'
              placeholder='name@example.com'
              required
            />
          </label>

          <label className='block space-y-1.5'>
            <span className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-400'>Temporary password</span>
            <input
              type='password'
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              className='h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400'
              placeholder='Minimum 8 characters'
              minLength={8}
              required
            />
          </label>

          {isVendor ? (
            <label className='block space-y-1.5'>
              <span className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-400'>Brand name</span>
              <input
                type='text'
                value={form.brand_name}
                onChange={(event) => setForm((prev) => ({ ...prev, brand_name: event.target.value }))}
                className='h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400'
                placeholder='OCPRIMAX'
                required
              />
            </label>
          ) : null}

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
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
