import LoginForm from '@/components/auth/LoginForm'
import SellerSignupShell from './SellerSignupShell'

export default function SellerLoginPage() {
  return (
    <SellerSignupShell>
      <div className='mt-6 text-center'>
        <div className='flex items-center justify-center gap-1.5 text-sm font-medium text-emerald-700'>
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
          <span>Secure seller access</span>
        </div>
        <h1 className='mt-4 text-[2rem] font-semibold tracking-tight text-slate-950'>
          Seller sign in
        </h1>
        <p className='mt-3 text-base leading-7 text-slate-700'>
          Sign in with the account linked to your seller access and continue to your dashboard.
        </p>
      </div>

      <LoginForm
        successRedirect='/backend/admin/dashboard'
        variant='seller-clean'
        signUpHref='/sellersignup'
      />
    </SellerSignupShell>
  )
}
