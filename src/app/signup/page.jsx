import AuthShell from '@/components/auth/AuthShell'
import SignupForm from '@/components/auth/SignupForm'

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow='OcPrimes Access'
      title='Create your account'
      subtitle='Set up credentials for the OcPrimes admin workspace.'
    >
      <SignupForm />
    </AuthShell>
  )
}
