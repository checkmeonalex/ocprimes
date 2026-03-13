import BrandLogo from '@/components/common/BrandLogo'
import AuthBackButton from '@/components/auth/AuthBackButton'

export default function SellerSignupShell({ children }) {
  return (
    <div className='relative min-h-screen bg-white px-4 py-8 text-slate-900'>
      <AuthBackButton
        fallbackHref='/'
        className='absolute left-4 top-6 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-800 sm:left-6'
      />

      <div className='mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center'>
        <section className='w-full max-w-[27rem]'>
          <div className='flex justify-center'>
            <BrandLogo
              href='/'
              variant='full'
              className='inline-flex items-center justify-center text-slate-950'
            />
          </div>
          {children}
        </section>
      </div>
    </div>
  )
}
