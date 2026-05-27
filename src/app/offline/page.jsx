export const metadata = {
  title: 'Offline',
  robots: {
    index: false,
    follow: false,
  },
}

export default function OfflinePage() {
  return (
    <main className='min-h-screen bg-[#f8f1e7] text-[#2f2019]'>
      <section className='flex min-h-screen w-full items-center px-6 py-16 sm:px-10 lg:px-16'>
        <div className='w-full max-w-3xl'>
          <div className='mb-5 text-[12px] font-semibold uppercase tracking-[0.45em] text-[#9b6f47]'>
            Alxora Offline
          </div>
          <h1 className='max-w-2xl text-4xl font-semibold leading-[1.05] sm:text-5xl'>
            You&apos;re offline right now.
          </h1>
          <p className='mt-6 max-w-2xl text-base leading-8 text-[#6f5643] sm:text-lg'>
            It looks like your internet connection dropped for a moment. Once you&apos;re back
            online, you can keep browsing products, visit your account, and continue where you
            left off on Alxora.
          </p>
          <div className='mt-10 flex flex-wrap items-center gap-4'>
            <a
              href='/'
              className='inline-flex items-center rounded-full bg-[#2f2019] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#4a3429]'
            >
              Back to homepage
            </a>
            <span className='text-sm text-[#7d6551]'>
              This offline page works for regular browsing too, even without installing the app.
            </span>
          </div>
        </div>
      </section>
    </main>
  )
}
