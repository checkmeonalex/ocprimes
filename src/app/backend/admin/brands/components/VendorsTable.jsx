'use client'

import Link from 'next/link'

const toDateLabel = (value) => {
  const date = new Date(value || '')
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function VendorAvatar({ name, logoUrl }) {
  const initials = (name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase()

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className="h-8 w-8 shrink-0 rounded-lg object-cover bg-slate-100"
      />
    )
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[11px] font-bold italic text-white">
      {initials || '?'}
    </div>
  )
}

export default function VendorsTable({ items, onOpenBrand }) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3.5 10.5h17M5 10.5V19h14v-8.5M4.5 6h15l1 4.5h-17Z" />
            <path d="M9.5 14h5V19h-5Z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">No vendors found</p>
          <p className="mt-0.5 text-xs text-slate-400">Add a vendor account to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      {/* Column headers */}
      <div className="min-w-[680px]">
        <div className="grid grid-cols-[1fr_180px_160px_100px_40px] gap-4 border-b border-slate-100 px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest text-slate-400">
          <span>Vendor</span>
          <span>Owner</span>
          <span>Joined</span>
          <span>Status</span>
          <span />
        </div>

        <div className="divide-y divide-slate-50">
          {items.map((item) => {
            const isLinked = Boolean(String(item?.owner_user_id || '').trim())
            return (
              <div
                key={item.id}
                className="group grid min-w-[680px] grid-cols-[1fr_180px_160px_100px_40px] items-center gap-4 px-5 py-3 transition-colors hover:bg-slate-50/70"
              >
                {/* Vendor name + slug */}
                <div className="flex items-center gap-3 min-w-0">
                  <VendorAvatar name={item.brand_name} logoUrl={item.logo_url} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800 leading-tight">
                      {item.brand_name || '—'}
                    </p>
                    <p className="font-mono truncate text-[11px] text-slate-400 leading-tight mt-0.5">
                      /{item.brand_slug || '—'}
                    </p>
                  </div>
                </div>

                {/* Owner email */}
                <p className="truncate text-xs text-slate-500">
                  {item.owner_email || <span className="text-slate-300 italic">No owner</span>}
                </p>

                {/* Created date */}
                <p className="font-mono text-xs text-slate-400" style={{ fontFeatureSettings: '"tnum"' }}>
                  {toDateLabel(item.created_at)}
                </p>

                {/* Status badge */}
                <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-normal uppercase tracking-wide ${
                  isLinked
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-amber-50 text-amber-600'
                }`}>
                  {isLinked ? 'Active' : 'Unlinked'}
                </span>

                {/* Action */}
                <button
                  type="button"
                  onClick={() => onOpenBrand?.(item)}
                  disabled={!isLinked}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600 disabled:pointer-events-none disabled:opacity-0"
                  aria-label="Open vendor workspace"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
