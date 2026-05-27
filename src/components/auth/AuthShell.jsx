import Link from 'next/link'

export default function AuthShell({ eyebrow, title, subtitle, children }) {
  return (
    <div className='min-h-screen bg-slate-50 text-slate-900'>
      <div className='mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-8 px-4 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10'>
        <section className='flex flex-col justify-between rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm sm:p-10'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
              {eyebrow}
            </p>
            <h1 className='mt-3 text-3xl font-semibold text-slate-900'>{title}</h1>
            <p className='mt-2 text-sm text-slate-600'>{subtitle}</p>
          </div>

          {children}
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

          <div className='mt-6 text-xs text-slate-400'>
            <Link href='/' className='font-semibold text-slate-200 hover:text-white'>
              Back to storefront
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
