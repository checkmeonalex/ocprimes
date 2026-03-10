import CustomerAuthPage from '@/components/auth/customer/CustomerAuthPage'
import { Suspense } from 'react'

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <CustomerAuthPage />
    </Suspense>
  )
}
