import AuthShell from '@/components/auth/AuthShell'
import SignupForm from '@/components/auth/SignupForm'

export default function AdminSignupPage() {
  return (
    <AuthShell
      eyebrow='Admin Request'
      title='Request admin access'
      subtitle='Create your account and submit a request for admin approval.'
    >
      <SignupForm
        endpoint='/api/auth/admin-signup'
        successMessage='Request submitted. Check your inbox to confirm your email, then wait for approval.'
        signInHref='/admin/login'
        signInLabel='Admin sign in'
        signInText='Already have admin access?'
      />
    </AuthShell>
  )
}
