import AuthShell from '@/components/auth/AuthShell'
import LoginForm from '@/components/auth/LoginForm'
import { Suspense } from 'react'

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow='OcPrimes Admin'
      title='Welcome back'
      subtitle='Sign in to manage products, orders, and customer data in one place.'
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  )
}
