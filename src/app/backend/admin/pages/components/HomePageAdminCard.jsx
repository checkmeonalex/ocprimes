'use client'

import Link from 'next/link'

export default function HomePageAdminCard() {
  return (
    <section className='mx-auto w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
      <p className='text-xs font-semibold uppercase tracking-[0.4em] text-slate-400'>Pages</p>
      <h1 className='mt-3 text-2xl font-semibold text-slate-900'>Home</h1>
      <p className='mt-3 text-sm text-slate-500'>
        Edit the homepage as an independent page: hero slider, stories, featured strip config,
        browse cards, home product catalog, and section order.
      </p>

      <div className='mt-6 flex flex-wrap items-center gap-3'>
        <Link
          href='/backend/admin/pages/home'
          className='inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800'
        >
          Open Home Editor
        </Link>
        <Link
          href='/'
          className='inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300'
        >
          Preview Homepage
        </Link>
      </div>
    </section>
  )
}
