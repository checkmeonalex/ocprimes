'use client'

import Link from 'next/link'

const PAGES = [
  {
    key: 'home',
    title: 'Homepage',
    description: 'Hero slider, featured strip, browse cards, and product catalog.',
    status: 'Live',
    editHref: '/backend/admin/pages/home',
    previewHref: '/',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
]

export default function HomePageAdminCard() {
  return (
    <div className="mx-auto w-full max-w-4xl">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Pages</h1>
        <p className="mt-1 text-sm text-slate-500">Manage and edit the pages on your storefront.</p>
      </div>

      {/* Pages list */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Table head */}
        <div className="grid grid-cols-[1fr_auto] items-center border-b border-slate-100 bg-slate-50/70 px-5 py-2.5 sm:grid-cols-[auto_1fr_auto_auto]">
          <span className="hidden text-[10px] font-semibold uppercase tracking-widest text-slate-400 sm:block w-8" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Page</span>
          <span className="hidden text-[10px] font-semibold uppercase tracking-widest text-slate-400 sm:block">Status</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Actions</span>
        </div>

        {PAGES.map((page) => (
          <div
            key={page.key}
            className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-50 px-5 py-4 last:border-b-0 sm:grid-cols-[auto_1fr_auto_auto]"
          >
            {/* Icon */}
            <div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 sm:flex">
              {page.icon}
            </div>

            {/* Title + description */}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{page.title}</p>
              <p className="mt-0.5 text-xs text-slate-400">{page.description}</p>
            </div>

            {/* Status */}
            <div className="hidden sm:block">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {page.status}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link
                href={page.editHref}
                className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
              >
                Edit
              </Link>
              <Link
                href={page.previewHref}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Preview
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Coming soon hint */}
      <p className="mt-4 text-center text-xs text-slate-400">More pages — About, Contact, FAQ — coming soon.</p>
    </div>
  )
}
