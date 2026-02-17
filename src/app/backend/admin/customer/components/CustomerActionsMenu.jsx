import React from 'react'

function CustomerActionsMenu({ customer, isOpen, onToggle, onEdit, onNavigate }) {
  const customerId = customer?.id
  if (!customerId) return null

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={() => onToggle(customerId)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
        aria-label="Customer actions"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <circle cx="6" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="18" cy="12" r="1.8" />
        </svg>
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_20px_48px_rgba(15,23,42,0.18)]">
          <button
            type="button"
            onClick={() => onEdit(customer)}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <span>Edit customer</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate(`/backend/admin/customers/${customerId}`)}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <span>Profile</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate(`/backend/admin/customers/${customerId}/addresses`)}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <span>Addresses</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate(`/backend/admin/customers/${customerId}/about`)}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <span>About</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate(`/backend/admin/customers/${customerId}/security`)}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <span>Security</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const customerSearch = encodeURIComponent(customer?.name || '')
              onNavigate(`/backend/admin/orders?customer=${customerSearch}`)
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <span>Customer orders</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const reviewSearch = encodeURIComponent(customer?.name || '')
              onNavigate(`/backend/admin/reviews?q=${reviewSearch}`)
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <span>Customer reviews</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default CustomerActionsMenu
