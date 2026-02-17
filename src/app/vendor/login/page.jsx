import AuthShell from '@/components/auth/AuthShell'
import LoginForm from '@/components/auth/LoginForm'
import { Suspense } from 'react'

export default function VendorLoginPage() {
  return (
    <AuthShell
      eyebrow='Seller Access'
      title='Seller sign in'
      subtitle='Sign in to manage your catalog, pricing, and inventory.'
    >
      <Suspense fallback={null}>
        <LoginForm successRedirect='/backend/admin/dashboard' />
      </Suspense>
    </AuthShell>
  )
}
