import AuthShell from '@/components/auth/AuthShell'
import LoginForm from '@/components/auth/LoginForm'
import { Suspense } from 'react'

export default function AdminLoginPage() {
  return (
    <AuthShell
      eyebrow='Admin Access'
      title='Admin sign in'
      subtitle='Use your approved admin credentials to access the OcPrimes console.'
    >
      <Suspense fallback={null}>
        <LoginForm endpoint='/api/auth/admin-login' adminOnly successRedirect='/backend/admin/dashboard' />
      </Suspense>
    </AuthShell>
  )
}
