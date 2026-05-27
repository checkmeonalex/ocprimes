import CustomerAuthShell from '@/components/auth/customer/CustomerAuthShell'
import CustomerResetPasswordPage from '@/components/auth/customer/CustomerResetPasswordPage'

export default function ResetPasswordPage() {
  return (
    <CustomerAuthShell>
      <CustomerResetPasswordPage />
    </CustomerAuthShell>
  )
}
