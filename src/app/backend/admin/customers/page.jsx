import Link from 'next/link'
import AdminShell from '../_components/AdminShell'
import { customers } from '../_lib/mockData.ts'

export default function AdminCustomersPage() {
  return (
    <AdminShell>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Customers</p>
          <h1 className='mt-2 text-2xl font-semibold text-slate-900'>Customer profiles</h1>
          <p className='mt-2 text-sm text-slate-500'>Track loyalty, spend, and outreach.</p>
        </div>
        <button className='rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold text-white'>
          Add customer
        </button>
      </div>

      <div className='mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex w-full max-w-xs items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500'>
            <svg viewBox='0 0 24 24' className='h-4 w-4 text-slate-400' fill='none' stroke='currentColor' strokeWidth='2'>
              <circle cx='11' cy='11' r='6' />
              <path d='m15.5 15.5 4 4' />
            </svg>
            <input
              className='w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none'
              placeholder='Search customers'
            />
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <button className='rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600'>
              Segment
            </button>
            <button className='rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600'>
              Export
            </button>
          </div>
        </div>

        <div className='mt-4 space-y-3'>
          {customers.map((customer) => (
            <Link
              key={customer.id}
              href={`/backend/admin/customers/${customer.id}`}
              className='flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/60 px-4 py-3 transition hover:border-slate-300'
            >
              <div className='flex items-center gap-3'>
                <span className='flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600'>
                  {customer.name
                    .split(' ')
                    .map((part) => part.charAt(0))
                    .join('')}
                </span>
                <div>
                  <p className='text-sm font-semibold text-slate-900'>{customer.name}</p>
                  <p className='text-xs text-slate-400'>{customer.email}</p>
                </div>
              </div>
              <div className='text-xs text-slate-500'>Lifetime spend: {customer.total}</div>
              <span className='rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600'>
                {customer.tier}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </AdminShell>
  )
}
