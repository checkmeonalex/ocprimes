import AdminShell from '../../../_components/AdminShell'
import CustomerTabs from '../../../_components/CustomerTabs'

export default function CustomerSecurityPage({ params }) {
  const customerId = params.id

  return (
    <AdminShell>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Customer</p>
          <h1 className='mt-2 text-2xl font-semibold text-slate-900'>Security</h1>
          <p className='mt-2 text-sm text-slate-500'>Password resets and access logs.</p>
        </div>
        <CustomerTabs customerId={customerId} />
      </div>

      <div className='mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]'>
        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <h2 className='text-sm font-semibold text-slate-900'>Reset password</h2>
          <p className='mt-2 text-xs text-slate-500'>Send a secure reset link to the customer.</p>
          <div className='mt-4 grid gap-3'>
            <input
              type='email'
              placeholder='customer@ocprimes.com'
              className='w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
            />
            <button className='rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white'>
              Send reset link
            </button>
          </div>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <h2 className='text-sm font-semibold text-slate-900'>Recent logins</h2>
          <div className='mt-4 space-y-3 text-sm text-slate-600'>
            <div className='rounded-2xl border border-slate-200/60 px-4 py-3'>
              Aug 18, 2024 • Chrome • New York
            </div>
            <div className='rounded-2xl border border-slate-200/60 px-4 py-3'>
              Aug 12, 2024 • Safari • Lagos
            </div>
            <div className='rounded-2xl border border-slate-200/60 px-4 py-3'>
              Jul 29, 2024 • Mobile • London
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
