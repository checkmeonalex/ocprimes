'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'Overview', href: '/backend/admin' },
  { label: 'Dashboard', href: '/backend/admin/dashboard' },
  { label: 'Products', href: '/backend/admin/products' },
  { label: 'Library', href: '/backend/admin/library' },
  { label: 'Size Guides', href: '/backend/admin/size-guides' },
  { label: 'Customers', href: '/backend/admin/customers' },
  { label: 'Settings', href: '/backend/admin/settings' },
]

export default function AdminShell({ children }) {
  const pathname = usePathname()

  return (
    <div className='min-h-screen bg-slate-50 text-slate-900'>
      <div className='flex min-h-screen'>
        <aside className='hidden w-64 border-r border-slate-200/70 bg-white/80 px-5 py-6 lg:flex lg:flex-col'>
          <div className='flex items-center gap-3 px-2'>
            <span className='flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white'>
              O
            </span>
            <div>
              <p className='text-sm font-semibold text-slate-900'>OcPrimes</p>
              <p className='text-xs text-slate-500'>Admin workspace</p>
            </div>
          </div>

          <div className='mt-8 space-y-2'>
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isActive ? 'bg-white' : 'bg-slate-300'
                    }`}
                  />
                  {item.label}
                </Link>
              )
            })}
          </div>

          <div className='mt-auto space-y-4'>
            <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>Support</p>
            <div className='space-y-2 rounded-2xl border border-slate-200/70 bg-white p-3 text-xs text-slate-600'>
              <p className='font-semibold text-slate-700'>Need help?</p>
              <p>Reach the ops desk for priority setup and onboarding.</p>
              <button className='mt-2 w-full rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600'>
                Contact support
              </button>
            </div>
          </div>
        </aside>

        <main className='flex-1 px-4 py-6 sm:px-6 lg:px-10'>
          <div className='mx-auto w-full max-w-6xl'>{children}</div>
        </main>
      </div>
    </div>
  )
}
