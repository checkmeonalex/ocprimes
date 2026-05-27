import AuthShell from '@/components/auth/AuthShell'
import VendorSignupForm from '@/components/auth/VendorSignupForm'

export default function VendorSignupPage() {
  return (
    <AuthShell
      eyebrow='Seller Access'
      title='Seller onboarding'
      subtitle='Complete each step to submit your seller request for review.'
    >
      <VendorSignupForm />
    </AuthShell>
  )
}
