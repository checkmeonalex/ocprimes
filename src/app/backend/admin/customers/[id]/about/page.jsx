import AdminShell from '../../../_components/AdminShell'
import CustomerTabs from '../../../_components/CustomerTabs'

export default function CustomerAboutPage({ params }) {
  const customerId = params.id

  return (
    <AdminShell>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Customer</p>
          <h1 className='mt-2 text-2xl font-semibold text-slate-900'>About customer</h1>
          <p className='mt-2 text-sm text-slate-500'>Profile details and preferences.</p>
        </div>
        <CustomerTabs customerId={customerId} />
      </div>

      <div className='mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
        <div className='grid gap-4 sm:grid-cols-2'>
          <label className='text-xs font-semibold text-slate-500'>
            Full name
            <input
              placeholder='OcPrimes Customer'
              className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
            />
          </label>
          <label className='text-xs font-semibold text-slate-500'>
            Job title
            <input
              placeholder='Retail buyer'
              className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
            />
          </label>
          <label className='text-xs font-semibold text-slate-500'>
            Company
            <input
              placeholder='OcPrimes Collective'
              className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
            />
          </label>
          <label className='text-xs font-semibold text-slate-500'>
            Loyalty tier
            <input
              placeholder='VIP'
              className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
            />
          </label>
        </div>

        <label className='mt-4 block text-xs font-semibold text-slate-500'>
          Notes
          <textarea
            rows={5}
            placeholder='Add internal notes...'
            className='mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
          />
        </label>
      </div>
    </AdminShell>
  )
}
