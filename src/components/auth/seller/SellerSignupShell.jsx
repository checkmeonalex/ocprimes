import Link from 'next/link'
import BrandLogo from '@/components/common/BrandLogo'

export default function SellerSignupShell({ children }) {
  return (
    <div className='relative min-h-screen bg-white px-4 py-8 text-slate-900'>
      <Link
        href='/'
        className='absolute left-4 top-6 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-800 sm:left-6'
      >
        <svg aria-hidden='true' viewBox='0 0 20 20' fill='none' className='h-4 w-4'>
          <path
            d='M11.5 4.5 6 10l5.5 5.5'
            stroke='currentColor'
            strokeWidth='1.8'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
        <span>Return</span>
      </Link>

      <div className='mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center'>
        <section className='w-full max-w-[27rem]'>
          <div className='flex justify-center'>
            <BrandLogo
              href='/'
              variant='mark'
              className='inline-flex items-center justify-center text-slate-950'
              markClassName='h-10 w-10 shrink-0 text-[#f5d10b]'
            />
          </div>
          {children}
        </section>
      </div>
    </div>
  )
}
