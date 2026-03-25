export const metadata = {
  title: 'Offline',
  robots: {
    index: false,
    follow: false,
  },
}

export default function OfflinePage() {
  return (
    <main className='min-h-screen bg-[#f8f1e7] px-6 py-16 text-[#2f2019]'>
      <div className='mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center rounded-[28px] border border-[#e7d6c1] bg-white px-8 py-12 text-center shadow-[0_24px_80px_rgba(47,32,25,0.08)]'>
        <div className='mb-4 text-[12px] font-semibold uppercase tracking-[0.45em] text-[#9b6f47]'>
          Alxora Offline
        </div>
        <h1 className='text-3xl font-semibold leading-tight text-[#2f2019]'>
          You are offline right now
        </h1>
        <p className='mt-4 max-w-md text-sm leading-7 text-[#6f5643]'>
          The app is installed and ready, but this page needs an internet connection to load fresh
          products and account data.
        </p>
        <a
          href='/'
          className='mt-8 inline-flex items-center rounded-full border border-[#2f2019] px-6 py-3 text-sm font-medium text-[#2f2019] transition hover:bg-[#2f2019] hover:text-white'
        >
          Try the homepage again
        </a>
      </div>
    </main>
  )
}
