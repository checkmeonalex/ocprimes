import React from 'react'
import LoadingButton from '@/components/LoadingButton'

function CustomerQuickEditModal({
  open,
  form,
  notifyCustomer,
  onClose,
  onChange,
  onToggleNotify,
  onSubmit,
  isSaving,
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] bg-slate-900/45 p-3 sm:p-5">
      <div className="mx-auto mt-8 w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_rgba(15,23,42,0.3)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Customer</p>
            <p className="text-sm font-semibold text-slate-900">Quick edit profile</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 px-5 py-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Full name</span>
            <input
              value={form.name}
              onChange={(event) => onChange('name', event.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none"
              required
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => onChange('email', event.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none"
              required
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Phone</span>
              <input
                value={form.phone}
                onChange={(event) => onChange('phone', event.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Job title</span>
              <input
                value={form.job_title}
                onChange={(event) => onChange('job_title', event.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none"
              />
            </label>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div>
              <p className="text-xs font-semibold text-slate-700">Notify customer</p>
              <p className="text-[11px] text-slate-500">Send update notice after saving changes.</p>
            </div>
            <button
              type="button"
              onClick={onToggleNotify}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                notifyCustomer ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
              aria-label="Toggle notify customer"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                  notifyCustomer ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <LoadingButton
            type="submit"
            isLoading={isSaving}
            className="w-full rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            Save changes
          </LoadingButton>
        </form>
      </div>
    </div>
  )
}

export default CustomerQuickEditModal
