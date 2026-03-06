import Link from 'next/link'

const exits = [
  {
    href: '/',
    label: 'Back home',
    copy: 'Return to the storefront landing page.',
  },
  {
    href: '/products',
    label: 'Shop all',
    copy: 'Browse the full catalog from a clean starting point.',
  },
  {
    href: '/wishlist',
    label: 'Open wishlist',
    copy: 'Pick up from items you already saved.',
  },
]

export default function NotFound() {
  return (
    <main className='min-h-[calc(100vh-7rem)] bg-[linear-gradient(180deg,#ffffff_0%,#f4f4f4_100%)] px-4 py-6 sm:px-6 sm:py-10 lg:px-8'>
      <section className='mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]'>
        <div className='relative overflow-hidden border border-slate-200 bg-white px-6 py-8 text-slate-900 shadow-[0_30px_80px_rgba(0,0,0,0.08)] sm:px-8 sm:py-10 lg:px-10 lg:py-12'>
          <div className='absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,0,0,0.04),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(0,0,0,0.03),transparent_32%)]' />
          <div className='relative'>
            <div className='flex items-end gap-3 sm:gap-4'>
              <span className='text-[4.5rem] font-semibold leading-none tracking-[-0.08em] sm:text-[5.75rem] lg:text-[7.5rem]'>
                404
              </span>
              <span className='pb-3 text-xs uppercase tracking-[0.38em] text-slate-400 sm:text-sm'>
                Lost page
              </span>
            </div>

            <h1 className='mt-5 max-w-2xl text-3xl font-semibold leading-tight text-slate-900 [font-family:Georgia,serif] sm:text-4xl lg:text-5xl'>
              This page is gone, but the store is not.
            </h1>
            <p className='mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base'>
              The link you opened does not point to a live page anymore. Use search,
              jump back home, or reopen the full catalog and continue from there.
            </p>

            <form action='/products' method='get' className='mt-8 max-w-xl'>
              <label htmlFor='not-found-search' className='sr-only'>
                Search products
              </label>
              <div className='flex flex-col gap-3 sm:flex-row'>
                <input
                  id='not-found-search'
                  name='search'
                  type='text'
                  placeholder='Search products, brands, categories...'
                  className='h-12 min-h-12 w-full min-w-0 flex-1 appearance-none rounded-full border border-slate-300 bg-white px-5 py-0 text-sm leading-none text-slate-900 outline-none placeholder:text-slate-400 focus:border-black focus:ring-2 focus:ring-black/10'
                />
                <button
                  type='submit'
                  className='inline-flex h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white transition hover:bg-slate-800'
                >
                  Search store
                </button>
              </div>
            </form>

            <Link
              href='/'
              className='mt-6 inline-flex items-center gap-2 border-b border-[#b96b47] pb-1 text-sm font-medium text-[#b96b47] transition hover:text-[#9f5533] hover:border-[#9f5533]'
            >
              <span aria-hidden='true'>←</span>
              <span>Go back home</span>
            </Link>
          </div>
        </div>

        <div className='flex flex-col gap-4'>
          <div className='border border-black bg-white p-6 text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.06)]'>
            <p className='text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400'>
              Best recovery
            </p>
            <h2 className='mt-3 text-2xl font-semibold tracking-tight text-slate-900'>
              Restart from all products
            </h2>
            <p className='mt-3 text-sm leading-7 text-slate-600'>
              The full catalog is the safest reset when a category page, product link, or old bookmark breaks.
            </p>
            <Link
              href='/products'
              className='mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-900'
            >
              Open catalog
              <span aria-hidden='true'>→</span>
            </Link>
          </div>

          <div className='grid gap-3'>
            {exits.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className='group border border-black bg-white p-4 text-slate-900 transition hover:-translate-y-[1px] hover:bg-slate-50 hover:shadow-[0_16px_38px_rgba(0,0,0,0.06)]'
              >
                <div className='flex items-center justify-between gap-3'>
                  <span className='text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400'>
                    0{index + 1}
                  </span>
                  <span className='text-slate-300 transition group-hover:text-slate-500'>→</span>
                </div>
                <div className='mt-5 text-lg font-semibold text-slate-900'>{item.label}</div>
                <p className='mt-2 text-sm leading-6 text-slate-600'>{item.copy}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
