import AuthShell from '@/components/auth/AuthShell'
import LoginForm from '@/components/auth/LoginForm'

export default function AdminLoginPage() {
  return (
    <AuthShell
      eyebrow='Admin Access'
      title='Admin sign in'
      subtitle='Use your approved admin credentials to access the OcPrimes console.'
    >
      <LoginForm endpoint='/api/auth/admin-login' adminOnly successRedirect='/backend/admin/dashboard' />
    </AuthShell>
  )
}
