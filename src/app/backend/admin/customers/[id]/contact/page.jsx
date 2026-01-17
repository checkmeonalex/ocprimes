import AdminShell from '../../../_components/AdminShell'
import CustomerTabs from '../../../_components/CustomerTabs'

export default function CustomerContactPage({ params }) {
  const customerId = params.id

  return (
    <AdminShell>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Customer</p>
          <h1 className='mt-2 text-2xl font-semibold text-slate-900'>Contact preferences</h1>
          <p className='mt-2 text-sm text-slate-500'>Set communication details and tags.</p>
        </div>
        <CustomerTabs customerId={customerId} />
      </div>

      <div className='mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]'>
        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <h2 className='text-sm font-semibold text-slate-900'>Primary contact</h2>
          <div className='mt-4 grid gap-4 sm:grid-cols-2'>
            <label className='text-xs font-semibold text-slate-500'>
              Email
              <input
                placeholder='customer@ocprimes.com'
                className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
              />
            </label>
            <label className='text-xs font-semibold text-slate-500'>
              Phone
              <input
                placeholder='+1 212 555 0199'
                className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
              />
            </label>
            <label className='text-xs font-semibold text-slate-500'>
              Preferred channel
              <select className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'>
                <option>Email</option>
                <option>SMS</option>
                <option>WhatsApp</option>
              </select>
            </label>
            <label className='text-xs font-semibold text-slate-500'>
              Opt-in status
              <select className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'>
                <option>Subscribed</option>
                <option>Unsubscribed</option>
              </select>
            </label>
          </div>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <h2 className='text-sm font-semibold text-slate-900'>Tags</h2>
          <div className='mt-4 flex flex-wrap gap-2'>
            {['Newsletter', 'VIP', 'Sneaker lover', 'Wholesale'].map((tag) => (
              <span
                key={tag}
                className='rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600'
              >
                {tag}
              </span>
            ))}
          </div>
          <button className='mt-4 w-full rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600'>
            Manage tags
          </button>
        </div>
      </div>
    </AdminShell>
  )
}
