import AdminShell from '../_components/AdminShell'

export default function AdminSettingsPage() {
  return (
    <AdminShell>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Settings</p>
          <h1 className='mt-2 text-2xl font-semibold text-slate-900'>Store configuration</h1>
          <p className='mt-2 text-sm text-slate-500'>Manage brand details, profiles, and security.</p>
        </div>
        <button className='rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold text-white'>
          Save updates
        </button>
      </div>

      <div className='mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]'>
        <div className='space-y-4'>
          <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <h2 className='text-sm font-semibold text-slate-900'>Profile</h2>
            <div className='mt-4 grid gap-4 sm:grid-cols-2'>
              <label className='text-xs font-semibold text-slate-500'>
                First name
                <input
                  placeholder='Alex'
                  className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
                />
              </label>
              <label className='text-xs font-semibold text-slate-500'>
                Last name
                <input
                  placeholder='Prime'
                  className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
                />
              </label>
              <label className='text-xs font-semibold text-slate-500'>
                Email
                <input
                  placeholder='admin@ocprimes.com'
                  className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
                />
              </label>
              <label className='text-xs font-semibold text-slate-500'>
                Role
                <input
                  placeholder='Operations lead'
                  className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
                />
              </label>
            </div>
          </section>

          <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <h2 className='text-sm font-semibold text-slate-900'>Store info</h2>
            <div className='mt-4 grid gap-4 sm:grid-cols-2'>
              <label className='text-xs font-semibold text-slate-500'>
                Store name
                <input
                  placeholder='OcPrimes HQ'
                  className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
                />
              </label>
              <label className='text-xs font-semibold text-slate-500'>
                Website
                <input
                  placeholder='https://ocprimes.com'
                  className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
                />
              </label>
              <label className='text-xs font-semibold text-slate-500'>
                Timezone
                <input
                  placeholder='GMT +1'
                  className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
                />
              </label>
              <label className='text-xs font-semibold text-slate-500'>
                Currency
                <input
                  placeholder='USD'
                  className='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
                />
              </label>
            </div>
          </section>
        </div>

        <div className='space-y-4'>
          <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <h2 className='text-sm font-semibold text-slate-900'>Security</h2>
            <p className='mt-2 text-xs text-slate-500'>Reset your password and manage access.</p>
            <div className='mt-4 grid gap-3'>
              <input
                type='password'
                placeholder='New password'
                className='w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
              />
              <input
                type='password'
                placeholder='Confirm password'
                className='w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'
              />
              <button className='rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white'>
                Update password
              </button>
            </div>
          </section>

          <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <h2 className='text-sm font-semibold text-slate-900'>Connected apps</h2>
            <div className='mt-4 space-y-3 text-sm text-slate-600'>
              <div className='flex items-center justify-between rounded-2xl border border-slate-200/60 px-4 py-3'>
                <div>
                  <p className='text-sm font-semibold text-slate-900'>OcPrimes Connector</p>
                  <p className='text-xs text-slate-500'>Active</p>
                </div>
                <button className='rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600'>
                  Manage
                </button>
              </div>
              <div className='flex items-center justify-between rounded-2xl border border-slate-200/60 px-4 py-3'>
                <div>
                  <p className='text-sm font-semibold text-slate-900'>Shipping partner</p>
                  <p className='text-xs text-slate-500'>Disconnected</p>
                </div>
                <button className='rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600'>
                  Connect
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  )
}
