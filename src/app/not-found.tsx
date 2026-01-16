import Link from 'next/link'

export default function NotFound() {
  return (
    <main className='min-h-screen bg-[#f7f7f5] flex items-center justify-center px-6'>
      <div className='text-center max-w-md space-y-4'>
        <div className='text-sm uppercase tracking-[0.3em] text-gray-400'>
          404
        </div>
        <h1 className='text-3xl font-semibold text-gray-900 font-serif'>
          Page not found
        </h1>
        <p className='text-sm text-gray-600 leading-relaxed'>
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href='/'
          className='inline-flex items-center justify-center rounded-full border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-white transition'
        >
          Back to home
        </Link>
      </div>
    </main>
  )
}
