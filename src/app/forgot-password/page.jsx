import CustomerAuthShell from '@/components/auth/customer/CustomerAuthShell'
import CustomerForgotPasswordPage from '@/components/auth/customer/CustomerForgotPasswordPage'

export default function ForgotPasswordPage() {
  return (
    <CustomerAuthShell>
      <CustomerForgotPasswordPage />
    </CustomerAuthShell>
  )
}
