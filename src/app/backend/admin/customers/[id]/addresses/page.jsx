import AdminShell from '../../../_components/AdminShell'
import CustomerTabs from '../../../_components/CustomerTabs'

export default function CustomerAddressesPage({ params }) {
  const customerId = params.id

  return (
    <AdminShell>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Customer</p>
          <h1 className='mt-2 text-2xl font-semibold text-slate-900'>Addresses</h1>
          <p className='mt-2 text-sm text-slate-500'>Billing and shipping locations.</p>
        </div>
        <CustomerTabs customerId={customerId} />
      </div>

      <div className='mt-6 grid gap-4 lg:grid-cols-2'>
        {['Billing address', 'Shipping address'].map((title) => (
          <div key={title} className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <h2 className='text-sm font-semibold text-slate-900'>{title}</h2>
            <div className='mt-4 grid gap-4 sm:grid-cols-2'>
              <label className='text-xs font-semibold text-slate-500'>
                First name
                <input
                  placeholder='OcPrimes'
                  className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
                />
              </label>
              <label className='text-xs font-semibold text-slate-500'>
                Last name
                <input
                  placeholder='Customer'
                  className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
                />
              </label>
              <label className='text-xs font-semibold text-slate-500 sm:col-span-2'>
                Address
                <input
                  placeholder='123 Market Street'
                  className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
                />
              </label>
              <label className='text-xs font-semibold text-slate-500'>
                City
                <input
                  placeholder='New York'
                  className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
                />
              </label>
              <label className='text-xs font-semibold text-slate-500'>
                Postal code
                <input
                  placeholder='10001'
                  className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
                />
              </label>
              <label className='text-xs font-semibold text-slate-500'>
                Country
                <input
                  placeholder='United States'
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
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  )
}
