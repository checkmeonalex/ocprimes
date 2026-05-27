import BrandLogo from '@/components/common/BrandLogo'

export default function CustomerAuthHeader({ title, subtitle }) {
  return (
    <>
      <div className='flex justify-center'>
        <BrandLogo
          href='/'
          variant='full'
          className='inline-flex items-center justify-center gap-3 text-slate-950'
        />
      </div>

      <div className='mt-6 text-center'>
        <h1 className='text-[2rem] font-semibold tracking-tight text-slate-950'>{title}</h1>
        <div className='mt-1 flex items-center justify-center gap-1.5 text-sm font-medium text-emerald-700'>
          <svg aria-hidden='true' viewBox='0 0 20 20' fill='none' className='h-4 w-4'>
            <circle cx='10' cy='10' r='8' stroke='currentColor' strokeWidth='1.8' />
            <path
              d='M6.5 10.2 8.8 12.5 13.5 7.8'
              stroke='currentColor'
              strokeWidth='1.8'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
          <span>Secure sign-in</span>
        </div>
        <p className='mt-3 text-base leading-7 text-slate-700'>{subtitle}</p>
      </div>
    </>
  )
}
