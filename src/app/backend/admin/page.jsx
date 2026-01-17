import Link from 'next/link'

export default function AdminLandingPage() {
  return (
    <div className='min-h-screen bg-slate-50 text-slate-900'>
      <div className='mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6'>
        <header className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
              OcPrimes Backend
            </p>
            <h1 className='mt-2 text-2xl font-semibold text-slate-900'>Connect your store</h1>
            <p className='mt-2 text-sm text-slate-600'>
              Bring products, orders, and customers into your admin workspace.
            </p>
          </div>
          <Link
            href='/'
            className='rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300'
          >
            Back to storefront
          </Link>
        </header>

        <section className='rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm sm:p-8'>
          <div className='flex items-center gap-3'>
            <span className='flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-lg font-semibold text-blue-600'>
              O
            </span>
            <div>
              <h2 className='text-lg font-semibold text-slate-900'>OcPrimes connector</h2>
              <p className='text-sm text-slate-500'>Add your store URL and API key.</p>
            </div>
          </div>

          <div className='mt-6 grid gap-4'>
            <label className='space-y-2 text-sm font-semibold text-slate-700'>
              Store URL
              <input
                placeholder='e.g. https://store.ocprimes.com'
                className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none'
              />
            </label>

            <label className='space-y-2 text-sm font-semibold text-slate-700'>
              API key
              <input
                placeholder='Paste your connector API key'
                className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none'
              />
            </label>

            <div className='flex flex-wrap items-center gap-3'>
              <button className='rounded-full bg-slate-900 px-6 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800'>
                Connect store
              </button>
              <button className='rounded-full border border-slate-200 bg-white px-6 py-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300'>
                Check status
              </button>
            </div>
          </div>
        </section>

        <section className='grid gap-4 md:grid-cols-3'>
          {[
            {
              title: 'Sync inventory',
              text: 'Keep product data aligned across every sales channel.',
            },
            {
              title: 'Manage orders',
              text: 'Track orders from payment to fulfillment in one view.',
            },
            {
              title: 'Know customers',
              text: 'See spending history, notes, and engagement in one place.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className='rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm'
            >
              <p className='text-sm font-semibold text-slate-900'>{item.title}</p>
              <p className='mt-2 text-sm text-slate-500'>{item.text}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
