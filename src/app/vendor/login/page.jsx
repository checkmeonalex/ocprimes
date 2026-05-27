import SellerLoginPage from '@/components/auth/seller/SellerLoginPage'
import { Suspense } from 'react'

export default function VendorLoginPage() {
  return (
    <Suspense fallback={null}>
      <SellerLoginPage />
    </Suspense>
  )
}
