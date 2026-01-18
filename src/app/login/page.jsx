import AuthShell from '@/components/auth/AuthShell'
import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow='OcPrimes Admin'
      title='Welcome back'
      subtitle='Sign in to manage products, orders, and customer data in one place.'
    >
      <LoginForm />
    </AuthShell>
  )
}
