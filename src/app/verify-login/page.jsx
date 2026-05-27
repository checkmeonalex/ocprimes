import CustomerAuthShell from '@/components/auth/customer/CustomerAuthShell'
import CustomerTwoStepVerificationPage from '@/components/auth/customer/CustomerTwoStepVerificationPage'

export default function VerifyLoginPage() {
  return (
    <CustomerAuthShell>
      <CustomerTwoStepVerificationPage />
    </CustomerAuthShell>
  )
}
