import LoginForm from '@/components/auth/LoginForm'
import SellerSignupShell from './SellerSignupShell'

export default function SellerLoginPage() {
  return (
    <SellerSignupShell>
      <div className="space-y-7">
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-600">
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.8" />
              <path d="M6.5 10.2 8.8 12.5 13.5 7.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Secure seller access</span>
          </div>
          <h1 className="text-[1.85rem] font-semibold tracking-tight text-slate-950 leading-tight">
            Welcome back
          </h1>
          <p className="text-[15px] leading-relaxed text-slate-500">
            Sign in to your seller account and continue to your dashboard.
          </p>
        </div>

        <LoginForm
          successRedirect="/backend/admin/dashboard"
          variant="seller-clean"
          signUpHref="/sellersignup"
        />
      </div>
    </SellerSignupShell>
  )
}
