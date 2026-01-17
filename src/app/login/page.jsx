import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className='min-h-screen bg-slate-50 text-slate-900'>
      <div className='mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-8 px-4 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10'>
        <section className='flex flex-col justify-between rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm sm:p-10'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
              OcPrimes Admin
            </p>
            <h1 className='mt-3 text-3xl font-semibold text-slate-900'>Welcome back</h1>
            <p className='mt-2 text-sm text-slate-600'>
              Sign in to manage products, orders, and customer data in one place.
            </p>
          </div>

          <form className='mt-8 grid gap-4'>
            <label className='space-y-2 text-sm font-semibold text-slate-700'>
              Email address
              <input
                type='email'
                placeholder='you@ocprimes.com'
                autoComplete='email'
                className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none'
              />
            </label>

            <label className='space-y-2 text-sm font-semibold text-slate-700'>
              Password
              <input
                type='password'
                placeholder='Enter your password'
                autoComplete='current-password'
                className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none'
              />
            </label>

            <div className='flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600'>
              <label className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  className='h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300'
                />
                Remember me
              </label>
              <Link href='/' className='font-semibold text-slate-700 hover:text-slate-900'>
                Forgot password?
              </Link>
            </div>

            <button
              type='button'
              className='mt-2 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800'
            >
              Sign in
            </button>

            <div className='flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500'>
              <span>New to OcPrimes?</span>
              <Link href='/' className='font-semibold text-slate-700 hover:text-slate-900'>
                Request access
              </Link>
            </div>
          </form>
        </section>

        <aside className='flex flex-col justify-between rounded-3xl border border-slate-200 bg-slate-900 p-8 text-slate-100 sm:p-10'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
              Operations Suite
            </p>
            <h2 className='mt-3 text-2xl font-semibold text-white'>
              Everything you need to run the store.
            </h2>
            <p className='mt-3 text-sm text-slate-300'>
              Use your admin workspace to keep inventory aligned, track orders in real time, and
              keep customer relationships organized.
            </p>
          </div>

          <div className='mt-8 grid gap-4 text-sm text-slate-200'>
            <div className='rounded-2xl border border-white/10 bg-white/5 px-4 py-3'>
              Live order monitoring with status highlights.
            </div>
            <div className='rounded-2xl border border-white/10 bg-white/5 px-4 py-3'>
              Product catalogs synced across channels.
            </div>
            <div className='rounded-2xl border border-white/10 bg-white/5 px-4 py-3'>
              Customer profiles with lifetime insights.
            </div>
          </div>

          <div className='mt-8 flex flex-wrap items-center gap-3 text-xs text-slate-400'>
            <span className='rounded-full border border-white/10 bg-white/5 px-3 py-1'>
              Secure access
            </span>
            <span className='rounded-full border border-white/10 bg-white/5 px-3 py-1'>
              Multi-store ready
            </span>
            <span className='rounded-full border border-white/10 bg-white/5 px-3 py-1'>
              Analytics built-in
            </span>
          </div>
        </aside>
      </div>
    </div>
  )
}
