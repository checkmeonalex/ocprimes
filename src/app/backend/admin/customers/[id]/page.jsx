import CustomerTabs from '../../_components/CustomerTabs'
import AdminShell from '../../_components/AdminShell'

export default function CustomerOverviewPage({ params }) {
  const customerId = params.id

  return (
    <AdminShell>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Customer</p>
          <h1 className='mt-2 text-2xl font-semibold text-slate-900'>Customer profile</h1>
          <p className='mt-2 text-sm text-slate-500'>Review activity and engagement.</p>
        </div>
        <CustomerTabs customerId={customerId} />
      </div>

      <div className='mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]'>
        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='flex items-center gap-4'>
            <span className='flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600'>
              OP
            </span>
            <div>
              <p className='text-sm font-semibold text-slate-900'>OcPrimes Customer</p>
              <p className='text-xs text-slate-400'>ID: {customerId}</p>
            </div>
          </div>
          <div className='mt-6 grid gap-4 sm:grid-cols-2'>
            <div>
              <p className='text-xs font-semibold text-slate-500'>Email</p>
              <p className='mt-2 text-sm text-slate-700'>customer@ocprimes.com</p>
            </div>
            <div>
              <p className='text-xs font-semibold text-slate-500'>Phone</p>
              <p className='mt-2 text-sm text-slate-700'>+1 212 555 0199</p>
            </div>
            <div>
              <p className='text-xs font-semibold text-slate-500'>Lifetime spend</p>
              <p className='mt-2 text-sm text-slate-700'>$1,240</p>
            </div>
            <div>
              <p className='text-xs font-semibold text-slate-500'>Last order</p>
              <p className='mt-2 text-sm text-slate-700'>Aug 12, 2024</p>
            </div>
          </div>
        </div>

        <div className='space-y-4'>
          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-xs font-semibold text-slate-500'>Recent orders</p>
            <div className='mt-4 space-y-3 text-sm text-slate-600'>
              <div className='rounded-2xl border border-slate-200/60 px-4 py-3'>Order OP-201 • $240 • Packed</div>
              <div className='rounded-2xl border border-slate-200/60 px-4 py-3'>Order OP-199 • $189 • Shipped</div>
              <div className='rounded-2xl border border-slate-200/60 px-4 py-3'>Order OP-190 • $89 • Delivered</div>
            </div>
          </div>
          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-xs font-semibold text-slate-500'>Tags</p>
            <div className='mt-4 flex flex-wrap gap-2'>
              {['VIP', 'Sneaker lover', 'Newsletter'].map((tag) => (
                <span
                  key={tag}
                  className='rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600'
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
