import { BrandLogoFull } from '@/components/common/BrandLogo'
import AuthBackButton from '@/components/auth/AuthBackButton'

export default function SellerSignupShell({ children, onBack = null }) {
  return (
    <div className="relative min-h-screen bg-white">
      <AuthBackButton
        fallbackHref="/"
        onBack={onBack}
        className="absolute left-4 top-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 sm:left-6"
      />

      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-[23rem]">
          <div className="mb-10 flex flex-col items-center gap-2">
            <a href="/">
              <BrandLogoFull />
            </a>
            <span className="text-[9px] font-medium uppercase tracking-[0.38em] text-slate-400">
              Build your brand. Sell on Alxora.
            </span>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
